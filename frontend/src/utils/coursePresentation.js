function parseDate(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return null;
  }

  const normalized =
    value.trim();

  const dateOnly =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (dateOnly) {
    const [
      ,
      year,
      month,
      day
    ] = dateOnly;

    const parsed =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

    return Number.isNaN(
      parsed.getTime()
    )
      ? null
      : parsed;
  }

  const parsed =
    new Date(normalized);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}

function startOfDay(date) {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function endOfDay(date) {
  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}

export function getCourseLifecycle(
  course,
  now = new Date()
) {
  const start =
    parseDate(
      course?.startAt
    );

  const end =
    parseDate(
      course?.endAt
    );

  if (!start && !end) {
    return 'unknown';
  }

  const current =
    new Date(now);

  if (
    Number.isNaN(
      current.getTime()
    )
  ) {
    return 'unknown';
  }

  if (
    start &&
    current <
      startOfDay(start)
  ) {
    return 'upcoming';
  }

  if (
    end &&
    current >
      endOfDay(end)
  ) {
    return 'past';
  }

  return 'current';
}

function formatDate(value) {
  const date =
    parseDate(value);

  if (!date) {
    return '';
  }

  const year =
    String(
      date.getFullYear()
    );

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}.${month}.${day}`;
}

export function formatCoursePeriod(
  course
) {
  const start =
    formatDate(
      course?.startAt
    );

  const end =
    formatDate(
      course?.endAt
    );

  if (start && end) {
    return `${start} ~ ${end}`;
  }

  return start || end || '';
}

const LIFECYCLE_PRIORITY = {
  current: 0,
  upcoming: 1,
  past: 2,
  unknown: 3
};

export function compareCoursesByLifecycle(
  left,
  right,
  now = new Date()
) {
  const leftLifecycle =
    getCourseLifecycle(
      left,
      now
    );

  const rightLifecycle =
    getCourseLifecycle(
      right,
      now
    );

  const lifecycleDifference =
    LIFECYCLE_PRIORITY[
      leftLifecycle
    ] -
    LIFECYCLE_PRIORITY[
      rightLifecycle
    ];

  if (
    lifecycleDifference !== 0
  ) {
    return lifecycleDifference;
  }

  const leftStart =
    parseDate(
      left?.startAt
    );

  const rightStart =
    parseDate(
      right?.startAt
    );

  if (
    leftStart &&
    rightStart
  ) {
    const timeDifference =
      leftStart.getTime() -
      rightStart.getTime();

    if (
      timeDifference !== 0
    ) {
      return timeDifference;
    }
  }

  return String(
    left?.sourceId ||
    left?.id ||
    ''
  ).localeCompare(
    String(
      right?.sourceId ||
      right?.id ||
      ''
    )
  );
}

export function getCourseSourceLabel(
  course
) {
  switch (course?.source) {
    case 'busan-public-data':
      return 'Busan Public Data';

    case 'daegu-lifelong-learning':
      return 'Daegu Lifelong Learning';

    default:
      return (
        course?.region ||
        'Public Data'
      );
  }
}
