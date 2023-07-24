import {useAppSelector} from '@/redux/hooks';
import {useRouter} from 'next/router';
import * as React from 'react';

const LoginRedirect: React.FunctionComponent = () => {
    const router = useRouter();
    const {user} = useAppSelector(({auth}) => auth);

    React.useEffect(() => {
        if (
            !user &&
            !router.asPath.startsWith('/login') &&
            !router.asPath.startsWith('/register') &&
            !router.asPath.startsWith('/unsubscribe') &&
            !router.asPath.startsWith('/subscribe')
        ) {
            router.push('/login');
        }
    }, [user, router]);

    return <></>;
};

export default LoginRedirect;
