import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import EditUserPage from '@/components/EditUserPage';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';
import {loadSuccessful} from '@/redux/users/slice';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res, params}) => {
    await handleAuthentication([UserRole.Admin], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    if (params?.id && params.id !== 'new') {
        await dbConnect();
        const user = await UserModel.findById(params.id);

        if (user) {
            store.dispatch(loadSuccessful(JSON.parse(JSON.stringify(user.toObject({virtuals: true})))));
        } else {
            (res as NextApiResponse).status(404).end();
        }
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <EditUserPage />;
};

export default Home;
