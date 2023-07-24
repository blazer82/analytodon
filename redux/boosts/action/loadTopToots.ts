import get from '@/helpers/get';
import {AppDispatch} from '@/redux/store';
import {topByBoostsLoadSuccessful} from '@/redux/toots/slice';
import {Timeframe} from '@/types/Timeframe';

export const loadTopToots = (accountID: string, timeframe: Timeframe) => async (dispatch: AppDispatch) => {
    const response = await get(`/api/boosts/toptoots?account=${accountID}&timeframe=${timeframe}`);

    if (response.status === 200) {
        const data = await response.data;
        dispatch(topByBoostsLoadSuccessful(data));
    }
};
