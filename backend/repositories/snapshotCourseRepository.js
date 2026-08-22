function boundedLimit(
  value,
  {
    defaultLimit = 50,
    maxLimit = 100
  } = {}
) {
  const parsed =
    Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return defaultLimit;
  }

  return Math.min(
    parsed,
    maxLimit
  );
}

class SnapshotCourseRepository {
  constructor({
    courses
  }) {
    if (!Array.isArray(courses)) {
      throw new TypeError(
        "courses must be an array"
      );
    }

    const seenSourceIds =
      new Set();

    for (const course of courses) {
      if (
        !course ||
        typeof course.sourceId !==
          "string" ||
        !course.sourceId.trim()
      ) {
        throw new Error(
          "course sourceId is required"
        );
      }

      if (
        seenSourceIds.has(
          course.sourceId
        )
      ) {
        throw new Error(
          `duplicate sourceId: ${course.sourceId}`
        );
      }

      seenSourceIds.add(
        course.sourceId
      );
    }

    this.courses =
      [...courses];

    this.indexBySourceId =
      new Map(
        this.courses.map(
          (course, index) => [
            course.sourceId,
            index
          ]
        )
      );
  }

  async listPage({
    limit = 50,
    startKey
  } = {}) {
    const safeLimit =
      boundedLimit(limit);

    let startIndex = 0;

    if (
      startKey &&
      typeof startKey.sourceId ===
        "string"
    ) {
      const cursorIndex =
        this.indexBySourceId.get(
          startKey.sourceId
        );

      if (
        Number.isInteger(
          cursorIndex
        )
      ) {
        startIndex =
          cursorIndex + 1;
      }
    }

    const items =
      this.courses.slice(
        startIndex,
        startIndex +
          safeLimit
      );

    const hasMore =
      startIndex +
        items.length <
      this.courses.length;

    const lastItem =
      items[
        items.length - 1
      ];

    return {
      items,

      nextKey:
        hasMore &&
        lastItem
          ? {
              sourceId:
                lastItem.sourceId
            }
          : undefined
    };
  }
}

module.exports = {
  SnapshotCourseRepository
};
