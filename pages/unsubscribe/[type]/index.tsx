import * as React from 'react';
import {wrapper} from '@/redux/store';
import dbConnect from '@/helpers/dbConnect';
import UserModel from '@/models/UserModel';
import UnsubscribePage from '@/components/UnsubscribePage';

export const getServerSideProps = wrapper.getServerSideProps(() => async ({query, params}) => {
    const type = `${params?.type}`;
    const userID = `${query?.u}`;
    const email = `${query?.e}`;

    if (!['weekly', 'news'].includes(type)) {
        return {props: {matchedCount: 0, type, userID, email}};
    }

    if (userID && email) {
        await dbConnect();
        const {matchedCount} = await UserModel.updateOne({_id: userID, email}, {$addToSet: {unsubscribed: type}});

        return {props: {matchedCount, type, userID, email}};
    }

    return {props: {matchedCount: 0, type, userID, email}};
});

const Page: React.FunctionComponent<{matchedCount: number; type: string; userID: string; email: string}> = ({matchedCount, type, userID, email}) => {
    return <UnsubscribePage matchedCount={matchedCount} type={type} userID={userID} email={email} />;
};

export default Page;
