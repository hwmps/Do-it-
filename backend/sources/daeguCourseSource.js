class DaeguCourseSource {
  constructor({
    publicDataClient,
    registry
  }) {
    if (
      !publicDataClient ||
      typeof publicDataClient.fetchPage !== "function"
    ) {
      throw new TypeError(
        "publicDataClient with fetchPage() is required"
      );
    }

    if (
      !registry ||
      typeof registry.normalize !== "function"
    ) {
      throw new TypeError(
        "registry with normalize() is required"
      );
    }

    this.publicDataClient =
      publicDataClient;

    this.registry =
      registry;
  }

  async fetchPage(options) {
    return this.publicDataClient
      .fetchPage(options);
  }

  normalize(raw) {
    return this.registry.normalize(
      "daegu",
      raw
    );
  }
}

module.exports = {
  DaeguCourseSource
};
