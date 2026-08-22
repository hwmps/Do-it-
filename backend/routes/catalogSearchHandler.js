function parseLimit(value) {
  const parsed =
    Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return 50;
  }

  return Math.min(
    parsed,
    100
  );
}

function encodeCursor(key) {
  if (!key) {
    return null;
  }

  return Buffer
    .from(
      JSON.stringify(key)
    )
    .toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) {
    return undefined;
  }

  try {
    const decoded =
      JSON.parse(
        Buffer
          .from(
            cursor,
            "base64url"
          )
          .toString("utf8")
      );

    if (
      !decoded ||
      typeof decoded !== "object" ||
      Array.isArray(decoded) ||
      typeof decoded.sourceId !== "string" ||
      !decoded.sourceId.trim()
    ) {
      throw new Error(
        "invalid cursor"
      );
    }

    return {
      sourceId:
        decoded.sourceId
    };
  } catch {
    throw new Error(
      "INVALID_CURSOR"
    );
  }
}

function createCatalogSearchHandler({
  service
}) {
  if (
    !service ||
    typeof service.searchPage !==
      "function"
  ) {
    throw new TypeError(
      "service with searchPage() is required"
    );
  }

  return async function catalogSearchHandler(
    req,
    res
  ) {
    const {
      query,
      status,
      target,
      region,
      cursor,
      limit
    } = req.query || {};

    let startKey;

    try {
      startKey =
        decodeCursor(cursor);
    } catch {
      return res
        .status(400)
        .json({
          status: "error",
          code: "INVALID_CURSOR",
          message:
            "cursor is invalid"
        });
    }

    const result =
      await service.searchPage({
        query,
        status,
        target,
        region,
        limit:
          parseLimit(limit),
        startKey
      });

    return res.json({
      status: "success",
      count:
        result.items.length,
      data:
        result.items,
      nextCursor:
        encodeCursor(
          result.nextKey
        )
    });
  };
}

module.exports = {
  createCatalogSearchHandler
};
