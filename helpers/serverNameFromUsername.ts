export const serverNameFromUsername = (username: string) => {
    const parts = username.split('@');
    if (parts.length > 0) {
        return parts[parts.length - 1];
    }
    return '';
};
