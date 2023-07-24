import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import WeeklyStatsMailRequestSchema, {WeeklyStatsMailRequest} from '@/schemas/weeklyStatsMailRequest';
import AccountModel from '@/models/AccountModel';
import UserModel from '@/models/UserModel';
import sendWeeklyStatsMail from '@/helpers/sendWeeklyStatsMail';
import {getWeeklyKPI as getWeeklyFollowers} from '@/service/followers/getWeeklyKPI';
import {getWeeklyKPI as getWeeklyReplies} from '@/service/replies/getWeeklyKPI';
import {getWeeklyKPI as getWeeklyBoosts} from '@/service/boosts/getWeeklyKPI';
import {getWeeklyKPI as getWeeklyFavorites} from '@/service/favorites/getWeeklyKPI';
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
        const {value, error} = WeeklyStatsMailRequestSchema.validate(body, {errors: {render: false}});

        if ((error?.details?.length ?? 0) > 0) {
            return res.status(400).end();
        }

        await dbConnect();

        const {userID, accounts, email} = value as WeeklyStatsMailRequest;

        logger.info(`Request weekly stats email for user: ${userID}${email ? ' (reroute to ' + email + ')' : ''}`);

        const user = await UserModel.findOne({_id: userID});
        if (!user) {
            logger.error(`Request weekly stats email: user not found: ${userID}`);
            return res.status(404).end();
        }

        const accountList = await AccountModel.find({_id: {$in: accounts}, owner: userID});

        if (accountList.length > 0) {
            const stats = await Promise.all(
                accountList.map(async (account) => ({
                    account,
                    followers: await getWeeklyFollowers(account._id, account.timezone),
                    replies: await getWeeklyReplies(account._id, account.timezone),
                    boosts: await getWeeklyBoosts(account._id, account.timezone),
                    favorites: await getWeeklyFavorites(account._id, account.timezone),
                })),
            );

            await sendWeeklyStatsMail(user, stats, email);
        } else {
            logger.warn(`Request weekly stats email: account list empty for user ${userID}`);
        }

        res.end();
    } catch (error: any) {
        logger.error(`Error while sending weekly stats email: ${error?.message}`);
        return res.status(500).end();
    }
};

export default handle;
