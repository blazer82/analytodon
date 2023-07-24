import request from '@/helpers/request';

const deleteJSON = (url: string, data: {[key: string]: any}) =>
    request({
        url,
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        data,
        validateStatus: () => true,
    });

export default deleteJSON;
