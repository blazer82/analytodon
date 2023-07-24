import type {NextApiRequest, NextApiResponse} from 'next';
import bcrypt from 'bcrypt';
import {setNoCache} from '@/helpers/setNoCache';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import dbConnect from '@/helpers/dbConnect';
import {User} from '@/types/User';
import UserModel from '@/models/UserModel';
import {logger} from '@/helpers/logger';
import UserCredentialsModel from '@/models/UserCredentialsModel';

const handle = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    setNoCache(res);

    const {role: userRole} = await handleAuthentication([UserRole.Admin], AuthResponseType.Error, {req, res});

    if (!userRole) {
        return;
    }

    switch (req.method) {
        case 'POST':
            return await handlePost(req, res);
        default:
            return res.status(405).end();
    }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse): Promise<void | NextApiResponse> => {
    try {
        await dbConnect();

        const {_id, email, password, role, isActive} = req.body as Partial<User & {password: string}>;

        if (_id) {
            const currentEntity = await UserModel.findById(_id);

            if (!currentEntity) {
                return res.status(404).end();
            }

            const updatedEntity = await UserModel.findOneAndReplace(
                {_id},
                {
                    ...currentEntity.toObject(),
                    email,
                    role,
                    isActive,
                },
                {returnDocument: 'after'},
            );

            if (!updatedEntity) {
                return res.status(404).end();
            }

            if (password) {
                storePassword(_id, password);
            }

            return res.json(updatedEntity);
        } else {
            const createdEntity = await UserModel.create({
                email,
                role,
                isActive,
            });

            if (password) {
                storePassword(createdEntity._id, password);
            }

            return res.json(createdEntity);
        }
    } catch (error: any) {
        logger.error(error?.message);
        return res.status(500).end();
    }
};

const storePassword = async (userID: string, password: string) => {
    const userCredentials = (await UserCredentialsModel.findOne({user: userID})) || new UserCredentialsModel({user: userID});
    if (userCredentials) {
        userCredentials.passwordHash = await bcrypt.hash(password, 10);
    }
    const savedCredentials = await userCredentials.save();

    await UserModel.updateOne(
        {
            _id: userID,
        },
        {
            $set: {
                credentials: savedCredentials._id,
            },
        },
    );
};

export default handle;
