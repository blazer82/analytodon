import { expect } from 'chai';

import { getDateInTimezone } from '../../src/helpers/getDateInTimezone';

describe('getDateInTimezone', () => {
  const cases: [string, string, string][] = [
    ['Asia/Kolkata', '2023-05-15T12:00:00Z', '2023-05-14T18:30:00.000Z'], // UTC+5:30
    ['Asia/Kathmandu', '2023-05-15T12:00:00Z', '2023-05-14T18:15:00.000Z'], // UTC+5:45
    ['Australia/Adelaide', '2023-01-10T12:00:00Z', '2023-01-09T13:30:00.000Z'], // ACDT, UTC+10:30
    ['Australia/Adelaide', '2023-07-10T12:00:00Z', '2023-07-09T14:30:00.000Z'], // ACST, UTC+9:30
    ['America/St_Johns', '2023-01-10T12:00:00Z', '2023-01-10T03:30:00.000Z'], // NST, UTC-3:30
    ['Europe/Berlin', '2023-05-15T12:00:00Z', '2023-05-14T22:00:00.000Z'], // CEST, UTC+2
    ['UTC', '2023-05-15T12:00:00Z', '2023-05-15T00:00:00.000Z'],
  ];

  for (const [timezone, reference, expected] of cases) {
    it(`returns local midnight in ${timezone} for ${reference}`, () => {
      expect(getDateInTimezone(new Date(reference), timezone).toISOString()).to.equal(expected);
    });
  }
});
