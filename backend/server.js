const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { requestObservability } = require('./middleware/requestObservability');
const { authenticateToken } = require('./middleware/authenticateToken');
const { createUserRateLimiter } = require('./middleware/userRateLimiter');
const { logger } = require('./observability/logger');
const { aiMetrics, publicDataMetrics, MetricUnit } = require('./observability/metrics');
const { withRetry, isRetryableError } = require('./utils/retry');
const { findNearbyCourses } = require('./utils/geo');
const {
  CircuitBreaker,
  CircuitOpenError
} = require('./utils/circuitBreaker');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand
} = require('@aws-sdk/lib-dynamodb');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestObservability);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 🤖 Gemini AI 클라이언트 설정
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const aiRateLimiter = createUserRateLimiter({
  limit: 5,
  windowMs: 60_000
});

app.locals.aiRateLimiter = aiRateLimiter;

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION
});

const dynamoDb = DynamoDBDocumentClient.from(dynamoClient);
const RAW_KEY = process.env.PUBLIC_DATA_API_KEY || '';

const publicDataCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
  shouldCountFailure: isRetryableError
});

function incrementPublicDataMetric(name) {
  publicDataMetrics.addMetric(
    name,
    MetricUnit.Count,
    1
  );

  publicDataMetrics.publishStoredMetrics();
}

app.locals.publicDataCircuitBreaker = publicDataCircuitBreaker;

// 🟢 [NEW] 서버 헬스 체크용 루트 엔드포인트
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'do-it-backend'
  });
});

app.get('/', (req, res) => {
  res.send('🚀 Do-it Backend Server is Running On Render!');
});

