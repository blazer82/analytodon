import type {NextApiRequest, NextApiResponse} from 'next';
import {serialize} from 'cookie';
import {setNoCache} from '@/helpers/setNoCache';
import loginUser from '@/service/authentication/loginUser';

type Login = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;
const login: Login = async ({body, method}, res) => {
    setNoCache(res);
    if (method !== 'POST' || !body?.email || !body?.password) {
        return res.status(400).end();
    }

    const response = await loginUser(body.email, body.password);

    if (response === null) {
        return res.status(401).end();
    }

    const {token, refreshToken} = response;

    res.setHeader('Set-Cookie', [
        serialize('token', token, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
        serialize('refreshToken', refreshToken, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
    ]);
    res.json({token, refreshToken});
};

export default login;
