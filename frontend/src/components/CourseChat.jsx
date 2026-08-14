import React, { useState } from 'react';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://k5235hpbt6.execute-api.ap-southeast-2.amazonaws.com'
    : 'http://localhost:5000');

const translations = {
  ko: {
    title: '✨ AI 강좌 도우미',
    description: '이 강좌가 나에게 맞는지 AI에게 물어보세요.',
    placeholder: '예: 코딩 초보자인데 이 강좌가 저한테 맞을까요?',
    send: 'AI에게 물어보기',
    loading: 'AI가 답변을 생각하고 있어요...',
    error: 'AI 답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    empty: '궁금한 내용을 입력해 주세요.',
    you: '나',
    ai: 'Do-it AI',
  },
  en: {
    title: '✨ AI Course Assistant',
    description: 'Ask AI whether this course is a good fit for you.',
    placeholder: 'e.g. Is this course suitable for a coding beginner?',
    send: 'Ask AI',
    loading: 'AI is thinking...',
    error: 'Failed to load the AI response. Please try again.',
    empty: 'Please enter a question.',
    you: 'You',
    ai: 'Do-it AI',
  },
};

export default function CourseChat({ course, lang = 'ko' }) {
  const t = translations[lang] || translations.ko;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput) {
      alert(t.empty);
      return;
    }

    const userMessage = {
      role: 'user',
      text: trimmedInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/recommend/ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userPrompt: trimmedInput,
            courses: [course],
            lang,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'AI request failed');
      }

      const aiMessage = {
        role: 'ai',
        text: data.recommendation,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI recommendation error:', error);

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: t.error,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        border: '2px solid #ffedd5',
        borderRadius: '14px',
        padding: '16px',
        background: '#fff7ed',
        marginTop: '12px',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <h4
          style={{
            margin: '0 0 5px 0',
            color: '#7c2d12',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {t.title}
        </h4>

        <p
          style={{
            margin: 0,
            color: '#9a3412',
            fontSize: '12px',
          }}
        >
          {t.description}
        </p>
      </div>

      {messages.length > 0 && (
        <div
          style={{
            maxHeight: '280px',
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #fed7aa',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '12px',
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom:
                  index === messages.length - 1 ? '0' : '12px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color:
                    message.role === 'user'
                      ? '#ea580c'
                      : '#7c2d12',
                  marginBottom: '4px',
                }}
              >
                {message.role === 'user' ? t.you : t.ai}
              </div>

              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '13px',
                  color: message.isError
                    ? '#b91c1c'
                    : '#431407',
                  background:
                    message.role === 'user'
                      ? '#fff7ed'
                      : '#fffbeb',
                  borderRadius: '8px',
                  padding: '9px 11px',
                }}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div
              style={{
                marginTop: '10px',
                color: '#ea580c',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {t.loading}
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '11px 12px',
            borderRadius: '8px',
            border: '1px solid #fed7aa',
            outline: 'none',
            fontSize: '13px',
            backgroundColor: '#fff',
          }}
        />

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '10px 15px',
            background: isLoading ? '#fdba74' : '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}