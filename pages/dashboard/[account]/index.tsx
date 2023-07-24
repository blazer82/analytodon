import {FunctionComponent} from 'react';
import DashboardPage from '@/components/DashboardPage';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import handleAuthentication from '@/helpers/handleAuthentication';
import {wrapper} from '@/redux/store';
import {getTotalSnapshot} from '@/service/followers/getTotalSnapshot';
import {chartLoadSuccessful, totalLoadSuccessful} from '@/redux/followers/slice';
import {getChartData} from '@/service/followers/getChartData';
import {getTopToots} from '@/service/toots/getTopToots';
import {topLoadSuccessful} from '@/redux/toots/slice';
import {getDaysAgo} from '@/helpers/getDaysAgo';
import dbConnect from '@/helpers/dbConnect';
import AccountModel from '@/models/AccountModel';
import {switchAccount} from '@/redux/auth/slice';

export const getServerSideProps = wrapper.getServerSideProps((store) => async ({req, res, params}) => {
    const {id: userID} = await handleAuthentication([UserRole.AccountOwner], AuthResponseType.Redirect, {
        store,
        req: req as NextApiRequest,
        res: res as NextApiResponse,
    });

    await dbConnect();
    const account = await AccountModel.findOne({_id: params?.account, owner: userID});

    if (account?._id) {
        store.dispatch(switchAccount(JSON.parse(JSON.stringify(account))));

        const totalFollowers = await getTotalSnapshot(account._id);
        if (totalFollowers) {
            store.dispatch(totalLoadSuccessful(JSON.parse(JSON.stringify(totalFollowers))));
        }

        const chartData = await getChartData(account._id, account.timezone, getDaysAgo(30, account.timezone), getDaysAgo(0, account.timezone));
        if (chartData) {
            store.dispatch(chartLoadSuccessful({data: chartData.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }

        const topToots = await getTopToots({accountID: account._id, dateFrom: getDaysAgo(30, account.timezone)});
        if ((topToots?.length ?? 0) > 0) {
            store.dispatch(topLoadSuccessful({data: topToots.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <DashboardPage />;
};

export default Home;
