import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import AccountModel from '@/models/AccountModel';
import UserModel from '@/models/UserModel';
import sendFirstStatsAvailablenMail from '@/helpers/sendFirstStatsAvailableMail';
import FirstStatsMailRequestSchema, {FirstStatsMailRequest} from '@/schemas/firstStatsMailRequest';
import getConfig from 'next/config';

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
        const {value, error} = FirstStatsMailRequestSchema.validate(body, {errors: {render: false}});

        if ((error?.details?.length ?? 0) > 0) {
            return res.status(400).end();
        }

        await dbConnect();

        const {userID, accounts} = value as FirstStatsMailRequest;

        logger.info(`Request first stats available email for user: ${userID}`);

        const user = await UserModel.findOne({_id: userID});
        if (!user) {
            logger.error(`Request weekly stats email: user not found: ${userID}`);
            return res.status(404).end();
        }

        const accountList = await AccountModel.find({_id: {$in: accounts}, owner: userID});

        if (accountList.length > 0) {
            for (const account of accountList) {
                await sendFirstStatsAvailablenMail(user, account);
            }
        } else {
            logger.warn(`Request first stats available email: account list empty for user ${userID}`);
        }

        res.end();
    } catch (error: any) {
        logger.error(`Error while sending first stats available email: ${error?.message}`);
        return res.status(500).end();
    }
};

export default handle;
