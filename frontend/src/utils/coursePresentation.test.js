
import {
  getCourseLifecycle,
  formatCoursePeriod,
  compareCoursesByLifecycle,
  getCourseSourceLabel
} from './coursePresentation';

describe('coursePresentation', () => {
  const now =
    new Date('2026-08-23T00:00:00+09:00');

  test('classifies an active course as current', () => {
    expect(
      getCourseLifecycle(
        {
          startAt: '2026-08-01',
          endAt: '2026-08-31'
        },
        now
      )
    ).toBe('current');
  });

  test('classifies a future course as upcoming', () => {
    expect(
      getCourseLifecycle(
        {
          startAt: '2026-09-10',
          endAt: '2026-10-10'
        },
        now
      )
    ).toBe('upcoming');
  });

  test('classifies an ended course as past', () => {
    expect(
      getCourseLifecycle(
        {
          startAt: '2026-06-01',
          endAt: '2026-07-01'
        },
        now
      )
    ).toBe('past');
  });

  test('returns unknown when dates are unavailable', () => {
    expect(
      getCourseLifecycle(
        {
          startAt: null,
          endAt: null
        },
        now
      )
    ).toBe('unknown');
  });

  test('formats a normalized course period', () => {
    expect(
      formatCoursePeriod({
        startAt: '2026-09-01',
        endAt: '2026-11-30'
      })
    ).toBe(
      '2026.09.01 ~ 2026.11.30'
    );
  });

  test('does not invent missing dates', () => {
    expect(
      formatCoursePeriod({
        startAt: null,
        endAt: null
      })
    ).toBe('');
  });

  test('sorts current before upcoming before past before unknown', () => {
    const courses = [
      {
        id: 'unknown',
        startAt: null,
        endAt: null
      },
      {
        id: 'past',
        startAt: '2026-06-01',
        endAt: '2026-07-01'
      },
      {
        id: 'upcoming',
        startAt: '2026-09-01',
        endAt: '2026-10-01'
      },
      {
        id: 'current',
        startAt: '2026-08-01',
        endAt: '2026-08-31'
      }
    ];

    const sorted =
      [...courses].sort(
        (a, b) =>
          compareCoursesByLifecycle(
            a,
            b,
            now
          )
      );

    expect(
      sorted.map(
        (course) => course.id
      )
    ).toEqual([
      'current',
      'upcoming',
      'past',
      'unknown'
    ]);
  });

  test('creates readable source labels', () => {
    expect(
      getCourseSourceLabel({
        source:
          'busan-public-data',
        region: 'Busan'
      })
    ).toBe('Busan Public Data');

    expect(
      getCourseSourceLabel({
        source:
          'daegu-lifelong-learning',
        region: 'Daegu'
      })
    ).toBe(
      'Daegu Lifelong Learning'
    );
  });
});
