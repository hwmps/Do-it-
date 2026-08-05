import React, { useState, useEffect, useRef } from 'react';

// 🌐 i18n 번역 사전
const translations = {
  ko: {
    title: 'Do-it: 세종시 공공 평생학습 매칭 플랫폼',
    subtitle: '위치 기반 서비스(LBS)를 통해 내 주변 맞춤형 교육 프로그램을 검색하세요.',
    searchPlaceholder: '강좌명 또는 시설명을 검색하세요',
    findMyLocation: '🎯 내 위치 찾기',
    statusLabel: '상태:',
    targetLabel: '대상:',
    all: '전체',
    open: '접수중',
    closed: '마감',
    senior: '중장년',
    youth: '청소년',
    adult: '성인',
    resetFilter: '🔄 필터 초기화',
    resultsHeader: '🔍 주변 교육 시설 / 프로그램 결과',
    mapHeader: '🗺️ 지도 보기',
    loading: '⏳ 데이터를 실시간으로 가져오는 중입니다...',
    noDataTitle: '조건에 맞는 강좌가 없습니다.',
    noDataSub: '검색어나 필터를 변경해 보세요.',
    viewAllBtn: '전체 강좌 보기',
    selected: '선택됨 📍',
    myLocationTitle: '📍 내 현재 위치',
    locErrorMsg: '위치 정보를 가져오는데 실패했습니다.',
  },
  en: {
    title: 'Do-it: Sejong Public Learning Platform',
    subtitle: 'Discover personalized learning programs nearby using Location-Based Services.',
    searchPlaceholder: 'Search by course title or facility name...',
    findMyLocation: '🎯 Find My Location',
    statusLabel: 'Status:',
    targetLabel: 'Target:',
    all: 'All',
    open: 'Open',
    closed: 'Closed',
    senior: 'Seniors',
    youth: 'Youth',
    adult: 'Adults',
    resetFilter: '🔄 Reset Filters',
    resultsHeader: '🔍 Nearby Facilities / Programs',
    mapHeader: '🗺️ Map View',
    loading: '⏳ Fetching data in real-time...',
    noDataTitle: 'No courses match your criteria.',
    noDataSub: 'Try changing your search terms or filters.',
    viewAllBtn: 'View All Courses',
    selected: 'Selected 📍',
    myLocationTitle: '📍 Current Location',
    locErrorMsg: 'Failed to retrieve location info.',
  }
};

// 💡 한영 기본 매핑 사전 (백엔드가 단일 언어 title만 넘겨줄 경우 활용)
const englishTitleMap = {
  '세종시 중장년 파이썬 코딩 입문': 'Python Coding for Seniors',
  '청소년을 위한 웹개발 기초 (HTML/CSS)': 'Web Development Basics for Youth',
  '성인 대상 AI 데이터 분석 기초': 'AI Data Analysis for Adults',
  '중장년 디지털 소양 & 스마트폰 활용': 'Digital Literacy for Seniors'
};

const englishLocMap = {
  '세종특별자치시 한솔동 복합커뮤니티센터': 'Hansol-dong Community Center, Sejong',
  '세종시 평생교육학습관': 'Sejong Lifelong Education Center',
  '세종시 아름동 복합커뮤니티센터': 'Areum-dong Community Center, Sejong',
  '세종시 보람동 복합커뮤니티센터': 'Boram-dong Community Center, Sejong'
};

