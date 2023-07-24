import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import dbConnect from '@/helpers/dbConnect';
import AccountModel from '@/models/AccountModel';
import {listLoadSuccessful} from '@/redux/accounts/slice';
import AccountsPage from '@/components/AccountsPage';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res}) => {
    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    await dbConnect();
    const accounts = await AccountModel.find({owner: userID});

    store.dispatch(listLoadSuccessful(accounts.map((item) => JSON.parse(JSON.stringify(item.toObject({virtuals: true}))))));

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <AccountsPage />;
};

export default Home;
