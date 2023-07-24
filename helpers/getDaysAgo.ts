import {findTimeZone, getUTCOffset} from 'timezone-support';

export const getDaysAgo = (days: number, timezone: string) => {
    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() - days);

    const date = new Date(
        Intl.DateTimeFormat('en-ca', {
            timeZone: timezone.replace(' ', '_'),
        }).format(referenceDate),
    );

    const {offset} = getUTCOffset(date, findTimeZone(timezone.replace(' ', '_')));

    const offsetHours = Math.floor(offset / 60);
    const offsetMinutes = offset % 60;

    date.setUTCHours(offsetHours);
    date.setUTCMinutes(offsetMinutes);
    return date;
};
