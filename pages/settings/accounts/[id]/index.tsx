import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import dbConnect from '@/helpers/dbConnect';
import AccountModel from '@/models/AccountModel';
import {loadSuccessful} from '@/redux/accounts/slice';
import EditAccountPage from '@/components/EditAccountPage';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res, params}) => {
    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    if (params?.id && params.id !== 'new') {
        await dbConnect();
        const account = await AccountModel.findOne({_id: params.id, owner: userID});

        if (account) {
            store.dispatch(loadSuccessful(JSON.parse(JSON.stringify(account.toObject({virtuals: true})))));
        } else {
            (res as NextApiResponse).status(404).end();
        }
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <EditAccountPage />;
};

export default Home;
