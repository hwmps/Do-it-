import {
  searchCatalog,
  CatalogApiError
} from './catalogApi';

describe('catalogApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('builds a catalog search request with active filters only', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        count: 1,
        data: [
          {
            sourceId: 'daegu-1',
            titleKo: '대구 파이썬'
          }
        ],
        nextCursor: 'cursor-1'
      })
    });

    const result =
      await searchCatalog({
        query: '파이썬',
        status: '전체',
        target: '성인',
        region: 'Daegu',
        limit: 50
      });

    expect(global.fetch)
      .toHaveBeenCalledTimes(1);

    const requestedUrl =
      new URL(
        global.fetch.mock.calls[0][0]
      );

    expect(
      requestedUrl.pathname
    ).toBe(
      '/api/v1/catalog/search'
    );

    expect(
      requestedUrl.searchParams.get(
        'query'
      )
    ).toBe('파이썬');

    expect(
      requestedUrl.searchParams.has(
        'status'
      )
    ).toBe(false);

    expect(
      requestedUrl.searchParams.get(
        'target'
      )
    ).toBe('성인');

    expect(
      requestedUrl.searchParams.get(
        'region'
      )
    ).toBe('Daegu');

    expect(
      requestedUrl.searchParams.get(
        'limit'
      )
    ).toBe('50');

    expect(result)
      .toEqual({
        items: [
          {
            sourceId: 'daegu-1',
            titleKo: '대구 파이썬'
          }
        ],
        count: 1,
        nextCursor: 'cursor-1'
      });
  });

  test('passes pagination cursor to the backend', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        count: 0,
        data: [],
        nextCursor: null
      })
    });

    await searchCatalog({
      cursor: 'next-page-token'
    });

    const requestedUrl =
      new URL(
        global.fetch.mock.calls[0][0]
      );

    expect(
      requestedUrl.searchParams.get(
        'cursor'
      )
    ).toBe(
      'next-page-token'
    );
  });

  test('throws a typed error when the backend fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        status: 'error',
        code: 'CATALOG_UNAVAILABLE',
        message: 'Catalog unavailable'
      })
    });

    await expect(
      searchCatalog({
        region: 'Daegu'
      })
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'CatalogApiError',
        status: 503,
        code:
          'CATALOG_UNAVAILABLE'
      })
    );

    await expect(
      Promise.reject(
        new CatalogApiError(
          'test'
        )
      )
    ).rejects.toBeInstanceOf(
      CatalogApiError
    );
  });

  test('rejects malformed success responses', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: null
      })
    });

    await expect(
      searchCatalog()
    ).rejects.toBeInstanceOf(
      CatalogApiError
    );
  });

  test('passes AbortSignal to fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        count: 0,
        data: [],
        nextCursor: null
      })
    });

    const controller = new AbortController();

    await searchCatalog({
      signal: controller.signal
    });

    expect(global.fetch.mock.calls[0][1]).toEqual({
      signal: controller.signal
    });
  });
});
