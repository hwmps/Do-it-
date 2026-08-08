import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './i18n'; // 다국어(i18n) 설정 불러오기

// 🔑 Google Cloud Console에서 발급받은 클라이언트 ID
// (아직 발급받기 전이면 아래 가짜 ID 그대로 두고 테스트하셔도 됩니다!)
const GOOGLE_CLIENT_ID = '716255460865-nqr8ep34a5d80144h0n3sk6t4ihr92e0.apps.googleusercontent.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);