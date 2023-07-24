import dateFnsformat from 'date-fns/intlFormat';
import dateFnsParseISO from 'date-fns/parseISO';
import numeral from 'numeral';

numeral.locale('en');

export const formatDateISO = (date: Date | string, timezone?: string): string | null =>
    date
        ? dateFnsformat(
              typeof date === 'string' ? dateFnsParseISO(date) : date,
              {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  timeZone: timezone?.replace(' ', '_'),
              },
              {locale: 'en-CA'},
          )
        : null;

export const formatDate = (date: Date | string, timezone?: string): string | null =>
    date
        ? dateFnsformat(
              typeof date === 'string' ? dateFnsParseISO(date) : date,
              {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  timeZone: timezone?.replace(' ', '_'),
              },
              {locale: 'en-US'},
          )
        : null;

export const formatTime = (date: Date | string, timezone?: string): string | null =>
    date
        ? dateFnsformat(
              typeof date === 'string' ? dateFnsParseISO(date) : date,
              {hour: '2-digit', minute: '2-digit', timeZone: timezone?.replace(' ', '_')},
              {locale: 'en-US'},
          )
        : null;

export const formatNumber = (value?: number): string | null => (value !== undefined ? numeral(value).format('0,000') : null);
