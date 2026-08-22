const {
  createCatalogSearchHandler
} = require("../routes/catalogSearchHandler");

describe("catalog search HTTP handler", () => {
  test("returns catalog courses with an opaque next cursor", async () => {
    const service = {
      searchPage: jest.fn()
        .mockResolvedValue({
          items: [
            {
              sourceId: "daegu-1",
              titleKo: "대구 컴퓨터 기초",
              locationKo: "대구 평생학습관"
            }
          ],
          nextKey: {
            sourceId: "next-course"
          }
        })
    };

    const handler =
      createCatalogSearchHandler({
        service
      });

    const req = {
      query: {
        limit: "50"
      }
    };

    const res = {
      status: jest.fn()
        .mockReturnThis(),

      json: jest.fn()
        .mockReturnThis()
    };

    await handler(req, res);

    expect(
      service.searchPage
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        startKey: undefined
      })
    );

    expect(res.json)
      .toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          count: 1,
          data: [
            expect.objectContaining({
              sourceId: "daegu-1",
              titleKo: "대구 컴퓨터 기초"
            })
          ],
          nextCursor:
            expect.any(String)
        })
      );

    const payload =
      res.json.mock.calls[0][0];

    expect(payload.nextCursor)
      .not.toContain(
        "next-course"
      );
  });

  test("decodes a cursor before calling the service", async () => {
    const service = {
      searchPage: jest.fn()
        .mockResolvedValue({
          items: [],
          nextKey: undefined
        })
    };

    const handler =
      createCatalogSearchHandler({
        service
      });

    const cursor =
      Buffer
        .from(
          JSON.stringify({
            sourceId:
              "previous-course"
          })
        )
        .toString("base64url");

    const req = {
      query: {
        cursor,
        limit: "25"
      }
    };

    const res = {
      status: jest.fn()
        .mockReturnThis(),

      json: jest.fn()
        .mockReturnThis()
    };

    await handler(req, res);

    expect(
      service.searchPage
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 25,
        startKey: {
          sourceId:
            "previous-course"
        }
      })
    );
  });

  test("rejects an invalid cursor", async () => {
    const service = {
      searchPage: jest.fn()
    };

    const handler =
      createCatalogSearchHandler({
        service
      });

    const req = {
      query: {
        cursor:
          "not-a-valid-cursor"
      }
    };

    const res = {
      status: jest.fn()
        .mockReturnThis(),

      json: jest.fn()
        .mockReturnThis()
    };

    await handler(req, res);

    expect(res.status)
      .toHaveBeenCalledWith(400);

    expect(res.json)
      .toHaveBeenCalledWith({
        status: "error",
        code: "INVALID_CURSOR",
        message:
          "cursor is invalid"
      });

    expect(
      service.searchPage
    ).not.toHaveBeenCalled();
  });

  test("passes search filters to the catalog service", async () => {
    const service = {
      searchPage: jest.fn()
        .mockResolvedValue({
          items: [],
          nextKey: undefined
        })
    };

    const handler =
      createCatalogSearchHandler({
        service
      });

    const req = {
      query: {
        query: "대구",
        status: "접수중",
        target: "성인",
        limit: "50"
      }
    };

    const res = {
      status: jest.fn()
        .mockReturnThis(),

      json: jest.fn()
        .mockReturnThis()
    };

    await handler(req, res);

    expect(
      service.searchPage
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "대구",
        status: "접수중",
        target: "성인",
        limit: 50
      })
    );
  });
});
