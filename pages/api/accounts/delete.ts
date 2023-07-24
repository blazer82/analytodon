import type {NextApiRequest, NextApiResponse} from 'next';
import {setNoCache} from '@/helpers/setNoCache';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import dbConnect from '@/helpers/dbConnect';
import {logger} from '@/helpers/logger';
import {Account} from '@/types/Account';
import AccountModel from '@/models/AccountModel';
import UserModel from '@/models/UserModel';
import AccountCredentialsModel from '@/models/AccountCredentialsModel';

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Error, {req, res});

    if (!userID) {
        return;
    }

    switch (req.method) {
        case 'DELETE':
            return await handleDelete(req, res, userID);
        default:
            return res.status(405).end();
    }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse, userID: string): Promise<void | NextApiResponse> => {
    try {
        await dbConnect();

        const {_id} = req.body as Partial<Account>;

        if (!_id) {
            return res.status(400).end();
        }

        const currentEntity = await AccountModel.findOne({_id, owner: userID});

        if (!currentEntity) {
            return res.status(404).end();
        }

        await UserModel.updateOne({_id: userID}, {$pull: {accounts: _id}});
        await AccountModel.deleteOne({_id});
        await AccountCredentialsModel.deleteMany({account: _id});

        const accounts = await AccountModel.find({owner: userID});

        res.json(accounts.map((item) => JSON.parse(JSON.stringify(item.toObject({virtuals: true})))));
    } catch (error: any) {
        logger.error(error?.message);
        return res.status(500).end();
    }
};

export default handle;
