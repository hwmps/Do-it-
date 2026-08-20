const {
  validateCanonicalCourse
} = require("../domain/canonicalCourse");

class CourseSourceRegistry {
  constructor(adapters = {}) {
    this.adapters = new Map();

    for (const [source, adapter] of
      Object.entries(adapters)) {
      if (
        !adapter ||
        typeof adapter.normalize !== "function"
      ) {
        throw new TypeError(
          `adapter for ${source} must provide normalize()`
        );
      }

      this.adapters.set(
        source,
        adapter
      );
    }
  }

  normalize(source, raw) {
    const adapter =
      this.adapters.get(source);

    if (!adapter) {
      throw new Error(
        `unknown course source: ${source}`
      );
    }

    const course =
      adapter.normalize(raw);

    return validateCanonicalCourse(
      course
    );
  }
}

module.exports = {
  CourseSourceRegistry
};
