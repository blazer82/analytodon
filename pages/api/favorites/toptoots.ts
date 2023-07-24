import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import AccountModel from '@/models/AccountModel';
import {resolveTimeframe} from '@/helpers/resolveTimeframe';
import {getTopToots} from '@/service/toots/getTopToots';

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Error, {req, res});

    if (!userID) {
        return;
    }

    switch (req.method) {
        case 'GET':
            return await handleGet(req, res, userID);
        default:
            return res.status(405).end();
    }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse, userID: string): Promise<void | NextApiResponse> => {
    try {
        const accountID = req.query?.account;
        const timeframe = req.query?.timeframe;

        if (!accountID || !timeframe) {
            return res.status(400).end();
        }

        await dbConnect();

        const account = await AccountModel.findOne({_id: accountID, owner: userID});

        if (!account) {
            return res.status(404).end();
        }

        const {dateFrom, dateTo, timeframe: actualTimeframe} = resolveTimeframe(account.timezone, String(timeframe));

        const topToots = await getTopToots({accountID: account._id, ranking: 'favourites', dateFrom, dateTo});
        if ((topToots?.length ?? 0) > 0) {
            return res.json({data: topToots.map((item) => JSON.parse(JSON.stringify(item))), timeframe: actualTimeframe});
        }

        return res.end();
    } catch (error: any) {
        logger.error(error?.message);
        return res.status(500).end();
    }
};

export default handle;
