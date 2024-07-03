import bcrypt from 'bcrypt';
import createJWT from '@/helpers/createJWT';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';
import UserCredentialsModel, {UserCredentials} from '@/models/UserCredentialsModel';
import AccountModel from '@/models/AccountModel';
import {SessionUser} from '@/types/User';
import createSessionUser from '@/helpers/createSessionUser';

type LoginUser = (email: string, password: string) => Promise<{token: string; refreshToken: string; user: SessionUser} | null>;
const loginUser: LoginUser = async (email, password) => {
    await dbConnect();

    const user = await UserModel.findOne({email}).populate([
        {path: 'accounts', model: AccountModel, match: {setupComplete: true}},
        {path: 'credentials', model: UserCredentialsModel},
    ]);

    if (!user || !user.isActive) {
        return null;
    }

    if (!user.credentials) {
        console.warn(`Missing credentials for user ${user._id}`);
        return null;
    }

    if (!(await bcrypt.compare(password, user.credentials.passwordHash))) {
        return null;
    }

    const {token, refreshToken} = await createJWT(user);

    user.credentials.refreshToken = refreshToken;
    await (user.credentials as UserCredentials).save();

    user.oldAccountDeletionNoticeSent = false;
    await user.save();

    return {token, refreshToken, user: createSessionUser(user)};
};

export default loginUser;
