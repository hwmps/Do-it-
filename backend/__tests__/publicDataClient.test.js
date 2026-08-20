const {
  PublicDataClient
} = require("../clients/publicDataClient");

describe("PublicDataClient", () => {
  test("fetches a configurable page from the Busan public-data API", async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          getBgliCorsInfoList: {
            body: {
              items: {
                item: [
                  { crsNm: "Python" }
                ]
              }
            }
          }
        }
      })
    };

    const client = new PublicDataClient({
      httpClient,
      apiKey: "encoded-key"
    });

    const records = await client.fetchPage({
      pageNo: 3,
      numOfRows: 100
    });

    expect(httpClient.get)
      .toHaveBeenCalledTimes(1);

    expect(httpClient.get)
      .toHaveBeenCalledWith(
        expect.stringContaining(
          "getBgliCorsInfoList"
        ),
        expect.objectContaining({
          params: expect.objectContaining({
            serviceKey: "encoded-key",
            pageNo: 3,
            numOfRows: 100,
            resultType: "json"
          }),
          timeout: 3000
        })
      );

    expect(records).toEqual([
      { crsNm: "Python" }
    ]);
  });

  test("supports alternate public-data response shapes", async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          response: {
            body: {
              items: {
                item: [
                  { crsNm: "AI" }
                ]
              }
            }
          }
        }
      })
    };

    const client = new PublicDataClient({
      httpClient,
      apiKey: "key"
    });

    await expect(
      client.fetchPage()
    ).resolves.toEqual([
      { crsNm: "AI" }
    ]);
  });

  test("wraps a single returned item in an array", async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          getBgliCorsInfoList: {
            item: {
              crsNm: "Web Development"
            }
          }
        }
      })
    };

    const client = new PublicDataClient({
      httpClient,
      apiKey: "key"
    });

    await expect(
      client.fetchPage()
    ).resolves.toEqual([
      { crsNm: "Web Development" }
    ]);
  });

  test("returns an empty array when no records are present", async () => {
    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: {}
      })
    };

    const client = new PublicDataClient({
      httpClient,
      apiKey: "key"
    });

    await expect(
      client.fetchPage()
    ).resolves.toEqual([]);
  });
});
