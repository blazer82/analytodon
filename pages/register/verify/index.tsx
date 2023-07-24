import * as React from 'react';
import EmailVerificationPage from '@/components/EmailVerificationPage';
import {wrapper} from '@/redux/store';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';

export const getServerSideProps = wrapper.getServerSideProps(() => async ({query}) => {
    if (query?.c) {
        await dbConnect();
        const {matchedCount} = await UserModel.updateOne(
            {emailVerificationCode: `${query.c}`},
            {$set: {emailVerified: true}, $unset: {emailVerificationCode: 1}},
        );

        return {props: {matchedCount}};
    }

    return {props: {matchedCount: 0}};
});

const Page: React.FunctionComponent<{matchedCount: number}> = ({matchedCount}) => {
    return <EmailVerificationPage matchedCount={matchedCount} />;
};

export default Page;
