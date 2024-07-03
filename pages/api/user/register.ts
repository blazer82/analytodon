import type {NextApiRequest, NextApiResponse} from 'next';
import bcrypt from 'bcrypt';
import {serialize} from 'cookie';
import {setNoCache} from '@/helpers/setNoCache';
import registrationFormSchema from '@/schemas/registrationForm';
import UserModel from '@/models/UserModel';
import dbConnect from '@/helpers/dbConnect';
import UserCredentialsModel from '@/models/UserCredentialsModel';
import {UserRole} from '@/types/UserRole';
import {logger} from '@/helpers/logger';
import loginUser from '@/service/authentication/loginUser';
import {v4 as uuid} from 'uuid';
import sendEmailVerificationMail from '@/helpers/sendEmailVerificationMail';
import sendSignupNotificationMail from '@/helpers/sendSignupNotificationMail';

type Register = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;
const register: Register = async ({body, method}, res) => {
    setNoCache(res);
    if (method !== 'POST') {
        return res.status(405).end();
    }

    const {value, error} = registrationFormSchema.validate(body, {errors: {render: false}});

    if ((error?.details?.length ?? 0) > 0) {
        return res.status(400).end();
    }

    await dbConnect();

    const user = new UserModel({
        email: value.email,
        serverURLOnSignUp: value.serverURL,
        timezone: value.timezone,
        role: UserRole.AccountOwner,
        isActive: true,
        emailVerified: false,
        emailVerificationCode: uuid(),
        maxAccounts: 10,
    });

    const passwordHash = await bcrypt.hash(body.password, 10);

    const userCredentials = new UserCredentialsModel({passwordHash, user});

    try {
        await user.save();

        userCredentials.user = user.id;
        await userCredentials.save();

        user.credentials = userCredentials.id;
        await user.save();

        sendEmailVerificationMail(user);
        sendSignupNotificationMail(user);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).send({error: 'A user with this email address already exists.'});
        }
        if (error.errors?.type?.name === 'ValidatorError') {
            logger.error(`User Registration: ${error.errors.type.message}`);
            return res.status(400).end();
        }
        return res.status(500).end();
    }

    const response = await loginUser(value.email, value.password);

    if (response === null) {
        return res.status(500).end();
    }

    const {token, refreshToken, user: sessionUser} = response;

    res.setHeader('Set-Cookie', [
        serialize('token', token, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
        serialize('refreshToken', refreshToken, {path: '/', httpOnly: true, secure: process.env.NODE_ENV !== 'development'}),
    ]);
    res.json({token, refreshToken, user: sessionUser});
};

export default register;
