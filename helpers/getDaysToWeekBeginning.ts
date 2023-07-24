export const getDaysToWeekBeginning = (timezone: string, weekModifier = 0) => {
    const date = new Date(
        Intl.DateTimeFormat('en-ca', {
            timeZone: timezone.replace(' ', '_'),
        }).format(new Date()),
    );

    return ((7 + date.getDay() - 1) % 7) - 7 * weekModifier;
};
