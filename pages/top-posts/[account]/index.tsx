import {FunctionComponent} from 'react';
import TopTootsPage from '@/components/TopTootsPage';
import {wrapper} from '@/redux/store';
import handleAuthentication from '@/helpers/handleAuthentication';
import {UserRole} from '@/types/UserRole';
import {AuthResponseType} from '@/types/AuthResponseType';
import {NextApiRequest, NextApiResponse} from 'next';
import {getTopToots} from '@/service/toots/getTopToots';
import {getDaysAgo} from '@/helpers/getDaysAgo';
import {topByBoostsLoadSuccessful, topByFavoritesLoadSuccessful, topByRepliesLoadSuccessful, topLoadSuccessful} from '@/redux/toots/slice';
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

        const topToots = await getTopToots({accountID: account._id, dateFrom: getDaysAgo(30, account.timezone), limit: 10});
        if ((topToots?.length ?? 0) > 0) {
            store.dispatch(topLoadSuccessful({data: topToots.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }

        const topTootsByReplies = await getTopToots({accountID: account._id, ranking: 'replies', dateFrom: getDaysAgo(30, account.timezone), limit: 10});
        if ((topTootsByReplies?.length ?? 0) > 0) {
            store.dispatch(topByRepliesLoadSuccessful({data: topTootsByReplies.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }

        const topTootsByBoosts = await getTopToots({accountID: account._id, ranking: 'boosts', dateFrom: getDaysAgo(30, account.timezone), limit: 10});
        if ((topTootsByBoosts?.length ?? 0) > 0) {
            store.dispatch(topByBoostsLoadSuccessful({data: topTootsByBoosts.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }

        const topTootsByFavorites = await getTopToots({accountID: account._id, ranking: 'favourites', dateFrom: getDaysAgo(30, account.timezone), limit: 10});
        if ((topTootsByFavorites?.length ?? 0) > 0) {
            store.dispatch(topByFavoritesLoadSuccessful({data: topTootsByFavorites.map((item) => JSON.parse(JSON.stringify(item))), timeframe: 'last30days'}));
        }
    }

    return {props: {}};
});

const Home: FunctionComponent = () => {
    return <TopTootsPage />;
};

export default Home;
