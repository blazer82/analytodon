import {NextApiResponse} from 'next';

type SetNoCache = (res: NextApiResponse) => void;
export const setNoCache: SetNoCache = (res) => res.setHeader('Cache-Control', 'no-cache');
