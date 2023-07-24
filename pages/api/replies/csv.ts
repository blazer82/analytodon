import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import AccountModel from '@/models/AccountModel';
import {getChartData} from '@/service/replies/getChartData';
import {resolveTimeframe} from '@/helpers/resolveTimeframe';
import {stringify} from 'csv-stringify';

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

        const {dateFrom, dateTo} = resolveTimeframe(account.timezone, String(timeframe));

        const chartData = await getChartData(account._id, account.timezone, dateFrom, dateTo, false);

        if (chartData) {
            let data = '';
            const stringifier = stringify({header: true, delimiter: ';'});

            stringifier.on('readable', function () {
                let row;
                while ((row = stringifier.read())) {
                    data += row;
                }
            });
            stringifier.on('error', function (error) {
                logger.error(error.message);
                res.status(500).send(error.message);
            });
            stringifier.on('finish', function () {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=replies.csv');
                res.send(data);
            });

            for (const {time, value} of chartData) {
                stringifier.write({
                    Date: time,
                    Replies: value,
                });
            }

            stringifier.end();
        } else {
            res.end();
        }
    } catch (error: any) {
        logger.error(error?.message);
        return res.status(500).end();
    }
};

export default handle;
