import {
  authenticatedFetch,
  SessionExpiredError
} from './apiClient';

describe('authenticatedFetch', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    global.fetch = jest.fn();

    window.history.pushState(
      {},
      '',
      '/courses?status=open'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('adds Bearer token to authenticated requests', async () => {
    localStorage.setItem('token', 'valid-test-token');

    global.fetch.mockResolvedValue({
      status: 200,
      ok: true
    });

    await authenticatedFetch('/api/v1/favorites');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/favorites'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-test-token'
        })
      })
    );
  });

  test('throws SessionExpiredError when no token exists', async () => {
    await expect(
      authenticatedFetch('/api/v1/favorites')
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('clears session and remembers current page when API returns 401', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('userEmail', 'private@example.com');

    global.fetch.mockResolvedValue({
      status: 401,
      ok: false
    });

    await expect(
      authenticatedFetch('/api/v1/favorites')
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userEmail')).toBeNull();

    expect(
      sessionStorage.getItem('postLoginRedirect')
    ).toBe('/courses?status=open');
  });

  test('never sends expired credentials after a 401 cleanup', async () => {
    localStorage.setItem('token', 'expired-token');

    global.fetch.mockResolvedValueOnce({
      status: 401,
      ok: false
    });

    await expect(
      authenticatedFetch('/api/v1/favorites')
    ).rejects.toBeInstanceOf(SessionExpiredError);

    global.fetch.mockClear();

    await expect(
      authenticatedFetch('/api/v1/favorites')
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
