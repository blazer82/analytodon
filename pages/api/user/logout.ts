import type {NextApiRequest, NextApiResponse} from 'next';
import {serialize} from 'cookie';
import {setNoCache} from '@/helpers/setNoCache';
import getAuthInfoFromRequest from '@/helpers/getAuthInfoFromRequest';
import logoutUser from '@/service/authentication/logoutUser';

type Logout = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;
const logout: Logout = async (req, res) => {
    setNoCache(res);
    const {user} = await getAuthInfoFromRequest(req);

    if (!user) {
        return res.status(401).end();
    }

    await logoutUser(user._id);

    res.setHeader('Set-Cookie', [
        serialize('token', '', {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
        serialize('refreshToken', '', {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
    ]);
    res.end();
};

export default logout;
