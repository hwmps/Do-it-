const {
  XMLParser
} = require("fast-xml-parser");

const ENDPOINT =
  "https://apis.data.go.kr/6270000/lectureServiceV3/lectureListV3";

class DaeguPublicDataClient {
  constructor({
    httpClient,
    apiKey
  }) {
    if (
      !httpClient ||
      typeof httpClient.get !== "function"
    ) {
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

    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true
    });
  }

  async fetchPage({
    pageNo = 1,
    numOfRows = 50
  } = {}) {
    const response =
      await this.httpClient.get(
        ENDPOINT,
        {
          params: {
            ServiceKey: this.apiKey,
            pageNo,
            numOfRows
          },
          responseType: "text",
          timeout: 3000
        }
      );

    const parsed =
      this.parser.parse(
        response.data
      );

    const gatewayError =
      parsed?.OpenAPI_ServiceResponse
        ?.cmmMsgHeader;

    if (gatewayError) {
      const message =
        gatewayError.errMsg ||
        gatewayError.returnAuthMsg ||
        "Daegu public data API error";

      throw new Error(message);
    }

    const apiResponse =
      parsed?.response;

    if (!apiResponse) {
      throw new Error(
        "invalid Daegu public data response"
      );
    }

    const header =
      apiResponse.header || {};

    if (
      header.resultCode &&
      header.resultCode !== "00"
    ) {
      throw new Error(
        header.resultMsg ||
        `Daegu API error: ${header.resultCode}`
      );
    }

    const item =
      apiResponse.body
        ?.items
        ?.item;

    if (!item) {
      return [];
    }

    return Array.isArray(item)
      ? item
      : [item];
  }
}

module.exports = {
  DaeguPublicDataClient
};
