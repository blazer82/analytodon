import jwt from 'jsonwebtoken';
import getConfig from 'next/config';
import refreshUser from '@/service/authentication/refreshUser';
import {NextApiRequest} from 'next';
import {User} from '../types/User';

const {serverRuntimeConfig} = getConfig();

type GetAuthInfoFromRequest = (req: NextApiRequest, forceRefresh?: boolean) => Promise<{user?: User; token?: string; refreshToken?: string}>;
const getAuthInfoFromRequest: GetAuthInfoFromRequest = async ({cookies, headers}, forceRefresh = false) => {
    const token = headers['authorization']?.split(' ')[1] ?? cookies.token ?? '';
    try {
        if (forceRefresh) {
            throw new Error();
        }

        const {
            _id,
            role,
            email,
            emailVerified = false,
            accounts = null,
            maxAccounts = null,
            serverURLOnSignUp = null,
            timezone = null,
        } = (await jwt.verify(token, serverRuntimeConfig.jwtSecret)) as Partial<User>;
        return {
            user: {
                _id,
                role,
                email,
                emailVerified,
                accounts,
                maxAccounts,
                serverURLOnSignUp,
                timezone,
            } as User,
            token,
        };
    } catch (error: any) {
        if (!headers['authorization'] && cookies.refreshToken) {
            const response = await refreshUser(cookies.refreshToken);
            if (response === null) {
                return {};
            }
            const {
                _id,
                role,
                email,
                emailVerified = false,
                accounts = null,
                maxAccounts = null,
                serverURLOnSignUp = null,
                timezone = null,
            } = jwt.decode(response.token) as Partial<User>;
            return {
                user: {
                    _id,
                    role,
                    email,
                    emailVerified,
                    accounts,
                    maxAccounts,
                    serverURLOnSignUp,
                    timezone,
                } as User,
                ...response,
            };
        } else {
            console.warn(error?.message);
            return {};
        }
    }
};

export default getAuthInfoFromRequest;