// ⚓ 부산 평생교육 강좌 연동 API
app.get('/api/v1/locations/search', async (req, res) => {
  const {
    query,
    status,
    target,
    lat,
    lng,
    radiusKm
  } = req.query;

  const hasLat = lat !== undefined;
  const hasLng = lng !== undefined;
  const hasRadius = radiusKm !== undefined;
  const nearbyRequested = hasLat || hasLng || hasRadius;

  const userLat = hasLat ? Number(lat) : null;
  const userLng = hasLng ? Number(lng) : null;
  const nearbyRadiusKm = hasRadius ? Number(radiusKm) : 5;

  const invalidNearbyQuery =
    nearbyRequested &&
    (
      !hasLat ||
      !hasLng ||
      !Number.isFinite(userLat) ||
      !Number.isFinite(userLng) ||
      userLat < -90 ||
      userLat > 90 ||
      userLng < -180 ||
      userLng > 180 ||
      !Number.isFinite(nearbyRadiusKm) ||
      nearbyRadiusKm <= 0 ||
      nearbyRadiusKm > 50
    );

  if (invalidNearbyQuery) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_GEO_QUERY',
      message:
        'lat and lng are required together; radiusKm must be between 0 and 50'
    });
  }

  const realBusanCourses = [
    { id: 1, titleKo: '부산 해운대구 주민을 위한 파이썬 코딩 기초', titleEn: 'Python Basics in Haeundae', locationKo: '부산 해운대구 평생학습관', locationEn: 'Haeundae Lifelong Learning Center, Busan', period: '2026.09.01 ~ 2026.11.30', status: '접수중', target: '중장년', lat: 35.1631, lng: 129.1636 },
    { id: 2, titleKo: '부산진구 청소년 웹개발 기초 (HTML/CSS)', titleEn: 'Youth Web Development in Busanjin', locationKo: '부산진구 청소년문화의집', locationEn: 'Busanjin Youth Culture Center', period: '2026.08.15 ~ 2026.09.20', status: '마감', target: '청소년', lat: 35.1601, lng: 129.0578 },
    { id: 3, titleKo: '부산 금정구 성인 대상 AI 데이터 분석 기초', titleEn: 'AI Data Analysis for Adults in Geumjeong', locationKo: '부산 금정구 평생학습관', locationEn: 'Geumjeong Lifelong Learning Center', period: '2026.10.01 ~ 2026.12.15', status: '접수중', target: '성인', lat: 35.2429, lng: 129.0924 },
    { id: 4, titleKo: '부산 남구 중장년 디지털 소양 & 스마트폰 활용', titleEn: 'Digital Literacy in Nam-gu', locationKo: '부산 남구 대연동 복합커뮤니티센터', locationEn: 'Daeyeon Community Center, Busan', period: '2026.09.15 ~ 2026.11.15', status: '접수중', target: '중장년', lat: 35.1364, lng: 129.0844 }
  ];

  try {
    const decodedKey = decodeURIComponent(RAW_KEY);

    const response = await publicDataCircuitBreaker.execute(
      () =>
        withRetry(
          () =>
            axios.get(
              'https://apis.data.go.kr/6260000/BgliCorsInfoService/getBgliCorsInfoList',
              {
                params: {
                  serviceKey: decodedKey,
                  pageNo: 1,
                  numOfRows: 50,
                  resultType: 'json'
                },
                timeout: 3000
              }
            ),
          {
            maxAttempts: 3,
            baseDelayMs: 100,
            maxDelayMs: 500,
            jitterRatio: 0.2,
            onRetry: ({
              attempt,
              nextAttempt,
              delayMs,
              status,
              code
            }) => {
              logger.warn('public-data.retry', {
                attempt,
                nextAttempt,
                delayMs,
                status,
                code
              });

              incrementPublicDataMetric(
                'PublicDataRetryCount'
              );
            }
          }
        )
    );

    let rawItems = response.data?.getBgliCorsInfoList?.body?.items?.item || 
                   response.data?.getBgliCorsInfoList?.item || 
                   response.data?.response?.body?.items?.item || [];

    if (!Array.isArray(rawItems) && rawItems) rawItems = [rawItems];

    if (rawItems.length > 0 && (rawItems[0].crsNm || rawItems[0].title)) {
      let formattedData = rawItems.map((item, index) => ({
        id: index + 1,
        titleKo: item.crsNm || item.title || '부산시 평생학습 교실',
        titleEn: item.crsNm || 'Busan Lifelong Learning Course',
        locationKo: item.operInstNm || item.place || '부산시 평생학습관',
        locationEn: item.operInstNm || 'Busan Learning Center',
        period: item.crsPeriod || '2026.09.01 ~ 2026.11.30',
        status: '접수중',
        target: item.trget || '성인',
        lat: parseFloat(item.lat) || (35.1795 + ((index % 6) * 0.01)),
        lng: parseFloat(item.lng) || (129.0756 + ((index % 6) * 0.01)),
        coordinatesEstimated: !(
          Number.isFinite(Number.parseFloat(item.lat)) &&
          Number.isFinite(Number.parseFloat(item.lng))
        ),
      }));

      if (nearbyRequested) {
        formattedData = findNearbyCourses(
          formattedData,
          {
            lat: userLat,
            lng: userLng,
            radiusKm: nearbyRadiusKm
          }
        ).map((course) => ({
          ...course,
          distanceKm: Number(course.distanceKm.toFixed(3))
        }));
      }

      return res.json({
        status: 'success',
        count: formattedData.length,
        data: formattedData
      });
    }
    throw new Error('API 데이터 대기');
  } catch (error) {
    const circuitOpen = error instanceof CircuitOpenError;
    const circuitState = publicDataCircuitBreaker.getState();

    const breakerOpenedByThisFailure =
      !circuitOpen &&
      circuitState === 'OPEN' &&
      isRetryableError(error);

    if (breakerOpenedByThisFailure) {
      incrementPublicDataMetric(
        'PublicDataCircuitBreakerOpenCount'
      );
    }

    incrementPublicDataMetric(
      'PublicDataFallbackCount'
    );

    logger.warn(
      circuitOpen
        ? 'public-data.circuit-open'
        : 'public-data.fallback',
      {
        status: error?.response?.status ?? null,
        code: error?.code ?? null,
        errorType: error?.name ?? 'Error',
        circuitState
      }
    );

    let filtered = realBusanCourses;
    if (query) filtered = filtered.filter(item => item.titleKo.includes(query) || item.locationKo.includes(query));
    if (status && status !== '전체') filtered = filtered.filter(item => item.status === status);
    if (target && target !== '전체') filtered = filtered.filter(item => item.target === target);

    if (nearbyRequested) {
      filtered = findNearbyCourses(
        filtered,
        {
          lat: userLat,
          lng: userLng,
          radiusKm: nearbyRadiusKm
        }
      ).map((course) => ({
        ...course,
        distanceKm: Number(course.distanceKm.toFixed(3))
      }));
    }

    return res.json({
      status: 'success',
      count: filtered.length,
      data: filtered
    });
  }
});

function publishAiRequestMetrics(durationMs, outcome) {
  aiMetrics.addMetric(
    'AIRequestCount',
    MetricUnit.Count,
    1
  );

  aiMetrics.addMetric(
    'AIRequestLatency',
    MetricUnit.Milliseconds,
    durationMs
  );

  aiMetrics.addMetric(
    'AIRequestSuccessCount',
    MetricUnit.Count,
    outcome === 'success' ? 1 : 0
  );

  aiMetrics.addMetric(
    'AIRequestTimeoutCount',
    MetricUnit.Count,
    outcome === 'timeout' ? 1 : 0
  );

  aiMetrics.addMetric(
    'AIRequestErrorCount',
    MetricUnit.Count,
    outcome === 'error' ? 1 : 0
  );

  aiMetrics.publishStoredMetrics();
}

