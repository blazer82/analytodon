import * as React from 'react';
import {wrapper} from '@/redux/store';
import ResetPasswordPage from '@/components/ResetPasswordPage';

export const getServerSideProps = wrapper.getServerSideProps(() => async ({query}) => {
    const token = query?.t ? `${query?.t}` : null;

    return {props: {token}};
});

const Page: React.FunctionComponent<{token?: string}> = ({token}) => {
    return <ResetPasswordPage token={token} />;
};

export default Page;
