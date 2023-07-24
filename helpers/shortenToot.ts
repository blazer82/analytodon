export const shortenToot = (content: string, length = 95) => {
    const cleaned = content.replace(/<[^>]*>/g, '');
    return cleaned.length > length ? cleaned.substring(0, length - 1) + '…' : cleaned;
};
