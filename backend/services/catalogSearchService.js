const {
  applyCourseSearch
} = require("../utils/courseSearch");

const {
  presentCatalogCourse
} = require("../utils/catalogCoursePresenter");

function hasActiveFilters({
  query,
  status,
  target,
  region,
  nearbyRequested
}) {
  const hasQuery =
    typeof query === "string" &&
    query.trim().length > 0;

  const hasStatus =
    Boolean(status) &&
    status !== "전체";

  const hasTarget =
    Boolean(target) &&
    target !== "전체";

  const hasRegion =
    typeof region === "string" &&
    region.trim().length > 0;

  return (
    hasQuery ||
    hasStatus ||
    hasTarget ||
    hasRegion ||
    nearbyRequested
  );
}

class CatalogSearchService {
  constructor({
    repository,
    maxSearchPages = 10
  }) {
    if (
      !repository ||
      typeof repository.listPage !== "function"
    ) {
      throw new TypeError(
        "repository with listPage() is required"
      );
    }

    if (
      !Number.isInteger(maxSearchPages) ||
      maxSearchPages <= 0
    ) {
      throw new TypeError(
        "maxSearchPages must be a positive integer"
      );
    }

    this.repository = repository;
    this.maxSearchPages =
      maxSearchPages;
  }

  async searchPage({
    query,
    status,
    target,
    region,
    nearbyRequested = false,
    lat,
    lng,
    radiusKm,
    limit = 50,
    startKey
  } = {}) {
    const filters = {
      query,
      status,
      target,
      region,
      nearbyRequested,
      lat,
      lng,
      radiusKm
    };

    const shouldScanAhead =
      hasActiveFilters(filters);

    if (!shouldScanAhead) {
      const {
        items,
        nextKey
      } =
        await this.repository.listPage({
          limit,
          startKey
        });

      return {
        items:
          items.map(
            presentCatalogCourse
          ),
        nextKey
      };
    }

    const collected = [];

    let currentStartKey =
      startKey;

    let nextKey;
    let pagesRead = 0;

    while (
      pagesRead <
        this.maxSearchPages &&
      collected.length < limit
    ) {
      const remaining =
        Math.max(
          1,
          limit -
            collected.length
        );

      const page =
        await this.repository.listPage({
          limit: remaining,
          startKey:
            currentStartKey
        });

      pagesRead += 1;

      const presentedCourses =
        page.items.map(
          presentCatalogCourse
        );

      let filteredCourses =
        applyCourseSearch(
          presentedCourses,
          filters
        );

      if (
        typeof region === "string" &&
        region.trim()
      ) {
        const expectedRegion =
          region.trim().toLowerCase();

        filteredCourses =
          filteredCourses.filter(
            (course) =>
              typeof course.region === "string" &&
              course.region.toLowerCase() ===
                expectedRegion
          );
      }

      collected.push(
        ...filteredCourses
      );

      nextKey =
        page.nextKey;

      if (!nextKey) {
        break;
      }

      currentStartKey =
        nextKey;
    }

    return {
      items:
        collected.slice(
          0,
          limit
        ),
      nextKey
    };
  }
}

module.exports = {
  CatalogSearchService
};
