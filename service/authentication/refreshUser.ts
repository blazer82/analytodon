import createJWT from '@/helpers/createJWT';
import dbConnect from '@/helpers/dbConnect';
import AccountModel from '@/models/AccountModel';
import UserCredentialsModel from '@/models/UserCredentialsModel';
import UserModel from '@/models/UserModel';

type RefreshUser = (refreshToken: string) => Promise<{token: string; refreshToken: string} | null>;
const refreshUser: RefreshUser = async (currentRefreshToken) => {
    await dbConnect();

    const userCredentials = await UserCredentialsModel.findOne({refreshToken: currentRefreshToken}).populate({
        path: 'user',
        model: UserModel,
        populate: {path: 'accounts', model: AccountModel, match: {setupComplete: true}},
    });
    const user = userCredentials?.user;

    if (!userCredentials || !user || !user.isActive) {
        return null;
    }

    const {token, refreshToken} = await createJWT(user);

    userCredentials.refreshToken = refreshToken;

    await userCredentials.save();

    return {token, refreshToken};
};

export default refreshUser;
