import dbConnect from '@/helpers/dbConnect';
import UserCredentialsModel from '@/models/UserCredentialsModel';

type LogoutUser = (userID: string) => Promise<boolean>;
const logoutUser: LogoutUser = async (userID) => {
    await dbConnect();

    await UserCredentialsModel.updateOne({user: userID}, {$unset: {refreshToken: 1}});

    return true;
};

export default logoutUser;
