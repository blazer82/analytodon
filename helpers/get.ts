import request from '@/helpers/request';

const get = (url: string) =>
    request({
        url,
        method: 'GET',
        validateStatus: () => true,
    });

export default get;
