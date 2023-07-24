import get from '@/helpers/get';
import {AppDispatch} from '@/redux/store';
import {topByBoostsLoadSuccessful, topByFavoritesLoadSuccessful, topByRepliesLoadSuccessful, topLoadSuccessful} from '@/redux/toots/slice';
import {Timeframe} from '@/types/Timeframe';

export const loadTopToots = (accountID: string, timeframe: Timeframe) => async (dispatch: AppDispatch) => {
    const response = await get(`/api/top-toots/toptoots?account=${accountID}&timeframe=${timeframe}`);

    if (response.status === 200) {
        const {top, topByReplies, topByBoosts, topByFavorites} = await response.data;
        dispatch(topLoadSuccessful(top));
        dispatch(topByRepliesLoadSuccessful(topByReplies));
        dispatch(topByBoostsLoadSuccessful(topByBoosts));
        dispatch(topByFavoritesLoadSuccessful(topByFavorites));
    }
};
