import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import resetPasswordFormSchema from '@/schemas/resetPasswordForm';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';
import {logger} from '@/helpers/logger';
import bcrypt from 'bcrypt';
import UserCredentialsModel from '@/models/UserCredentialsModel';

type ResetPassword = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;
const resetPassword: ResetPassword = async ({body, method}, res) => {
    setNoCache(res);
    if (method !== 'POST') {
        return res.status(405).end();
    }

    const {value, error} = resetPasswordFormSchema.validate(body, {errors: {render: false}});

    if ((error?.details?.length ?? 0) > 0) {
        return res.status(400).end();
    }

    await dbConnect();

    const user = await UserModel.findOne({resetPasswordToken: value.token, isActive: true, emailVerified: true});
    if (!user) {
        logger.error(`Reset password: User not found for token ${value.token}`);
        return res.status(400).end();
    }

    try {
        const passwordHash = await bcrypt.hash(value.password, 10);

        const credentials = (await UserCredentialsModel.findById(user.credentials)) || new UserCredentialsModel({user});
        credentials.passwordHash = passwordHash;
        await credentials.save();

        user.resetPasswordToken = undefined;
        user.credentials = credentials._id;
        await user.save();
    } catch (error: any) {
        logger.error(`Reset password error: ${error?.message}`);
        return res.status(500).end();
    }

    res.end();
};

export default resetPassword;
