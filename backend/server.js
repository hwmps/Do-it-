const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// mock 데이터베이스 (이후 공공데이터 API 연동)
const coursesDB = [
  {
    id: 1,
    title: '세종시 중장년 파이썬 코딩 입문',
    location: '세종특별자치시 한솔동 복합커뮤니티센터',
    period: '2026.09.01 ~ 2026.11.30',
    status: '접수중',
    target: '중장년',
    lat: 36.4800,
    lng: 127.2890
  },
  {
    id: 2,
    title: '청소년을 위한 웹개발 기초 (HTML/CSS)',
    location: '세종시 평생교육학습관',
    period: '2026.08.10 ~ 2026.09.15',
    status: '마감',
    target: '청소년',
    lat: 36.4850,
    lng: 127.2950
  },
  {
    id: 3,
    title: '성인 대상 AI 데이터 분석 기초',
    location: '세종시 아름동 복합커뮤니티센터',
    period: '2026.10.01 ~ 2026.12.15',
    status: '접수중',
    target: '성인',
    lat: 36.5120,
    lng: 127.2480
  },
  {
    id: 4,
    title: '중장년 디지털 소양 & 스마트폰 활용',
    location: '세종시 보람동 복합커뮤니티센터',
    period: '2026.09.15 ~ 2026.11.15',
    status: '접수중',
    target: '중장년',
    lat: 36.4795,
    lng: 127.2810
  }
];

// 검색 & 필터링 API 엔드포인트
app.get('/api/v1/locations/search', (req, res) => {
  const { query = '', status = '전체', target = '전체' } = req.query;

  const filtered = coursesDB.filter((item) => {
    const matchQuery = query === '' || item.title.includes(query) || item.location.includes(query);
    const matchStatus = status === '전체' || item.status === status;
    const matchTarget = target === '전체' || item.target === target;
    return matchQuery && matchStatus && matchTarget;
  });

  res.json({
    status: 'success',
    count: filtered.length,
    data: filtered
  });
});

app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 실행 중입니다: http://localhost:${PORT}`);
});