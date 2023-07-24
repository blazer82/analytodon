import {NextApiRequest, NextApiResponse} from 'next';
import {Store} from 'redux';
import {serialize} from 'cookie';
import getAuthInfoFromRequest from '@/helpers/getAuthInfoFromRequest';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {loginSuccessful} from '@/redux/auth/slice';

type HandleAuthentication = (
    roles: UserRole[],
    type: AuthResponseType,
    {store, req, res, forceRefresh}: {store?: Store; req: NextApiRequest; res: NextApiResponse; forceRefresh?: boolean},
) => Promise<{id?: string; role?: string; token?: string}>;

const handleAuthentication: HandleAuthentication = async (roles, type, {store, req, res, forceRefresh = false}) => {
    const {user, token, refreshToken} = await getAuthInfoFromRequest(req as NextApiRequest, forceRefresh);

    if (refreshToken && token) {
        res.setHeader('Set-Cookie', [
            serialize('token', token, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
            serialize('refreshToken', refreshToken, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
        ]);
    }

    if (!user || !roles.map((role) => role.toString()).includes(user.role)) {
        switch (type) {
            case AuthResponseType.Error:
                res.status(401).end();
                break;
            default:
                res.writeHead(302, {Location: '/login'}).end();
                break;
        }
        return {};
    } else {
        store?.dispatch(loginSuccessful(user));
        return {id: user._id, role: user.role, token};
    }
};

export default handleAuthentication;
