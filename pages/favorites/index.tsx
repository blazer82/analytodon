import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res}) => {
    await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    const {account} = store.getState().auth;
    if (account) {
        return {
            redirect: {
                permanent: false,
                destination: `${publicRuntimeConfig.appURL}/favorites/${account._id}`,
            },
            props: {},
        };
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <></>;
};

export default Home;
