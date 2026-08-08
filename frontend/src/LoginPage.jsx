function LoginPage({ lang, setLang }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. 일반 이메일 로그인 처리
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
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

  // 2. Google 소셜 로그인 성공 시 처리
  const handleGoogleSuccess = (credentialResponse) => {
    console.log('Google Credential:', credentialResponse.credential);
    localStorage.setItem('token', credentialResponse.credential);
    localStorage.setItem('userEmail', 'Google User');
    
    alert(lang === 'en' ? 'Google Login Successful!' : '구글 로그인에 성공했습니다! 🌐');
    navigate('/');
  };

  const handleGoogleError = () => {
    alert(lang === 'en' ? 'Google Login Failed' : '구글 로그인에 실패했습니다.');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#fff7ed' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '24px', border: '1px solid #ffedd5', boxShadow: '0 8px 30px rgba(249,115,22,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ color: '#9a3412', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
          🍊 Do-it {lang === 'en' ? 'Login' : '로그인'}
        </h2>
        <p style={{ color: '#ea580c', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
          {lang === 'en' ? 'Welcome back! Please enter your details.' : '서비스 이용을 위해 로그인해 주세요.'}
        </p>

        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        )}

        {/* 🌐 Google 소셜 로그인 버튼 영역 */}
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
          style={{ width: '100%', marginTop: '12px', padding: '10px', backgroundColor: 'transparent', color: '#c2410c', border: '1px solid #fdba74', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← {lang === 'en' ? 'Back to Home' : '메인 화면으로 돌아가기'}
        </button>
      </div>
    </div>
  );
}