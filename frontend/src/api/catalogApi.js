import {
  API_BASE_URL
} from './apiClient';

export class CatalogApiError extends Error {
  constructor(
    message,
    {
      status = null,
      code = 'CATALOG_REQUEST_FAILED'
    } = {}
  ) {
    super(message);

    this.name =
      'CatalogApiError';

    this.status =
      status;

    this.code =
      code;
  }
}

function addIfPresent(
  params,
  key,
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    return;
  }

  if (
    normalized === '전체' ||
    normalized === 'All'
  ) {
    return;
  }

  params.set(
    key,
    normalized
  );
}

async function readJsonSafely(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function searchCatalog({
  query,
  status,
  target,
  region,
  limit = 50,
  cursor
} = {}) {
  const params =
    new URLSearchParams();

  addIfPresent(
    params,
    'query',
    query
  );

  addIfPresent(
    params,
    'status',
    status
  );

  addIfPresent(
    params,
    'target',
    target
  );

  addIfPresent(
    params,
    'region',
    region
  );

  addIfPresent(
    params,
    'limit',
    limit
  );

  addIfPresent(
    params,
    'cursor',
    cursor
  );

  const response =
    await fetch(
      `${API_BASE_URL}/api/v1/catalog/search?${params.toString()}`
    );

  const body =
    await readJsonSafely(
      response
    );

  if (!response.ok) {
    throw new CatalogApiError(
      body?.message ||
        'Catalog request failed',
      {
        status:
          response.status,

        code:
          body?.code ||
          'CATALOG_REQUEST_FAILED'
      }
    );
  }

  if (
    !body ||
    body.status !== 'success' ||
    !Array.isArray(
      body.data
    )
  ) {
    throw new CatalogApiError(
      'Invalid catalog response',
      {
        status:
          response.status,

        code:
          'INVALID_CATALOG_RESPONSE'
      }
    );
  }

  return {
    items:
      body.data,

    count:
      Number.isFinite(
        body.count
      )
        ? body.count
        : body.data.length,

    nextCursor:
      body.nextCursor ||
      null
  };
}
