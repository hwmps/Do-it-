import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// 🌐 채팅창 전용 다국어 사전
const chatTranslations = {
  ko: {
    chatTitle: '💬 실시간 Q&A 채팅방',
    activeUsers: '접속자',
    noMessages: '첫 메시지를 작성해 보세요!',
    placeholder: '궁금한 점을 물어보세요...',
    sendBtn: '전송',
    userPrefix: '수강생',
  },
  en: {
    chatTitle: '💬 Real-Time Q&A Chat',
    activeUsers: 'Active',
    noMessages: 'Be the first to leave a message!',
    placeholder: 'Ask your questions...',
    sendBtn: 'Send',
    userPrefix: 'Student',
  }
};

export default function CourseChat({ course, lang = 'ko' }) {
  // lang 값에 맞춰 언어 설정 (기본값 'ko')
  const t = chatTranslations[lang] || chatTranslations.ko;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [userCount, setUserCount] = useState(1);
  const [username] = useState(() => `${t.userPrefix}_${Math.floor(Math.random() * 1000)}`);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!course) return;

    socketRef.current = io('http://localhost:5000');

    // 1. 방 입장
    socketRef.current.emit('join_room', { courseId: course.id, username });

    // 2. 메시지 내역 불러오기
    socketRef.current.on('init_messages', (history) => {
      setMessages(history);
    });

    // 3. 동접자 수 수신
    socketRef.current.on('update_user_count', (count) => {
      setUserCount(count);
    });

    // 4. 실시간 새 메시지 수신
    socketRef.current.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [course, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      courseId: course.id,
      text: input,
      sender: username
    });

    setInput('');
  };

  return (
    <div style={{ border: '2px solid #ffedd5', borderRadius: '12px', padding: '16px', background: '#fff7ed', marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, color: '#7c2d12', fontSize: '15px', fontWeight: 'bold' }}>{t.chatTitle}</h4>
        <span style={{ background: '#f97316', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
          🟢 {t.activeUsers} {userCount}{lang === 'ko' ? '명' : ''}
        </span>
      </div>

      <div style={{ height: '180px', overflowY: 'auto', border: '1px solid #fed7aa', padding: '10px', marginBottom: '10px', borderRadius: '8px', background: '#fff' }}>
        {messages.length === 0 ? (
          <p style={{ color: '#9a3412', fontSize: '12px', textAlign: 'center', margin: '70px 0 0 0' }}>{t.noMessages}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id || Math.random()} style={{ marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 'bold', color: msg.sender === username ? '#ea580c' : '#7c2d12' }}>[{msg.sender}]</span>: {msg.text}
              <span style={{ fontSize: '10px', color: '#a3a3a3', marginLeft: '6px' }}>{msg.time}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #fed7aa', outline: 'none', fontSize: '13px' }}
        />
        <button type="submit" style={{ padding: '10px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          {t.sendBtn}
        </button>
      </form>
    </div>
  );
}