const {
  DaeguPublicDataClient
} = require("../clients/daeguPublicDataClient");

describe("DaeguPublicDataClient", () => {
  test("fetches and parses a page of Daegu XML records", async () => {
    const xml = `
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL_SERVICE</resultMsg>
        </header>
        <body>
          <pageNo>1</pageNo>
          <numOfRows>2</numOfRows>
          <totalCount>3775</totalCount>
          <items>
            <item>
              <lec_id>LEARNING_00090738</lec_id>
              <lec_title>북바인딩 클래스</lec_title>
              <impl_start_dt>2026.04.22</impl_start_dt>
              <impl_finish_dt>2026.04.23</impl_finish_dt>
              <impl_place>칠금평생교육원</impl_place>
            </item>
            <item>
              <lec_id>LEARNING_00090739</lec_id>
              <lec_title>컴퓨터 기초</lec_title>
              <impl_start_dt>2026.08.12</impl_start_dt>
              <impl_finish_dt>2026.09.04</impl_finish_dt>
              <impl_place>칠금평생교육원 3층</impl_place>
            </item>
          </items>
        </body>
      </response>
    `;

    const httpClient = {
      get: jest.fn().mockResolvedValue({
        data: xml
      })
    };

    const client =
      new DaeguPublicDataClient({
        httpClient,
        apiKey: "test-key"
      });

    const records =
      await client.fetchPage({
        pageNo: 1,
        numOfRows: 2
      });

    expect(records).toHaveLength(2);

    expect(records[0]).toEqual(
      expect.objectContaining({
        lec_id: "LEARNING_00090738",
        lec_title: "북바인딩 클래스",
        impl_place: "칠금평생교육원"
      })
    );

    expect(httpClient.get)
      .toHaveBeenCalledWith(
        expect.stringContaining(
          "lectureServiceV3/lectureListV3"
        ),
        expect.objectContaining({
          params: {
            ServiceKey: "test-key",
            pageNo: 1,
            numOfRows: 2
          }
        })
      );
  });

  test("returns one XML item as an array", async () => {
    const xml = `
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL_SERVICE</resultMsg>
        </header>
        <body>
          <items>
            <item>
              <lec_id>LEARNING_1</lec_id>
              <lec_title>단일 강좌</lec_title>
            </item>
          </items>
        </body>
      </response>
    `;

    const client =
      new DaeguPublicDataClient({
        apiKey: "test-key",
        httpClient: {
          get: jest.fn().mockResolvedValue({
            data: xml
          })
        }
      });

    const records =
      await client.fetchPage({
        pageNo: 1,
        numOfRows: 1
      });

    expect(records).toEqual([
      expect.objectContaining({
        lec_id: "LEARNING_1",
        lec_title: "단일 강좌"
      })
    ]);
  });

  test("returns an empty array when the page has no items", async () => {
    const xml = `
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL_SERVICE</resultMsg>
        </header>
        <body>
          <items></items>
        </body>
      </response>
    `;

    const client =
      new DaeguPublicDataClient({
        apiKey: "test-key",
        httpClient: {
          get: jest.fn().mockResolvedValue({
            data: xml
          })
        }
      });

    const records =
      await client.fetchPage({
        pageNo: 99,
        numOfRows: 50
      });

    expect(records).toEqual([]);
  });

  test("rejects an upstream XML error response", async () => {
    const xml = `
      <response>
        <header>
          <resultCode>30</resultCode>
          <resultMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMsg>
        </header>
        <body></body>
      </response>
    `;

    const client =
      new DaeguPublicDataClient({
        apiKey: "test-key",
        httpClient: {
          get: jest.fn().mockResolvedValue({
            data: xml
          })
        }
      });

    await expect(
      client.fetchPage({
        pageNo: 1,
        numOfRows: 10
      })
    ).rejects.toThrow(
      "SERVICE_KEY_IS_NOT_REGISTERED_ERROR"
    );
  });
});
