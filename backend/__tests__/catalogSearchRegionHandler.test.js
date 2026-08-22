const {
  createCatalogSearchHandler
} = require("../routes/catalogSearchHandler");

describe("catalog search region HTTP filter", () => {
  test("passes region to the catalog search service", async () => {
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
        region: "Daegu",
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
        region: "Daegu",
        limit: 50
      })
    );
  });
});
