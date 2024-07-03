import {Account, SessionAccount} from '@/types/Account';
import {SessionUser, User} from '@/types/User';

const createSessionAccount = (account: Account): SessionAccount => {
    return {
        _id: account._id.toString(),
        serverURL: account.serverURL,
        name: account.name,
        username: account.username,
        accountName: account.accountName,
        accountURL: account.accountURL,
        avatarURL: account.avatarURL,
        utcOffset: account.utcOffset,
        timezone: account.timezone,
    };
};

const createSessionUser = (user: User): SessionUser => {
    return {
        _id: user._id.toString(),
        role: user.role,
        email: user.email,
        emailVerified: user.emailVerified,
        accounts: user.accounts?.map(createSessionAccount),
        maxAccounts: user.maxAccounts,
        serverURLOnSignUp: user.serverURLOnSignUp,
        timezone: user.timezone,
    };
};

export default createSessionUser;
