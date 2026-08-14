import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import CourseChat from './components/CourseChat';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://k5235hpbt6.execute-api.ap-southeast-2.amazonaws.com'
    : 'http://localhost:5000');

// 🌐 i18n 번역 사전
const translations = {
  ko: {
    title: 'Find it. Learn it. Do-it.',
    subtitle: '가까운 배움을 찾고, 배우고, 시작하세요.',
    searchPlaceholder: '강좌명 또는 시설명을 검색하세요',
    findMyLocation: '내 위치 찾기',
    statusLabel: '상태:',
    targetLabel: '대상:',
    all: '전체',
    open: '접수중',
    closed: '마감',
    senior: '중장년',
    youth: '청소년',
    adult: '성인',
    resetFilter: '필터 초기화',
    resultsHeader: '주변 교육 시설 / 프로그램 결과',
    mapHeader: '지도 보기',
    loading: '데이터를 실시간으로 가져오는 중입니다...',
    noDataTitle: '조건에 맞는 강좌가 없습니다.',
    noDataSub: '검색어나 필터를 변경해 보세요.',
    viewAllBtn: '전체 강좌 보기',
    selected: '선택됨',
    myLocationTitle: '내 현재 위치',
    locErrorMsg: '위치 정보를 가져오는데 실패했습니다.',
    loginBtn: '로그인',
    logoutBtn: '로그아웃',
    favoritesOnly: '찜한 강좌만 보기',
    noFavoritesTitle: '아직 찜한 강좌가 없습니다.',
    noFavoritesSub: '마음에 드는 강좌의 모종삽 아이콘을 눌러보세요!',
  },
  en: {
    title: 'Find it. Learn it. Do-it.',
    subtitle: 'Discover nearby learning, grow your knowledge, and start today.',
    searchPlaceholder: 'Search by course title or facility name...',
    findMyLocation: 'Find My Location',
    statusLabel: 'Status:',
    targetLabel: 'Target:',
    all: 'All',
    open: 'Open',
    closed: 'Closed',
    senior: 'Seniors',
    youth: 'Youth',
    adult: 'Adults',
    resetFilter: 'Reset Filters',
    resultsHeader: 'Nearby Facilities / Programs',
    mapHeader: 'Map View',
    loading: 'Fetching data in real-time...',
    noDataTitle: 'No courses match your criteria.',
    noDataSub: 'Try changing your search terms or filters.',
    viewAllBtn: 'View All Courses',
    selected: 'Selected',
    myLocationTitle: 'Current Location',
    locErrorMsg: 'Failed to retrieve location info.',
    loginBtn: 'Login',
    logoutBtn: 'Logout',
    favoritesOnly: 'Saved Courses Only',
    noFavoritesTitle: 'No saved courses yet.',
    noFavoritesSub: 'Click the shovel icon on courses you like!',
  }
};

