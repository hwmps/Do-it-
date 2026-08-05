import React, { useState, useEffect, useRef, useMemo } from 'react';

function App() {
  const [keyword, setKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('전체');
  const [selectedTarget, setSelectedTarget] = useState('전체');
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  // 기본 강좌 데이터셋
  const [rawResults, setRawResults] = useState([
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
  ]);

  const mapRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef({});
  const myLocationMarkerRef = useRef(null);

  // 검색어 + 필터 조건이 적용된 최종 강좌 데이터
  const filteredResults = useMemo(() => {
    return rawResults.filter((item) => {
      const matchKeyword = keyword === '' || item.title.includes(keyword) || item.location.includes(keyword);
      const matchStatus = selectedStatus === '전체' || item.status === selectedStatus;
      const matchTarget = selectedTarget === '전체' || item.target === selectedTarget;
      return matchKeyword && matchStatus && matchTarget;
    });
  }, [rawResults, keyword, selectedStatus, selectedTarget]);

  useEffect(() => {
    const drawMap = () => {
      if (!window.kakao || !window.kakao.maps) return;

      window.kakao.maps.load(() => {
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

        // 기존 마커 제거
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
      });
    };

    if (window.kakao && window.kakao.maps) {
      drawMap();
    } else {
      const existingScript = document.getElementById('kakao-map-script');
      if (existingScript) existingScript.remove();

      const script = document.createElement('script');
      script.id = 'kakao-map-script';
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=8d6af825da6be5f1560eabf6da500781&autoload=false&libraries=services';
      script.async = true;
      script.onload = () => drawMap();
      document.head.appendChild(script);
    }
  }, [filteredResults]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

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
            <div style="padding:8px 12px;font-size:13px;font-weight:bold;color:#2563eb;">
              📍 내 현재 위치
            </div>
          `);
          infoWindowRef.current.open(mapRef.current, marker);
          mapRef.current.panTo(locPosition);
        }
      },
      () => alert('내 위치를 가져오는데 실패했습니다.')
    );
  };

  const selectItem = (item) => {
    setSelectedId(item.id);

    if (mapRef.current && window.kakao) {
      const moveLatLon = new window.kakao.maps.LatLng(item.lat, item.lng);
      mapRef.current.panTo(moveLatLon);

      const content = `
        <div style="padding:12px;font-family:sans-serif;min-width:180px;">
          <div style="font-size:11px;color:${item.status === '접수중' ? '#166534' : '#991b1b'};font-weight:bold;margin-bottom:4px;">
            ${item.status} · ${item.target}
          </div>
          <div style="font-size:14px;font-weight:bold;color:#0f172a;margin-bottom:4px;">${item.title}</div>
          <div style="font-size:12px;color:#64748b;">📍 ${item.location}</div>
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
    <div style={{ padding: '40px 20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 헤더 */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>📱</span>
            <h1 style={{ fontSize: '28px', color: '#0f172a', margin: 0, fontWeight: 'bold' }}>
              Do-it: 세종시 공공 평생학습 매칭 플랫폼
            </h1>
          </div>
          <p style={{ color: '#64748b', marginTop: '8px' }}>위치 기반 서비스(LBS)를 통해 내 주변 맞춤형 교육 프로그램을 검색하세요.</p>
        </header>

        {/* 검색바 & 내 위치 버튼 */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="강좌명 또는 시설명을 검색하세요"
            style={{ flex: 1, minWidth: '220px', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', outline: 'none' }}
          />
          <button
            onClick={handleGetCurrentLocation}
            style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🎯 내 위치 찾기
          </button>
        </div>

        {/* 🏷️ 필터 바 (상태별 & 대상별 Chip 필터) */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* 접수 상태 필터 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>상태:</span>
            {['전체', '접수중', '마감'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: selectedStatus === status ? '#2563eb' : '#f1f5f9',
                  color: selectedStatus === status ? '#fff' : '#64748b'
                }}
              >
                {status}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }}></div>

          {/* 대상별 필터 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>대상:</span>
            {['전체', '중장년', '청소년', '성인'].map((target) => (
              <button
                key={target}
                onClick={() => setSelectedTarget(target)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: selectedTarget === target ? '#0284c7' : '#f1f5f9',
                  color: selectedTarget === target ? '#fff' : '#64748b'
                }}
              >
                {target}
              </button>
            ))}
          </div>

          {/* 초기화 버튼 */}
          <button
            onClick={resetFilters}
            style={{ marginLeft: 'auto', backgroundColor: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            🔄 필터 초기화
          </button>
        </div>

        {/* 메인 레이아웃 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* 좌측: 강좌 목록 */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#0f172a' }}>
              🔍 주변 교육 시설 / 프로그램 결과 ({filteredResults.length})
            </h2>

            {filteredResults.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>😅</p>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', margin: '0 0 8px 0' }}>조건에 맞는 강좌가 없습니다.</p>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 16px 0' }}>검색어나 필터를 변경해 보세요.</p>
                <button
                  onClick={resetFilters}
                  style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  전체 강좌 보기
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredResults.map((item) => {
                  const isSelected = selectedId === item.id;
                  const isHovered = hoveredId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        background: '#fff',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        boxShadow: isHovered || isSelected ? '0 8px 24px rgba(37,99,235,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                        transform: isHovered ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: item.status === '접수중' ? '#dcfce7' : '#fee2e2',
                            color: item.status === '접수중' ? '#166534' : '#991b1b'
                          }}>
                            {item.status}
                          </span>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1'
                          }}>
                            {item.target}
                          </span>
                        </div>
                        {isSelected && <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>선택됨 📍</span>}
                      </div>
                      <h3 style={{ fontSize: '18px', color: '#0f172a', marginBottom: '8px', marginTop: '12px' }}>{item.title}</h3>
                      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>📍 {item.location}</p>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>📅 {item.period}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 우측: 카카오맵 영역 */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#0f172a' }}>🗺️ 지도 보기</h2>
            <div 
              id="map" 
              style={{ 
                width: '100%', 
                height: '560px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                backgroundColor: '#f1f5f9',
                position: 'sticky',
                top: '20px'
              }}
            ></div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