// 🤖 Gemini AI 맞춤 추천 엔드포인트
app.post(
  '/api/v1/recommend/ai',
  authenticateToken,
  aiRateLimiter,
  async (req, res) => {
  const { userPrompt, courses, lang = 'ko' } = req.body;

  if (
    typeof userPrompt !== 'string' ||
    !userPrompt.trim() ||
    !Array.isArray(courses) ||
    courses.length === 0
  ) {
    return res.status(400).json({
      status: 'fail',
      message:
        lang === 'en'
          ? 'A question and at least one course are required.'
          : '질문과 강좌 정보가 필요합니다.'
    });
  }

  const isEn = lang === 'en';

  const systemInstruction = isEn
    ? `You are a helpful AI assistant for Busan Lifelong Learning Service. Analyze the user's intent ("${userPrompt}") and recommend 1 or 2 best matching courses from the provided course list. Reply concisely in English with bullet points explaining WHY you recommended them.`
    : `너는 부산광역시 평생교육 서비스의 친절한 AI 안내원이야. 사용자의 질문("${userPrompt}")을 분석해서 제공된 강좌 목록 중에서 가장 적합한 강좌 1~2개를 추천해줘. 추천 이유를 명확하고 친절하게 한국어로 작성해줘.`;

  const promptText =
    `User Question: "${userPrompt}"\n` +
    `Available Courses: ${JSON.stringify(courses)}`;

  const correlationId =
    req.observability?.correlationId || null;

  const payloadBytes = Buffer.byteLength(
    promptText,
    'utf8'
  );

  const startedAt = process.hrtime.bigint();

  logger.info('Gemini request started', {
    event: 'ai.request.started',
    correlationId,
    provider: 'gemini',
    model: 'gemini-3.6-flash',
    courseCount: courses.length,
    payloadBytes
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }]
        }
      ],
      config: {
        systemInstruction,
        httpOptions: {
          timeout: 20000
        }
      }
    });

    const durationMs =
      Number(process.hrtime.bigint() - startedAt) /
      1_000_000;

    logger.info('Gemini request completed', {
      event: 'ai.request.completed',
      correlationId,
      provider: 'gemini',
      model: 'gemini-3.6-flash',
      durationMs: Number(durationMs.toFixed(2)),
      outputChars: response.text?.length || 0
    });

    publishAiRequestMetrics(
      durationMs,
      'success'
    );

    return res.json({
      status: 'success',
      recommendation: response.text
    });
  } catch (error) {
    const durationMs =
      Number(process.hrtime.bigint() - startedAt) /
      1_000_000;

    const errorDescription =
      `${error?.name || ''} ${error?.message || ''}`;

    const isTimeout =
      /timeout|timed out|deadline/i.test(errorDescription);

    const logData = {
      event: 'ai.request.failed',
      correlationId,
      provider: 'gemini',
      model: 'gemini-3.6-flash',
      durationMs: Number(durationMs.toFixed(2)),
      timeout: isTimeout,
      errorName: error?.name || 'UnknownError',
      upstreamStatus: error?.status || error?.code || null
    };

    if (isTimeout) {
      logger.warn('Gemini request timed out', logData);
    } else {
      logger.error('Gemini request failed', logData);
    }

    publishAiRequestMetrics(
      durationMs,
      isTimeout ? 'timeout' : 'error'
    );

    return res.status(isTimeout ? 504 : 502).json({
      status: 'fail',
      message:
        lang === 'en'
          ? isTimeout
            ? 'The AI service is taking too long. Please try again.'
            : 'Failed to get AI recommendation.'
          : isTimeout
            ? 'AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
            : 'AI 추천을 불러오는 중 오류가 발생했습니다.'
    });
  }
});

// ⚡ Socket.io 실시간 통신
const roomUsers = {};
const roomMessages = {};

