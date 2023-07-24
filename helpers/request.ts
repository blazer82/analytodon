import axios, {AxiosResponse, AxiosRequestConfig} from 'axios';

type Request = (config: AxiosRequestConfig) => Promise<AxiosResponse>;
const request: Request = async (config) => {
    const response = await axios(config);

    if (response.status === 401) {
        const refreshResponse = (await axios({
            url: '/api/user/refresh',
            method: 'GET',
            validateStatus: () => true,
        })) as AxiosResponse<{token: string; refreshToken: string}>;

        if (refreshResponse.status === 200) {
            return await axios(config);
        }
    }

    return response;
};

export default request;
