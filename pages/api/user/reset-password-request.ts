import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import resetPasswordRequestFormSchema from '@/schemas/resetPasswordRequestForm';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';
import {logger} from '@/helpers/logger';
import {v4 as uuid} from 'uuid';
import sendPasswordResetMail from '@/helpers/sendPasswordResetMail';

type ResetPassword = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;
const resetPassword: ResetPassword = async ({body, method}, res) => {
    setNoCache(res);
    if (method !== 'POST') {
        return res.status(405).end();
    }

    const {value, error} = resetPasswordRequestFormSchema.validate(body, {errors: {render: false}});

    if ((error?.details?.length ?? 0) > 0) {
        return res.status(400).end();
    }

    await dbConnect();

    const user = await UserModel.findOne({email: value.email, isActive: true, emailVerified: true});
    if (!user) {
        logger.info(`Reset password: User not found ${value.email}`);
        return res.end(); // Do not return 400 to avoid user enumeration
    }

    try {
        const token = uuid();

        user.resetPasswordToken = token;
        await user.save();

        await sendPasswordResetMail(user);
    } catch (error: any) {
        logger.error(`Reset password request error: ${error?.message}`);
        return res.status(500).end();
    }

    res.end();
};

export default resetPassword;