function App() {
  const [lang, setLang] = useState('ko');
  const t = translations[lang];

  const [keyword, setKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedTarget, setSelectedTarget] = useState('전체');
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const [filteredResults, setFilteredResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef({});
  const myLocationMarkerRef = useRef(null);

  // 📡 Express API 호출
  const fetchCoursesFromBackend = async () => {
    setIsLoading(true);

    const mockData = [
      { id: 1, titleKo: '세종시 중장년 파이썬 코딩 입문', titleEn: 'Python Coding for Seniors', locationKo: '세종특별자치시 한솔동 복합커뮤니티센터', locationEn: 'Hansol-dong Community Center, Sejong', period: '2026.09.01 ~ 2026.11.30', status: '접수중', target: '중장년', lat: 36.4800, lng: 127.2890 },
      { id: 2, titleKo: '청소년을 위한 웹개발 기초 (HTML/CSS)', titleEn: 'Web Development Basics for Youth', locationKo: '세종시 평생교육학습관', locationEn: 'Sejong Lifelong Education Center', period: '2026.08.10 ~ 2026.09.15', status: '마감', target: '청소년', lat: 36.4850, lng: 127.2950 },
      { id: 3, titleKo: '성인 대상 AI 데이터 분석 기초', titleEn: 'AI Data Analysis for Adults', locationKo: '세종시 아름동 복합커뮤니티센터', locationEn: 'Areum-dong Community Center, Sejong', period: '2026.10.01 ~ 2026.12.15', status: '접수중', target: '성인', lat: 36.5120, lng: 127.2480 },
      { id: 4, titleKo: '중장년 디지털 소양 & 스마트폰 활용', titleEn: 'Digital Literacy for Seniors', locationKo: '세종시 보람동 복합커뮤니티센터', locationEn: 'Boram-dong Community Center, Sejong', period: '2026.09.15 ~ 2026.11.15', status: '접수중', target: '중장년', lat: 36.4795, lng: 127.2810 }
    ];

    try {
      const queryParams = new URLSearchParams({
        query: keyword,
        status: selectedStatus,
        target: selectedTarget,
      });

      const response = await fetch(`http://localhost:5000/api/v1/locations/search?${queryParams}`);
      if (!response.ok) throw new Error('백엔드 연동 실패');
      const data = await response.json();

      if (data.status === 'success') {
        const mapped = data.data.map(item => ({
          ...item,
          titleKo: item.titleKo || item.title || '',
          titleEn: item.titleEn || englishTitleMap[item.title] || item.title || '',
          locationKo: item.locationKo || item.location || '',
          locationEn: item.locationEn || englishLocMap[item.location] || item.location || '',
        }));
        setFilteredResults(mapped);
      }
    } catch (error) {
      const filtered = mockData.filter(item => {
        const title = lang === 'en' ? item.titleEn : item.titleKo;
        const location = lang === 'en' ? item.locationEn : item.locationKo;
        const matchKeyword = keyword === '' || title.toLowerCase().includes(keyword.toLowerCase()) || location.toLowerCase().includes(keyword.toLowerCase());
        const matchStatus = selectedStatus === '전체' || item.status === selectedStatus;
        const matchTarget = selectedTarget === '전체' || item.target === selectedTarget;
        return matchKeyword && matchStatus && matchTarget;
      });
      setFilteredResults(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoursesFromBackend();
  }, [keyword, selectedStatus, selectedTarget]);

  // 🗺️ 지도 마커 렌더링
  useEffect(() => {
    const drawMap = () => {
      const container = document.getElementById('map');
      if (!container) return;

      if (!mapRef.current) {
        const options = {
          center: new window.kakao.maps.LatLng(36.4800, 127.2890),
          level: 5,
        };
        mapRef.current = new window.kakao.maps.Map(container, options);
        infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1 });
      }

      const map = mapRef.current;
      setTimeout(() => map.relayout(), 100);

      Object.values(markersRef.current).forEach((marker) => marker.setMap(null));
      markersRef.current = {};

      if (filteredResults.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();

      filteredResults.forEach((item) => {
        const markerPosition = new window.kakao.maps.LatLng(item.lat, item.lng);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          map: map,
        });

        markersRef.current[item.id] = marker;
        bounds.extend(markerPosition);

        window.kakao.maps.event.addListener(marker, 'click', () => {
          selectItem(item);
        });
      });

      map.setBounds(bounds);
    };

    const loadKakaoScript = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => drawMap());
      } else {
        const script = document.createElement('script');
        script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=8d6af825da6be5f1560eabf6da500781&autoload=false&libraries=services';
        script.async = true;
        script.onload = () => {
          window.kakao.maps.load(() => drawMap());
        };
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

          if (myLocationMarkerRef.current) {
            myLocationMarkerRef.current.setMap(null);
          }

          const marker = new window.kakao.maps.Marker({
            position: locPosition,
            map: mapRef.current,
          });
          myLocationMarkerRef.current = marker;

          infoWindowRef.current.setContent(`
            <div style="padding:8px 12px;font-size:13px;font-weight:bold;color:#ea580c;">
              ${t.myLocationTitle}
            </div>
          `);
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
          <div style="font-size:11px;color:${item.status === '접수중' ? '#ea580c' : '#991b1b'};font-weight:bold;margin-bottom:4px;">
            ${displayStatus} · ${displayTarget}
          </div>
          <div style="font-size:14px;font-weight:bold;color:#0f172a;margin-bottom:4px;">${displayTitle}</div>
          <div style="font-size:12px;color:#64748b;">📍 ${displayLoc}</div>
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
    setSelectedId(null);
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#fff7ed', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 언어 토글 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{ background: '#ffedd5', padding: '4px', borderRadius: '12px', border: '1px solid #fed7aa', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setLang('ko')}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: lang === 'ko' ? '#f97316' : 'transparent', color: lang === 'ko' ? '#fff' : '#c2410c'
              }}
            >
              🇰🇷 한국어
            </button>
            <button
              onClick={() => setLang('en')}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                backgroundColor: lang === 'en' ? '#f97316' : 'transparent', color: lang === 'en' ? '#fff' : '#c2410c'
              }}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* 헤더 */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px' }}>🍊</span>
            <h1 style={{ fontSize: '28px', color: '#9a3412', margin: 0, fontWeight: '800' }}>
              {t.title}
            </h1>
          </div>
          <p style={{ color: '#ea580c', marginTop: '8px', fontWeight: '500' }}>{t.subtitle}</p>
        </header>

        {/* 검색바 */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(249,115,22,0.1)', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', border: '1px solid #ffedd5' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{ flex: 1, minWidth: '220px', padding: '14px 16px', border: '1px solid #fed7aa', borderRadius: '12px', fontSize: '15px', outline: 'none' }}
          />
          <button
            onClick={handleGetCurrentLocation}
            style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {t.findMyLocation}
          </button>
        </div>

        {/* 필터바 */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(249,115,22,0.1)', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid #ffedd5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#9a3412' }}>{t.statusLabel}</span>
            {[
              { key: '전체', label: t.all },
              { key: '접수중', label: t.open },
              { key: '마감', label: t.closed }
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setSelectedStatus(st.key)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: selectedStatus === st.key ? '#f97316' : '#ffedd5',
                  color: selectedStatus === st.key ? '#fff' : '#9a3412'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#fed7aa' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#9a3412' }}>{t.targetLabel}</span>
            {[
              { key: '전체', label: t.all },
              { key: '중장년', label: t.senior },
              { key: '청소년', label: t.youth },
              { key: '성인', label: t.adult }
            ].map((tg) => (
              <button
                key={tg.key}
                onClick={() => setSelectedTarget(tg.key)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                  backgroundColor: selectedTarget === tg.key ? '#ea580c' : '#ffedd5',
                  color: selectedTarget === tg.key ? '#fff' : '#9a3412'
                }}
              >
                {tg.label}
              </button>
            ))}
          </div>

          <button
            onClick={resetFilters}
            style={{ marginLeft: 'auto', backgroundColor: 'transparent', border: '1px solid #fdba74', color: '#c2410c', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            {t.resetFilter}
          </button>
        </div>

        {/* 결과 뷰 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#7c2d12' }}>
              {t.resultsHeader} ({filteredResults.length})
            </h2>

            {isLoading ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                <p style={{ fontSize: '16px', color: '#ea580c' }}>{t.loading}</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>🍊</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#7c2d12', margin: '0 0 8px 0' }}>{t.noDataTitle}</p>
                <p style={{ fontSize: '14px', color: '#9a3412', margin: '0 0 16px 0' }}>{t.noDataSub}</p>
                <button
                  onClick={resetFilters}
                  style={{ backgroundColor: '#f97316', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {t.viewAllBtn}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredResults.map((item) => {
                  const isSelected = selectedId === item.id;
                  const isHovered = hoveredId === item.id;
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
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                            backgroundColor: item.status === '접수중' ? '#ffedd5' : '#fee2e2',
                            color: item.status === '접수중' ? '#c2410c' : '#991b1b'
                          }}>
                            {item.status === '접수중' ? t.open : t.closed}
                          </span>
                          <span style={{
                            display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                            backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5'
                          }}>
                            {item.target === '중장년' ? t.senior : item.target === '청소년' ? t.youth : t.adult}
                          </span>
                        </div>
                        {isSelected && <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 'bold' }}>{t.selected}</span>}
                      </div>
                      <h3 style={{ fontSize: '18px', color: '#7c2d12', marginBottom: '8px', marginTop: '12px' }}>{displayTitle}</h3>
                      <p style={{ fontSize: '14px', color: '#9a3412', marginBottom: '4px' }}>📍 {displayLoc}</p>
                      <p style={{ fontSize: '14px', color: '#c2410c', margin: 0 }}>📅 {item.period}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#7c2d12' }}>{t.mapHeader}</h2>
            <div 
              id="map" 
              style={{ 
                width: '100%', height: '560px', borderRadius: '16px', border: '1px solid #fed7aa',
                boxShadow: '0 4px 20px rgba(249,115,22,0.15)', backgroundColor: '#ffedd5', position: 'sticky', top: '20px' 
              }}
            ></div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;