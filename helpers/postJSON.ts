import request from '@/helpers/request';

const postJSON = (url: string, data: {[key: string]: any}) =>
    request({
        url,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        data,
        validateStatus: () => true,
    });

export default postJSON;
