import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import AccountSetupComplete from '@/components/AccountSetupComplete';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res}) => {
    await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
        forceRefresh: true,
    });

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <AccountSetupComplete />;
};

export default Home;
