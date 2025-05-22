import { logger } from './logger';
import { timezones } from './timezones';

export const getTimezones = (hoursPassedInDay: number[]) => {
  return hoursPassedInDay
    .map((hours) => {
      const matches = [];
      for (const { name } of timezones) {
        try {
          const hour = parseInt(
            // use de-DE to get 24 hour format
            new Intl.DateTimeFormat('de-DE', {
              hour: 'numeric',
              timeZone: name.replace(' ', '_'),
            }).format(new Date()),
          );
          if (hours === hour) {
            matches.push(name);
          }
        } catch (_error: unknown) {
          logger.warn(`getTimezones: Timezone not supported: ${name}`);
        }
      }
      return matches;
    })
    .flat();
};
