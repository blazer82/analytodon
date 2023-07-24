import get from '@/helpers/get';
import {AppDispatch} from '@/redux/store';
import {Timeframe} from '@/types/Timeframe';
import {chartLoadSuccessful, loadChartStarted, loadFailed} from '../slice';

export const loadChart = (accountID: string, timeframe: Timeframe) => async (dispatch: AppDispatch) => {
    dispatch(loadChartStarted(timeframe));

    const response = await get(`/api/favorites/chart?account=${accountID}&timeframe=${timeframe}`);

    if (response.status === 200) {
        const {data, timeframe} = await response.data;
        dispatch(chartLoadSuccessful({data, timeframe}));
    } else {
        dispatch(loadFailed('Failed to load chart data.'));
    }
};
