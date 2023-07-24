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

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Error, {req, res});

    if (!userID) {
        return;
    }

    switch (req.method) {
        case 'POST':
            return await handlePost(req, res, userID);
        default:
            return res.status(405).end();
    }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse, userID: string): Promise<void | NextApiResponse> => {
    try {
        await dbConnect();

        const {_id, name, serverURL} = req.body as Partial<Account>;

        if (_id) {
            const currentEntity = await AccountModel.findOne({_id, owner: userID});

            if (!currentEntity) {
                return res.status(404).end();
            }

            const updatedEntity = await AccountModel.findOneAndReplace(
                {_id},
                {
                    ...currentEntity.toObject(),
                    name,
                },
                {returnDocument: 'after'},
            );

            if (!updatedEntity) {
                return res.status(404).end();
            }

            return res.json(updatedEntity);
        } else {
            const createdEntity = await AccountModel.create({
                name,
                serverURL,
                isActive: true,
                owner: userID,
            });

            await UserModel.updateOne({_id: userID}, {accounts: {$push: createdEntity._id}});

            return res.json(createdEntity);
        }
    } catch (error: any) {
        logger.error(error?.message);
        return res.status(500).end();
    }
};

export default handle;
