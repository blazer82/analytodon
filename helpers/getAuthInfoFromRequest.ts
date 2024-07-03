import jwt from 'jsonwebtoken';
import getConfig from 'next/config';
import refreshUser from '@/service/authentication/refreshUser';
import {NextApiRequest} from 'next';
import {JwtUser} from '../types/User';

const {serverRuntimeConfig} = getConfig();

type GetAuthInfoFromRequest = (req: NextApiRequest, forceRefresh?: boolean) => Promise<{user?: JwtUser; token?: string; refreshToken?: string}>;
const getAuthInfoFromRequest: GetAuthInfoFromRequest = async ({cookies, headers}, forceRefresh = false) => {
    const token = headers['authorization']?.split(' ')[1] ?? cookies.token ?? '';
    try {
        if (forceRefresh) {
            throw new Error();
        }

        const {_id, role} = (await jwt.verify(token, serverRuntimeConfig.jwtSecret)) as JwtUser;
        return {
            user: {
                _id,
                role,
            } as JwtUser,
            token,
        };
    } catch (error: any) {
        if (!headers['authorization'] && cookies.refreshToken) {
            const response = await refreshUser(cookies.refreshToken);
            if (response === null) {
                return {};
            }
            const {_id, role} = jwt.decode(response.token) as JwtUser;
            return {
                ...response,
                user: {
                    _id,
                    role,
                } as JwtUser,
            };
        } else {
            console.warn(error?.message);
            return {};
        }
    }
};

export default getAuthInfoFromRequest;
