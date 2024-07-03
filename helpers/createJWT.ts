import getConfig from 'next/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {User} from '@/types/User';
import {User as UserModel} from '@/models/UserModel';

const {serverRuntimeConfig} = getConfig();

type CreateJWT = (user: User | UserModel) => Promise<{token: string; refreshToken: string}>;
const createJWT: CreateJWT = async (user) => {
    const _id = user._id.toString();
    const token = await jwt.sign(
        {
            _id,
            role: user.role,
        },
        serverRuntimeConfig.jwtSecret,
        {expiresIn: '10m'},
    );

    const refreshToken = await bcrypt.hash(_id, 10);

    return {token, refreshToken};
};

export default createJWT;
