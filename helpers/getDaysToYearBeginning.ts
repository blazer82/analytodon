export const getDaysToYearBeginning = (timezone: string, yearModifier = 0) => {
    const date = new Date(
        Intl.DateTimeFormat('en-ca', {
            timeZone: timezone.replace(' ', '_'),
        }).format(new Date()),
    );

    var start = new Date(`${date.getFullYear() + yearModifier}-01-01`);
    var diff = date.getTime() - start.getTime();
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};
