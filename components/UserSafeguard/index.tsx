import {useAppSelector} from '@/redux/hooks';
import {UserRole} from '@/types/UserRole';
import {useRouter} from 'next/router';
import * as React from 'react';
import AccountSetup from '../AccountSetup';
import EmailVerificationRequired from '../EmailVerificationRequired';

const UserSafeguard: React.FunctionComponent<React.PropsWithChildren> = ({children}) => {
    const router = useRouter();
    const {user} = useAppSelector(({auth}) => auth);

    const userRequired = React.useMemo(
        () =>
            !router.asPath.startsWith('/login') &&
            !router.asPath.startsWith('/register') &&
            !router.asPath.startsWith('/unsubscribe') &&
            !router.asPath.startsWith('/subscribe'),
        [router],
    );

    const requiresEmailVerification = React.useMemo(() => !user?.emailVerified, [user]);
    const requiresAccountSetup = React.useMemo(() => user?.role === UserRole.AccountOwner && (user?.accounts?.length ?? 0) < 1, [user]);

    if (!userRequired) {
        return <>{children}</>;
    }

    if (!user) {
        return <></>;
    }

    if (requiresEmailVerification) {
        return <EmailVerificationRequired />;
    }

    if (requiresAccountSetup) {
        return <AccountSetup />;
    }

    return <>{children}</>;
};

export default UserSafeguard;