io.on('connection', (socket) => {
  // 방 입장
  socket.on('join_room', ({ courseId, username }) => {
    const roomName = `course_${courseId}`;
    socket.join(roomName);
    socket.currentRoom = roomName;
    socket.courseId = courseId;
    socket.username = username || 'Student';

    if (!roomUsers[courseId]) roomUsers[courseId] = 0;
    roomUsers[courseId]++;

    if (!roomMessages[courseId]) roomMessages[courseId] = [];

    // 기존 방 메시지 전송
    socket.emit('init_messages', roomMessages[courseId]);

    // 실시간 동접자 수 브로드캐스트
    io.to(roomName).emit('update_user_count', roomUsers[courseId]);
  });

  // 메시지 전송
  socket.on('send_message', ({ courseId, text, sender }) => {
    const roomName = `course_${courseId}`;
    const newMsg = {
      id: Date.now(),
      sender: sender || socket.username,
      text: text,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    if (!roomMessages[courseId]) roomMessages[courseId] = [];
    roomMessages[courseId].push(newMsg);

    io.to(roomName).emit('new_message', newMsg);
  });

  // 퇴장
  socket.on('disconnect', () => {
    const courseId = socket.courseId;
    if (courseId && roomUsers[courseId]) {
      roomUsers[courseId] = Math.max(0, roomUsers[courseId] - 1);
      io.to(`course_${socket.courseId}`).emit('update_user_count', roomUsers[courseId]);
    }
  });
});
// 🔐 Google 로그인 인증
app.post('/api/v1/auth/google', async (req, res) => {
  const { credential } = req.body;

  

  if (!credential) {
    return res.status(400).json({
      status: 'fail',
      message: 'Google credential이 필요합니다.'
    });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID가 설정되지 않았습니다.');

    return res.status(500).json({
      status: 'fail',
      message: 'Google 인증 설정이 완료되지 않았습니다.'
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        status: 'fail',
        message: '유효하지 않은 Google 토큰입니다.'
      });
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

   const token = jwt.sign(
  {
    email: user.email
  },
  process.env.JWT_SECRET,
  {
    subject: user.id,
    expiresIn: '1h',
    issuer: 'do-it-api'
  }
);

return res.json({
  status: 'success',
  token,
  user
});

  } catch (error) {
    console.error('Google 인증 실패:', error.message);

    return res.status(401).json({
      status: 'fail',
      message: 'Google 인증에 실패했습니다.'
    });
  }
});

// ❤️ 현재 사용자의 즐겨찾기 조회
app.get('/api/v1/favorites', authenticateToken, async (req, res) => {
  try {
    const result = await dynamoDb.send(
      new QueryCommand({
        TableName: process.env.AWS_DYNAMODB_TABLE_FAVORITES,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': req.user.sub
        },
        ProjectionExpression: 'courseId'
      })
    );

    const favorites = (result.Items || []).map(item => item.courseId);

    return res.json({
      status: 'success',
      favorites
    });
  } catch (error) {
    console.error('Favorites 조회 실패:', error);

    return res.status(500).json({
      status: 'fail',
      message: '즐겨찾기를 불러오지 못했습니다.'
    });
  }
});

// ❤️ 즐겨찾기 추가
app.post('/api/v1/favorites/:courseId', authenticateToken, async (req, res) => {
  const courseId = String(req.params.courseId || '').trim();

  if (!courseId) {
    return res.status(400).json({
      status: 'fail',
      message: 'courseId가 필요합니다.'
    });
  }

  try {
    await dynamoDb.send(
      new PutCommand({
        TableName: process.env.AWS_DYNAMODB_TABLE_FAVORITES,
        Item: {
          userId: req.user.sub,
          courseId,
          createdAt: new Date().toISOString()
        }
      })
    );

    return res.status(201).json({
      status: 'success',
      courseId
    });
  } catch (error) {
    console.error('Favorites 추가 실패:', error);

    return res.status(500).json({
      status: 'fail',
      message: '즐겨찾기를 저장하지 못했습니다.'
    });
  }
});

// 💔 즐겨찾기 삭제
app.delete('/api/v1/favorites/:courseId', authenticateToken, async (req, res) => {
  const courseId = String(req.params.courseId || '').trim();

  if (!courseId) {
    return res.status(400).json({
      status: 'fail',
      message: 'courseId가 필요합니다.'
    });
  }

  try {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: process.env.AWS_DYNAMODB_TABLE_FAVORITES,
        Key: {
          userId: req.user.sub,
          courseId
        }
      })
    );

    return res.json({
      status: 'success',
      courseId
    });
  } catch (error) {
    console.error('Favorites 삭제 실패:', error);

    return res.status(500).json({
      status: 'fail',
      message: '즐겨찾기를 삭제하지 못했습니다.'
    });
  }
});

// 👤 현재 로그인 사용자 확인
app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  return res.json({
    status: 'success',
    user: {
      id: req.user.sub,
      email: req.user.email
    }
  });
});

const PORT = process.env.PORT || 5000;

// 로컬에서 직접 실행할 때만 서버 시작
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 백엔드 서버 실행 완료: http://localhost:${PORT}`);
  });
}

// Lambda에서 사용할 Express app
module.exports = app;