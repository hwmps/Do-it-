const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://k5235hpbt6.execute-api.ap-southeast-2.amazonaws.com'
    : 'http://localhost:5000');

export class SessionExpiredError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export async function authenticatedFetch(path, options = {}) {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new SessionExpiredError();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');

    sessionStorage.setItem(
      'postLoginRedirect',
      window.location.pathname + window.location.search
    );

    throw new SessionExpiredError();
  }

  return response;
}

export { API_BASE_URL };
