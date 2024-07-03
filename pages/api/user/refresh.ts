import type {NextApiRequest, NextApiResponse} from 'next';
import {serialize} from 'cookie';
import {setNoCache} from '@/helpers/setNoCache';
import refreshUser from '@/service/authentication/refreshUser';

type Refresh = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;
const refresh: Refresh = async ({cookies, method}, res) => {
    setNoCache(res);

    if (method !== 'GET' || !cookies?.refreshToken) {
        return res.status(400).end();
    }

    const response = await refreshUser(cookies.refreshToken);

    if (response === null) {
        return res.status(400).end();
    }

    const {token, refreshToken, user} = response;

    res.setHeader('Set-Cookie', [
        serialize('token', token, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
        serialize('refreshToken', refreshToken, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
    ]);
    res.json({token, refreshToken, user});
};

export default refresh;
