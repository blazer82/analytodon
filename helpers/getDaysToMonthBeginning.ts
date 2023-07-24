export const getDaysToMonthBeginning = (timezone: string, monthModifier = 0) => {
    const date = new Date(
        Intl.DateTimeFormat('en-ca', {
            timeZone: timezone.replace(' ', '_'),
        }).format(new Date()),
    );

    const start = new Date(date);
    start.setUTCDate(1);
    start.setUTCMonth(date.getUTCMonth() + monthModifier);

    var diff = date.getTime() - start.getTime();
    var oneDay = 1000 * 60 * 60 * 24;

    return Math.floor(diff / oneDay);
};