// 🔑 LoginPage 컴포넌트
function LoginPage({ lang }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', data.user.email);
        alert(lang === 'en' ? 'Login Successful!' : '로그인에 성공했습니다!');
        navigate('/');
      } else {
        setErrorMsg(data.message || (lang === 'en' ? 'Login failed.' : '로그인에 실패했습니다.'));
      }
    } catch (err) {
      setErrorMsg(lang === 'en' ? 'Server connection error.' : '백엔드 서버 연동 오류!');
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    localStorage.setItem('token', credentialResponse.credential);
    localStorage.setItem('userEmail', 'Google User');
    alert(lang === 'en' ? 'Google Login Successful!' : '구글 로그인에 성공했습니다!');
    navigate('/');
  };

  const handleGoogleError = () => {
    alert(lang === 'en' ? 'Google Login Failed' : '구글 로그인에 실패했습니다.');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fff7ed' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '24px', border: '1px solid #ffedd5', boxShadow: '0 8px 30px rgba(249,115,22,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <img src="/character.png" alt="character" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          <h2 style={{ color: '#9a3412', fontSize: '26px', fontWeight: 'bold', margin: 0 }}>
            Do-it {lang === 'en' ? 'Login' : '로그인'}
          </h2>
        </div>
        <p style={{ color: '#ea580c', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
          {lang === 'en' ? 'Welcome back! Please enter your details.' : '서비스 이용을 위해 로그인해 주세요.'}
        </p>

        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            shape="pill"
            locale={lang === 'en' ? 'en' : 'ko'}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#fed7aa' }}></div>
          <span style={{ padding: '0 10px', fontSize: '12px', color: '#ea580c' }}>
            {lang === 'en' ? 'or continue with email' : '또는 이메일로 로그인'}
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#fed7aa' }}></div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#7c2d12', marginBottom: '6px' }}>
              {lang === 'en' ? 'Email' : '이메일'}
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ width: '100%', padding: '12px', border: '1px solid #fed7aa', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#7c2d12', marginBottom: '6px' }}>
              {lang === 'en' ? 'Password' : '비밀번호'}
            </label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px', border: '1px solid #fed7aa', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
            {lang === 'en' ? 'Sign In' : '로그인'}
          </button>
        </form>

        <button 
          onClick={() => navigate('/')} 
          style={{ width: '100%', marginTop: '12px', padding: '10px', backgroundColor: 'transparent', color: '#c2410c', border: '1px solid #fdba74', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <img src="/character8.png" alt="back" style={{ width: '24px', height: '24px', transform: 'rotate(180deg)' }} />
          {lang === 'en' ? 'Back to Home' : '메인 화면으로 돌아가기'}
        </button>
      </div>
    </div>
  );
}

// 🏠 메인 플랫폼 컴포넌트
function MainPage({ lang, setLang }) {
  const t = translations[lang];
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedTarget, setSelectedTarget] = useState('전체');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef({});
  const myLocationMarkerRef = useRef(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) setUserEmail(savedEmail);

    const savedFavorites = localStorage.getItem('doit_favorites');
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch (e) {}
    }
  }, []);

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(favId => favId !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('doit_favorites', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUserEmail('');
    alert(lang === 'en' ? 'Logged out.' : '로그아웃 되었습니다.');
  };

  const fetchCoursesFromBackend = async () => {
    setIsLoading(true);

    const busanMockData = [
      { id: 1, titleKo: '부산 해운대구 주민을 위한 파이썬 코딩 기초', titleEn: 'Senior Smartphone Class in Haeundae', locationKo: '부산 해운대구 평생학습관', locationEn: 'Haeundae Learning Center', period: '2026.09.01 ~ 2026.11.30', status: '접수중', target: '중장년', lat: 35.1631, lng: 129.1636 },
      { id: 2, titleKo: '부산진구 청소년 웹개발 기초 (HTML/CSS)', titleEn: 'Youth Web Design Class in Busanjin', locationKo: '부산진구 청소년문화의집', locationEn: 'Busanjin Youth Center', period: '2026.08.15 ~ 2026.09.20', status: '마감', target: '청소년', lat: 35.1601, lng: 129.0578 },
      { id: 3, titleKo: '부산 금정구 성인 대상 AI 데이터 분석 기초', titleEn: 'Real Estate & Asset Management in Geumjeong', locationKo: '부산 금정구 평생학습관', locationEn: 'Geumjeong Learning Center', period: '2026.10.01 ~ 2026.12.15', status: '접수중', target: '성인', lat: 35.2429, lng: 129.0924 },
      { id: 4, titleKo: '부산 남구 중장년 디지털 소양 & 스마트폰 활용', titleEn: 'Senior Yoga & Posture in Nam-gu', locationKo: '부산 남구 대연동 복합커뮤니티센터', locationEn: 'Daeyeon Community Center', period: '2026.09.15 ~ 2026.11.15', status: '접수중', target: '중장년', lat: 35.1364, lng: 129.0844 }
    ];

    try {
      const queryParams = new URLSearchParams({ query: keyword, status: selectedStatus, target: selectedTarget });
      const response = await fetch(`${API_BASE_URL}/api/v1/locations/search?${queryParams}`);
      if (!response.ok) throw new Error('백엔드 연동 실패');
      const data = await response.json();

      if (data.status === 'success' && data.data && data.data.length > 0) {
        let mapped = data.data.map(item => ({
          ...item,
          titleKo: item.titleKo || item.title || '',
          titleEn: item.titleEn || item.titleKo || '',
          locationKo: item.locationKo || item.location || '',
          locationEn: item.locationEn || item.locationKo || '',
        }));

        if (showFavoritesOnly) {
          mapped = mapped.filter(item => favorites.includes(item.id));
        }
        setFilteredResults(mapped);
      } else {
        throw new Error('데이터 없음');
      }
    } catch (error) {
      const filtered = busanMockData.filter(item => {
        const title = lang === 'en' ? item.titleEn : item.titleKo;
        const location = lang === 'en' ? item.locationEn : item.locationKo;
        const matchKeyword = keyword === '' || title.toLowerCase().includes(keyword.toLowerCase()) || location.toLowerCase().includes(keyword.toLowerCase());
        const matchStatus = selectedStatus === '전체' || item.status === selectedStatus;
        const matchTarget = selectedTarget === '전체' || item.target === selectedTarget;
        const matchFavorite = !showFavoritesOnly || favorites.includes(item.id);

        return matchKeyword && matchStatus && matchTarget && matchFavorite;
      });
      setFilteredResults(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesFromBackend();
  }, [keyword, selectedStatus, selectedTarget, showFavoritesOnly, favorites]);

  // 🗺️ 지도 안전 렌더링 로직
  useEffect(() => {
    const drawMap = () => {
      const container = document.getElementById('map');
      if (!container) return;

      const options = { center: new window.kakao.maps.LatLng(35.1795, 129.0756), level: 7 };
      mapRef.current = new window.kakao.maps.Map(container, options);
      infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1 });

      const map = mapRef.current;
      setTimeout(() => map.relayout(), 200);

      Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
      markersRef.current = {};

      if (filteredResults.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();

      filteredResults.forEach((item) => {
        const markerPosition = new window.kakao.maps.LatLng(item.lat, item.lng);
        const marker = new window.kakao.maps.Marker({ position: markerPosition, map: map });

        markersRef.current[item.id] = marker;
        bounds.extend(markerPosition);

        window.kakao.maps.event.addListener(marker, 'click', () => selectItem(item));
      });

      if (filteredResults.length > 0) {
        map.setBounds(bounds);
      }
    };

    const loadKakaoScript = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => drawMap());
      } else {
        const script = document.createElement('script');
        script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=8d6af825da6be5f1560eabf6da500781&autoload=false&libraries=services';
        script.async = true;
        script.onload = () => window.kakao.maps.load(() => drawMap());
        document.head.appendChild(script);
      }
    };

    loadKakaoScript();
  }, [filteredResults, lang]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (mapRef.current && window.kakao) {
          const locPosition = new window.kakao.maps.LatLng(lat, lng);
          if (myLocationMarkerRef.current) myLocationMarkerRef.current.setMap(null);

          const marker = new window.kakao.maps.Marker({ position: locPosition, map: mapRef.current });
          myLocationMarkerRef.current = marker;

          infoWindowRef.current.setContent(`<div style="padding:8px 12px;font-size:13px;font-weight:bold;color:#ea580c;display:flex;align-items:center;gap:6px;"><img src="/character7.png" style="width:22px;height:22px;"/>${t.myLocationTitle}</div>`);
          infoWindowRef.current.open(mapRef.current, marker);
          mapRef.current.panTo(locPosition);
        }
      },
      () => alert(t.locErrorMsg)
    );
  };

  const selectItem = (item) => {
    setSelectedId(item.id);
    if (mapRef.current && window.kakao) {
      const moveLatLon = new window.kakao.maps.LatLng(item.lat, item.lng);
      mapRef.current.panTo(moveLatLon);

      const displayTitle = lang === 'en' ? item.titleEn : item.titleKo;
      const displayLoc = lang === 'en' ? item.locationEn : item.locationKo;
      const displayStatus = item.status === '접수중' ? t.open : t.closed;
      const displayTarget = item.target === '중장년' ? t.senior : item.target === '청소년' ? t.youth : t.adult;

      const content = `
        <div style="padding:12px;font-family:sans-serif;min-width:180px;">
          <div style="font-size:11px;color:${item.status === '접수중' ? '#ea580c' : '#991b1b'};font-weight:bold;margin-bottom:4px;">${displayStatus} · ${displayTarget}</div>
          <div style="font-size:14px;font-weight:bold;color:#0f172a;margin-bottom:4px;">${displayTitle}</div>
          <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:4px;"><img src="/character7.png" style="width:20px;height:20px;"/> ${displayLoc}</div>
        </div>
      `;

      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open(mapRef.current, markersRef.current[item.id]);
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectedStatus('전체');
    setSelectedTarget('전체');
    setShowFavoritesOnly(false);
    setSelectedId(null);
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#fff7ed', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {userEmail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#9a3412' }}>👤 {userEmail}</span>
              <button
                onClick={handleLogout}
                style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #fdba74', backgroundColor: '#fff', color: '#c2410c', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🔓 {t.logoutBtn}
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #fdba74', backgroundColor: '#fff', color: '#c2410c', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🔒 {t.loginBtn}
            </button>
          )}

          <div style={{ background: '#ffedd5', padding: '4px', borderRadius: '12px', border: '1px solid #fed7aa', display: 'flex', gap: '4px' }}>
            <button onClick={() => setLang('ko')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: lang === 'ko' ? '#f97316' : 'transparent', color: lang === 'ko' ? '#fff' : '#c2410c' }}>
              🇰🇷 한국어
            </button>
            <button onClick={() => setLang('en')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: lang === 'en' ? '#f97316' : 'transparent', color: lang === 'en' ? '#fff' : '#c2410c' }}>
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* 🦫 메인 타이틀 영역 */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/character.png" alt="character logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontSize: '36px', color: '#9a3412', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>{t.title}</h1>
              <p style={{ color: '#ea580c', marginTop: '8px', fontSize: '18px', fontWeight: '600', margin: '6px 0 0 0' }}>{t.subtitle}</p>
            </div>
          </div>
        </header>

        {/* 💧 검색 및 내 위치 찾기 */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(249,115,22,0.1)', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', border: '1px solid #ffedd5' }}>
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t.searchPlaceholder} style={{ flex: 1, minWidth: '220px', padding: '14px 16px', border: '1px solid #fed7aa', borderRadius: '12px', fontSize: '15px', outline: 'none' }} />
          <button onClick={handleGetCurrentLocation} style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/character5.png" alt="water can" style={{ width: '32px', height: '32px', filter: 'brightness(0) invert(1)' }} />
            {t.findMyLocation}
          </button>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(249,115,22,0.1)', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid #ffedd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#9a3412' }}>{t.statusLabel}</span>
            {[{ key: '전체', label: t.all }, { key: '접수중', label: t.open }, { key: '마감', label: t.closed }].map((st) => (
              <button key={st.key} onClick={() => setSelectedStatus(st.key)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: selectedStatus === st.key ? '#f97316' : '#ffedd5', color: selectedStatus === st.key ? '#fff' : '#9a3412' }}>
                {st.label}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#fed7aa' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#9a3412' }}>{t.targetLabel}</span>
            {[{ key: '전체', label: t.all }, { key: '중장년', label: t.senior }, { key: '청소년', label: t.youth }, { key: '성인', label: t.adult }].map((tg) => (
              <button key={tg.key} onClick={() => setSelectedTarget(tg.key)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: selectedTarget === tg.key ? '#ea580c' : '#ffedd5', color: selectedTarget === tg.key ? '#fff' : '#9a3412' }}>
                {tg.label}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#fed7aa' }}></div>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: showFavoritesOnly ? 'none' : '1px solid #fdba74',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: showFavoritesOnly ? '#f97316' : '#fff',
              color: showFavoritesOnly ? '#fff' : '#c2410c',
              transition: 'all 0.2s'
            }}
          >
            <img src="/character2.png" alt="shovel icon" style={{ width: '28px', height: '28px', filter: showFavoritesOnly ? 'brightness(0) invert(1)' : 'none' }} />
            {t.favoritesOnly} ({favorites.length})
          </button>

          <button onClick={resetFilters} style={{ marginLeft: 'auto', backgroundColor: 'transparent', border: '1px solid #fdba74', color: '#c2410c', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/character5.png" alt="reset" style={{ width: '22px', height: '22px' }} />
            {t.resetFilter}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/character8.png" alt="signpost" style={{ width: '36px', height: '36px' }} />
              {t.resultsHeader} ({filteredResults.length})
            </h2>

            {isLoading ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                <p style={{ fontSize: '16px', color: '#ea580c' }}>{t.loading}</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                <div style={{ marginBottom: '12px' }}>
                  <img src="/character.png" alt="no data character" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                </div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c2d12', margin: '0 0 8px 0' }}>
                  {showFavoritesOnly ? t.noFavoritesTitle : t.noDataTitle}
                </p>
                <p style={{ fontSize: '14px', color: '#9a3412', margin: '0 0 16px 0' }}>
                  {showFavoritesOnly ? t.noFavoritesSub : t.noDataSub}
                </p>
                <button onClick={resetFilters} style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {t.viewAllBtn}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredResults.map((item) => {
                  const isSelected = selectedId === item.id;
                  const isHovered = hoveredId === item.id;
                  const isFav = favorites.includes(item.id);
                  const displayTitle = lang === 'en' ? item.titleEn : item.titleKo;
                  const displayLoc = lang === 'en' ? item.locationEn : item.locationKo;

                  return (
                    <div
                      key={item.id}
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        background: '#fff',
                        border: isSelected ? '2px solid #f97316' : '1px solid #ffedd5',
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        boxShadow: isHovered || isSelected ? '0 8px 24px rgba(249,115,22,0.2)' : '0 2px 8px rgba(0,0,0,0.03)',
                        transform: isHovered ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.2s ease-in-out',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', backgroundColor: item.status === '접수중' ? '#ffedd5' : '#fee2e2', color: item.status === '접수중' ? '#c2410c' : '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img src={item.status === '접수중' ? '/character4.png' : '/character3.png'} alt="status icon" style={{ width: '26px', height: '26px' }} />
                            {item.status === '접수중' ? t.open : t.closed}
                          </span>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>
                            {item.target === '중장년' ? t.senior : item.target === '청소년' ? t.youth : t.adult}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isSelected && (
                            <span style={{ fontSize: '13px', color: '#f97316', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <img src="/character7.png" alt="selected pin" style={{ width: '24px', height: '24px' }} />
                              {t.selected}
                            </span>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(e, item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              outline: 'none',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <img 
                              src="/character2.png" 
                              alt="shovel favorite" 
                              style={{ 
                                width: '38px', 
                                height: '38px', 
                                opacity: isFav ? 1 : 0.35,
                                filter: isFav ? 'drop-shadow(0 2px 6px rgba(249,115,22,0.5))' : 'grayscale(100%)',
                                transform: isFav ? 'scale(1.15)' : 'scale(1)',
                                transition: 'all 0.2s ease'
                              }} 
                            />
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '19px', color: '#7c2d12', marginBottom: '10px', marginTop: '14px', paddingRight: '20px', fontWeight: 'bold' }}>{displayTitle}</h3>
                      
                      <p style={{ fontSize: '14px', color: '#9a3412', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img src="/character7.png" alt="location pin" style={{ width: '26px', height: '26px' }} />
                        {displayLoc}
                      </p>
                      <p style={{ fontSize: '14px', color: '#c2410c', margin: '0 0 12px 0' }}>📅 {item.period}</p>

                      {/* 💬 lang={lang} 전달로 언어 실시간 연동 */}
                      {isSelected && (
                        <div style={{ marginTop: '16px' }} onClick={(e) => e.stopPropagation()}>
                          <CourseChat course={item} lang={lang} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '16px', color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/character7.png" alt="map icon" style={{ width: '36px', height: '36px' }} />
              {t.mapHeader}
            </h2>
            <div id="map" style={{ width: '100%', height: '560px', borderRadius: '16px', border: '1px solid #fed7aa', boxShadow: '0 4px 20px rgba(249,115,22,0.15)', backgroundColor: '#ffedd5', position: 'sticky', top: '20px' }}></div>
          </div>
        </div>

      </div>
    </div>
  );
}

// 🚦 App 루트 컴포넌트
function App() {
  const [lang, setLang] = useState('ko');

  return (
    <Routes>
      <Route path="/" element={<MainPage lang={lang} setLang={setLang} />} />
      <Route path="/login" element={<LoginPage lang={lang} setLang={setLang} />} />
    </Routes>
  );
}

export default App;
