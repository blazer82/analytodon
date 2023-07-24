import {FunctionComponent} from 'react';
import RepliesPage from '@/components/RepliesPage';
import {wrapper} from '@/redux/store';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import {getWeeklyKPI} from '@/service/replies/getWeeklyKPI';
import {chartLoadSuccessful, monthlyKPILoadSuccessful, totalLoadSuccessful, weeklyKPILoadSuccessful, yearlyKPILoadSuccessful} from '@/redux/replies/slice';
import {getMonthlyKPI} from '@/service/replies/getMonthlyKPI';
import {getYearlyKPI} from '@/service/replies/getYearlyKPI';
import {getTotalSnapshot} from '@/service/replies/getTotalSnapshot';
import {getChartData} from '@/service/replies/getChartData';
import {getDaysAgo} from '@/helpers/getDaysAgo';
import {getTopToots} from '@/service/toots/getTopToots';
import {topByRepliesLoadSuccessful} from '@/redux/toots/slice';
import AccountModel from '@/models/AccountModel';
import dbConnect from '@/helpers/dbConnect';
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

        const weeklyKPI = await getWeeklyKPI(account._id, account.timezone);
        if (weeklyKPI?.currentPeriod !== undefined) {
            store.dispatch(weeklyKPILoadSuccessful(weeklyKPI));
        }

        const monthlyKPI = await getMonthlyKPI(account._id, account.timezone);
        if (monthlyKPI?.currentPeriod !== undefined) {
            store.dispatch(monthlyKPILoadSuccessful(monthlyKPI));
        }

        const yearlyKPI = await getYearlyKPI(account._id, account.timezone);
        if (yearlyKPI?.currentPeriod !== undefined) {
            store.dispatch(yearlyKPILoadSuccessful(yearlyKPI));
        }

        const totalFollowers = await getTotalSnapshot(account._id);
        if (totalFollowers) {
            store.dispatch(totalLoadSuccessful(JSON.parse(JSON.stringify(totalFollowers))));
        }

        const chartData = await getChartData(account._id, account.timezone, getDaysAgo(30, account.timezone), getDaysAgo(0, account.timezone));
        if (chartData) {
            store.dispatch(chartLoadSuccessful({data: chartData.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }

        const topToots = await getTopToots({accountID: account._id, ranking: 'replies', dateFrom: getDaysAgo(30, account.timezone)});
        if ((topToots?.length ?? 0) > 0) {
            store.dispatch(topByRepliesLoadSuccessful({data: topToots.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <RepliesPage />;
};

export default Home;
