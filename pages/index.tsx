import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import {useAppSelector} from '@/redux/hooks';
import AdminDashboardPage from '@/components/AdminDashboardPage';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res}) => {
    const {role} = await handleAuthentication([UserRole.Admin, UserRole.AccountOwner], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    if (role === UserRole.AccountOwner) {
        const {account} = store.getState().auth;
        if (account) {
            return {
                redirect: {
                    permanent: false,
                    destination: `${publicRuntimeConfig.appURL}/dashboard/${account._id}`,
                },
                props: {},
            };
        }
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    const {user} = useAppSelector(({auth}) => auth);

    switch (user?.role) {
        case UserRole.Admin:
            return <AdminDashboardPage />;
        default:
            return <></>;
    }
};

export default Home;
