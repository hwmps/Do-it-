const DEFAULT_URL =
  "https://apis.data.go.kr/6260000/BgliCorsInfoService/getBgliCorsInfoList";

class PublicDataClient {
  constructor({
    httpClient,
    apiKey,
    baseUrl = DEFAULT_URL,
    timeoutMs = 3000
  }) {
    if (!httpClient || typeof httpClient.get !== "function") {
      throw new TypeError(
        "httpClient with get() is required"
      );
    }

    if (!apiKey) {
      throw new Error(
        "apiKey is required"
      );
    }

    this.httpClient = httpClient;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async fetchPage({
    pageNo = 1,
    numOfRows = 50
  } = {}) {
    const response = await this.httpClient.get(
      this.baseUrl,
      {
        params: {
          serviceKey: this.apiKey,
          pageNo,
          numOfRows,
          resultType: "json"
        },
        timeout: this.timeoutMs
      }
    );

    let items =
      response.data?.getBgliCorsInfoList
        ?.body?.items?.item ??
      response.data?.getBgliCorsInfoList
        ?.item ??
      response.data?.response
        ?.body?.items?.item ??
      [];

    if (!Array.isArray(items)) {
      items = items ? [items] : [];
    }

    return items;
  }
}

module.exports = {
  PublicDataClient
};
