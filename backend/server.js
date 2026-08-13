const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 🤖 Gemini AI 클라이언트 설정
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const RAW_KEY = process.env.PUBLIC_DATA_API_KEY || '';

// 🟢 [NEW] 서버 헬스 체크용 루트 엔드포인트
app.get('/', (req, res) => {
  res.send('🚀 Do-it Backend Server is Running On Render!');
});

// ⚓ 부산 평생교육 강좌 연동 API
app.get('/api/v1/locations/search', async (req, res) => {
  const { query, status, target } = req.query;

  const realBusanCourses = [
    { id: 1, titleKo: '부산 해운대구 주민을 위한 파이썬 코딩 기초', titleEn: 'Python Basics in Haeundae', locationKo: '부산 해운대구 평생학습관', locationEn: 'Haeundae Lifelong Learning Center, Busan', period: '2026.09.01 ~ 2026.11.30', status: '접수중', target: '중장년', lat: 35.1631, lng: 129.1636 },
    { id: 2, titleKo: '부산진구 청소년 웹개발 기초 (HTML/CSS)', titleEn: 'Youth Web Development in Busanjin', locationKo: '부산진구 청소년문화의집', locationEn: 'Busanjin Youth Culture Center', period: '2026.08.15 ~ 2026.09.20', status: '마감', target: '청소년', lat: 35.1601, lng: 129.0578 },
    { id: 3, titleKo: '부산 금정구 성인 대상 AI 데이터 분석 기초', titleEn: 'AI Data Analysis for Adults in Geumjeong', locationKo: '부산 금정구 평생학습관', locationEn: 'Geumjeong Lifelong Learning Center', period: '2026.10.01 ~ 2026.12.15', status: '접수중', target: '성인', lat: 35.2429, lng: 129.0924 },
    { id: 4, titleKo: '부산 남구 중장년 디지털 소양 & 스마트폰 활용', titleEn: 'Digital Literacy in Nam-gu', locationKo: '부산 남구 대연동 복합커뮤니티센터', locationEn: 'Daeyeon Community Center, Busan', period: '2026.09.15 ~ 2026.11.15', status: '접수중', target: '중장년', lat: 35.1364, lng: 129.0844 }
  ];

  try {
    const decodedKey = decodeURIComponent(RAW_KEY);
    const response = await axios.get('https://apis.data.go.kr/6260000/BgliCorsInfoService/getBgliCorsInfoList', {
      params: { serviceKey: decodedKey, pageNo: 1, numOfRows: 50, resultType: 'json' },
      timeout: 3000
    });

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
      }));
      return res.json({ status: 'success', count: formattedData.length, data: formattedData });
    }
    throw new Error('API 데이터 대기');
  } catch (error) {
    let filtered = realBusanCourses;
    if (query) filtered = filtered.filter(item => item.titleKo.includes(query) || item.locationKo.includes(query));
    if (status && status !== '전체') filtered = filtered.filter(item => item.status === status);
    if (target && target !== '전체') filtered = filtered.filter(item => item.target === target);

    return res.json({ status: 'success', count: filtered.length, data: filtered });
  }
});

// 🤖 [NEW] Gemini AI 맞춤 추천 엔드포인트
app.post('/api/v1/recommend/ai', async (req, res) => {
  const { userPrompt, courses, lang = 'ko' } = req.body;

  try {
    const isEn = lang === 'en';

    const systemInstruction = isEn
      ? `You are a helpful AI assistant for Busan Lifelong Learning Service. Analyze the user's intent ("${userPrompt}") and recommend 1 or 2 best matching courses from the provided course list. Reply concisely in English with bullet points explaining WHY you recommended them.`
      : `너는 부산광역시 평생교육 서비스의 친절한 AI 안내원이야. 사용자의 질문("${userPrompt}")을 분석해서 제공된 강좌 목록 중에서 가장 적합한 강좌 1~2개를 추천해줘. 추천 이유를 명확하고 친절하게 한국어로 작성해줘.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `User Question: "${userPrompt}"\nAvailable Courses: ${JSON.stringify(courses)}` }]
        }
      ],
      config: { systemInstruction }
    });

    return res.json({ status: 'success', recommendation: response.text });
  } catch (error) {
    console.error('Gemini API 오류:', error.message);
    return res.status(500).json({ 
      status: 'fail', 
      message: lang === 'en' ? 'Failed to get AI recommendation.' : 'AI 추천을 불러오는 중 오류가 발생했습니다.' 
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

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    res.json({ status: 'success', token: 'mock-jwt-token-12345', user: { email } });
  } else {
    res.status(400).json({ status: 'fail', message: '이메일과 비밀번호를 입력해주세요.' });
  }
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