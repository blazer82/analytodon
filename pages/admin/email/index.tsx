import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import EmailPage from '@/components/EmailPage';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res}) => {
    await handleAuthentication([UserRole.Admin], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <EmailPage />;
};

export default Home;
