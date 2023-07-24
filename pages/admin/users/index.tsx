import {FunctionComponent} from 'react';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import UsersPage from '@/components/UsersPage';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';
import {listLoadSuccessful} from '@/redux/users/slice';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res}) => {
    await handleAuthentication([UserRole.Admin], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    await dbConnect();
    const users = await UserModel.find({}).populate('credentials');

    store.dispatch(
        listLoadSuccessful(
            users.map((item) =>
                JSON.parse(
                    JSON.stringify({
                        ...item.toObject({virtuals: true}),
                        credentials: {
                            updatedAt: item.credentials?.updatedAt,
                        },
                    }),
                ),
            ),
        ),
    );

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <UsersPage />;
};

export default Home;
