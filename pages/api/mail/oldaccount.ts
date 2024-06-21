import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import UserModel from '@/models/UserModel';
import OldAccountMailRequestSchema, {OldAccountMailRequest} from '@/schemas/oldAccountMailRequest';
import getConfig from 'next/config';
import sendOldAccountMail from '@/helpers/sendOldAccountMail';

const {serverRuntimeConfig} = getConfig();

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    if (req.headers['authorization'] !== serverRuntimeConfig.emailAPIKey) {
        return res.status(401).end();
    }

    switch (req.method) {
        case 'POST':
            return await handlePost(req, res);
        default:
            return res.status(405).end();
    }
};

const handlePost = async ({body}: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    try {
        const {value, error} = OldAccountMailRequestSchema.validate(body, {errors: {render: false}});

        if ((error?.details?.length ?? 0) > 0) {
            return res.status(400).end();
        }

        await dbConnect();

        const {userID} = value as OldAccountMailRequest;

        logger.info(`Request old account email for user: ${userID}`);

        const user = await UserModel.findOne({_id: userID});
        if (!user) {
            logger.error(`Request old account email: user not found: ${userID}`);
            return res.status(404).end();
        }

        await sendOldAccountMail(user);

        res.end();
    } catch (error: any) {
        logger.error(`Error while sending old account email: ${error?.message}`);
        return res.status(500).end();
    }
};

export default handle;
