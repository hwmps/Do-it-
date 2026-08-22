import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import CourseChat from './components/CourseChat';
import {
  authenticatedFetch,
  SessionExpiredError
} from './api/apiClient';

import {
  searchCatalog
} from './api/catalogApi';

import { getCourseLifecycle, formatCoursePeriod, compareCoursesByLifecycle, getCourseSourceLabel } from './utils/coursePresentation';

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
function LoginPage({ lang, setLang }) {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setErrorMsg('');

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: credentialResponse.credential
        })
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Google authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);

      alert(
        lang === 'en'
          ? 'Google Login Successful!'
          : '구글 로그인에 성공했습니다!'
      );

      const redirectTo =
      sessionStorage.getItem('postLoginRedirect') || '/';

    sessionStorage.removeItem('postLoginRedirect');
    navigate(redirectTo);
    } catch (error) {
      console.error('Google login error:', error);

      setErrorMsg(
        lang === 'en'
          ? 'Google authentication failed.'
          : '구글 인증에 실패했습니다.'
      );
    }
  };

  const handleGoogleError = () => {
    alert(lang === 'en' ? 'Google Login Failed' : '구글 로그인에 실패했습니다.');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fff7ed' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '24px', border: '1px solid #ffedd5', boxShadow: '0 8px 30px rgba(249,115,22,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setLang('ko');
              localStorage.setItem('lang', 'ko');
            }}
            style={{
              border: 'none',
              background: lang === 'ko' ? '#ffedd5' : 'transparent',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer'
            }}
          >
            🇰🇷 한국어
          </button>

          <button
            type="button"
            onClick={() => {
              setLang('en');
              localStorage.setItem('lang', 'en');
            }}
            style={{
              border: 'none',
              background: lang === 'en' ? '#ffedd5' : 'transparent',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer'
            }}
          >
            🇺🇸 English
          </button>
        </div>

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
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedTarget, setSelectedTarget] = useState('전체');
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [catalogResults, setCatalogResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef({});
  const myLocationMarkerRef = useRef(null);
  const activeCatalogRequestRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) setUserEmail(savedEmail);

    const token = localStorage.getItem('token');

    if (!token) {
      setFavorites([]);
      return;
    }

    const loadFavorites = async () => {
      try {
        const response = await authenticatedFetch('/api/v1/favorites');

        if (!response.ok) {
          throw new Error('Failed to load favorites');
        }

        const data = await response.json();

        if (data.status === 'success') {
          setFavorites((data.favorites || []).map(String));
        }
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          setFavorites([]);
          setUserEmail('');

          alert(
            lang === 'en'
              ? 'Your session has expired. Please sign in again.'
              : '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'
          );

          navigate('/login');
          return;
        }

        console.error('Favorites load error:', error);
      }
    };

    loadFavorites();
  }, []);

  const toggleFavorite = async (e, id) => {
    e.stopPropagation();

    const token = localStorage.getItem('token');

    if (!token) {
      alert(
        lang === 'en'
          ? 'Please log in to save courses.'
          : '강좌를 찜하려면 로그인해 주세요.'
      );
      navigate('/login');
      return;
    }

    const courseId = String(id);
    const isFavorite = favorites.includes(courseId);

    const previousFavorites = favorites;
    const updatedFavorites = isFavorite
      ? favorites.filter(favId => favId !== courseId)
      : [...favorites, courseId];

    // 화면은 먼저 즉시 반영
    setFavorites(updatedFavorites);

    try {
      const response = await authenticatedFetch(
        `/api/v1/favorites/${encodeURIComponent(courseId)}`,
        {
          method: isFavorite ? 'DELETE' : 'POST'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }
    } catch (error) {
      // 서버 저장 실패 시 optimistic UI 되돌리기
      setFavorites(previousFavorites);

      if (error instanceof SessionExpiredError) {
        setUserEmail('');

        alert(
          lang === 'en'
            ? 'Your session has expired. Please sign in again.'
            : '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'
        );

        navigate('/login');
        return;
      }

      console.error('Favorite update error:', error);

      alert(
        lang === 'en'
          ? 'Failed to update saved courses.'
          : '찜 목록을 업데이트하지 못했습니다.'
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setUserEmail('');
    setFavorites([]);
    alert(lang === 'en' ? 'Logged out.' : '로그아웃 되었습니다.');
  };

  const fetchCoursesFromBackend = async () => {
    activeCatalogRequestRef.current?.abort();
    const controller = new AbortController();
    activeCatalogRequestRef.current = controller;

    setIsLoading(true);
    setCatalogError('');

    try {
      const result = await searchCatalog({
        query: debouncedKeyword,
        status: selectedStatus,
        target: selectedTarget,
        region: selectedRegion,
        limit: 50,
        signal: controller.signal
      });

      let mapped = result.items.map((item) => {
        const id =
          String(
            item.id ??
            item.sourceId
          );

        return {
          ...item,
          id,
          sourceId:
            item.sourceId || id,

          titleKo:
            item.titleKo ||
            item.title ||
            '',

          titleEn:
            item.titleEn ||
            item.titleKo ||
            item.title ||
            '',

          locationKo:
            item.locationKo ||
            item.location ||
            '',

          locationEn:
            item.locationEn ||
            item.locationKo ||
            item.location ||
            ''
        };
      });

      setCatalogResults(
        mapped
      );

    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      console.error(
        'Catalog search error:',
        error
      );

      setCatalogResults([]);

      setCatalogError(
        lang === 'en'
          ? 'We could not load the course catalog. Please try again.'
          : '강좌 목록을 불러오지 못했습니다. 다시 시도해 주세요.'
      );
    } finally {
      if (activeCatalogRequestRef.current === controller) {
        activeCatalogRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      activeCatalogRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const visibleResults = showFavoritesOnly
      ? catalogResults.filter((item) => favorites.includes(String(item.id)))
      : catalogResults;

    setFilteredResults(visibleResults);
  }, [catalogResults, showFavoritesOnly, favorites]);

  useEffect(() => {
    fetchCoursesFromBackend();
  }, [
    debouncedKeyword,
    selectedStatus,
    selectedTarget,
    selectedRegion
  ]);

  // 🗺️ 지도 안전 렌더링 로직
  useEffect(() => {
    const drawMap = () => {
      const container = document.getElementById('map');
      if (!container) return;

      const centerLat = currentLocation?.lat ?? 35.1795;
      const centerLng = currentLocation?.lng ?? 129.0756;

      const options = {
        center: new window.kakao.maps.LatLng(centerLat, centerLng),
        level: 7
      };
      mapRef.current = new window.kakao.maps.Map(container, options);
      infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1 });

      if (currentLocation) {
        if (myLocationMarkerRef.current) {
          myLocationMarkerRef.current.setMap(null);
        }

        const locPosition = new window.kakao.maps.LatLng(
          currentLocation.lat,
          currentLocation.lng
        );

        const marker = new window.kakao.maps.Marker({
          position: locPosition,
          map: mapRef.current
        });

        myLocationMarkerRef.current = marker;

        infoWindowRef.current.setContent(
          `<div style="padding:8px 12px;font-size:13px;font-weight:bold;color:#ea580c;display:flex;align-items:center;gap:6px;"><img src="/character7.png" style="width:22px;height:22px;"/>${t.myLocationTitle}</div>`
        );

        infoWindowRef.current.open(mapRef.current, marker);
      }

      const map = mapRef.current;
      setTimeout(() => map.relayout(), 200);

      Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
      markersRef.current = {};

      if (filteredResults.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();

      const mappableResults =
        filteredResults.filter(
          (item) =>
            Number.isFinite(item.lat) &&
            Number.isFinite(item.lng)
        );

      mappableResults.forEach((item) => {
        const markerPosition =
          new window.kakao.maps.LatLng(
            item.lat,
            item.lng
          );

        const marker =
          new window.kakao.maps.Marker({
            position: markerPosition,
            map
          });

        markersRef.current[item.id] =
          marker;

        bounds.extend(
          markerPosition
        );

        window.kakao.maps.event.addListener(
          marker,
          'click',
          () => selectItem(item)
        );
      });

      if (mappableResults.length > 0) {
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
  }, [filteredResults, lang, currentLocation]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCurrentLocation({ lat, lng });

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

    const hasCoordinates =
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng);

    const marker =
      markersRef.current[
        item.id
      ];

    if (
      !hasCoordinates ||
      !marker ||
      !mapRef.current ||
      !window.kakao
    ) {
      return;
    }

    const moveLatLon =
      new window.kakao.maps.LatLng(
        item.lat,
        item.lng
      );

    mapRef.current.panTo(
      moveLatLon
    );

    const displayTitle =
      lang === 'en'
        ? item.titleEn
        : item.titleKo;

    const displayLoc =
      lang === 'en'
        ? item.locationEn
        : item.locationKo;

    const displayStatus =
      item.status === '접수중'
        ? t.open
        : item.status === '마감'
          ? t.closed
          : item.status || '-';

    const displayTarget =
      item.target === '중장년'
        ? t.senior
        : item.target === '청소년'
          ? t.youth
          : item.target === '성인'
            ? t.adult
            : item.target || '-';

    const content = `
      <div style="padding:12px;font-family:sans-serif;min-width:180px;">
        <div style="font-size:11px;color:#ea580c;font-weight:bold;margin-bottom:4px;">
          ${displayStatus} · ${displayTarget}
        </div>

        <div style="font-size:14px;font-weight:bold;color:#0f172a;margin-bottom:4px;">
          ${displayTitle}
        </div>

        <div style="font-size:12px;color:#64748b;">
          ${displayLoc}
        </div>
      </div>
    `;

    infoWindowRef.current.setContent(
      content
    );

    infoWindowRef.current.open(
      mapRef.current,
      marker
    );
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectedStatus('전체');
    setSelectedTarget('전체');
    setSelectedRegion('전체');
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

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#9a3412" }}>{lang === "en" ? "Region:" : "지역:"}</span>
            {["전체", "Busan", "Daegu"].map((region) => (
              <button key={region} onClick={() => setSelectedRegion(region)} style={{ padding: "6px 14px", borderRadius: "20px", border: "none", fontSize: "13px", fontWeight: "bold", cursor: "pointer", backgroundColor: selectedRegion === region ? "#f97316" : "#ffedd5", color: selectedRegion === region ? "#fff" : "#9a3412" }}>
                {region === "전체" ? t.all : region}
              </button>
            ))}
          </div>
          <div style={{ width: "1px", height: "20px", backgroundColor: "#fed7aa" }}></div>

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

            {catalogError ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #fecaca' }}>
                <img
                  src="/character.png"
                  alt="catalog error"
                  style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '12px' }}
                />

                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 8px 0' }}>
                  {catalogError}
                </p>

                <button
                  type="button"
                  onClick={() => fetchCoursesFromBackend()}
                  style={{
                    backgroundColor: '#f97316',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'en' ? 'Try Again' : '다시 시도'}
                </button>
              </div>
            ) : isLoading ? (
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
                {[...filteredResults].sort((a, b) => compareCoursesByLifecycle(a, b)).map((item) => {
                  const isSelected = selectedId === item.id;
                  const isHovered = hoveredId === item.id;
                  const isFav = favorites.includes(String(item.id));
                  const displayTitle = lang === 'en' ? item.titleEn : item.titleKo;
                  const displayLoc = lang === 'en' ? item.locationEn : item.locationKo;
                  const lifecycle = getCourseLifecycle(item);
                  const formattedPeriod = formatCoursePeriod(item);
                  const sourceLabel = getCourseSourceLabel(item);
                  const lifecycleLabel = lang === 'en' ? ({ current: 'Current', upcoming: 'Upcoming', past: 'Past', unknown: 'Date unknown' }[lifecycle]) : ({ current: '진행 중', upcoming: '예정', past: '종료', unknown: '날짜 미확인' }[lifecycle]);

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
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', backgroundColor: item.status === '접수중' ? '#ffedd5' : item.status === '마감' ? '#fee2e2' : '#f1f5f9', color: item.status === '접수중' ? '#c2410c' : item.status === '마감' ? '#991b1b' : '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <img src={item.status === '접수중' ? '/character4.png' : item.status === '마감' ? '/character3.png' : '/character5.png'} alt="status icon" style={{ width: '26px', height: '26px' }} />
                            {item.status === '접수중' ? t.open : item.status === '마감' ? t.closed : (item.status || (lang === 'en' ? 'Unknown' : '미확인'))}
                          </span>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>
                            {item.target === '중장년' ? t.senior : item.target === '청소년' ? t.youth : item.target === '성인' ? t.adult : (item.target || (lang === 'en' ? 'Unknown' : '미확인'))}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {Number.isFinite(item.distanceKm) && (
                            <span
                              style={{
                                fontSize: '13px',
                                color: '#c2410c',
                                fontWeight: 'bold'
                              }}
                            >
                              📍 {item.distanceKm.toFixed(1)} km
                            </span>
                          )}

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
                      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        <span style={{ padding: '4px 9px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>{lifecycleLabel}</span>
                        <span style={{ padding: '4px 9px', borderRadius: '999px', fontSize: '12px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>{sourceLabel}</span>
                      </div>
                      
                      <p style={{ fontSize: '14px', color: '#9a3412', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <img src="/character7.png" alt="location pin" style={{ width: '26px', height: '26px' }} />
                        {displayLoc}
                      </p>
                      {formattedPeriod && (<p style={{ fontSize: '14px', color: '#c2410c', margin: '0 0 12px 0' }}>📅 {formattedPeriod}</p>)}

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
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ko');

  return (
    <Routes>
      <Route path="/" element={<MainPage lang={lang} setLang={setLang} />} />
      <Route path="/login" element={<LoginPage lang={lang} setLang={setLang} />} />
    </Routes>
  );
}

export default App;
