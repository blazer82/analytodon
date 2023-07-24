import get from '@/helpers/get';
import {AppDispatch} from '@/redux/store';
import {Timeframe} from '@/types/Timeframe';
import {csvLoadSuccessful, loadChartStarted, loadFailed} from '../slice';
import fileDownload from 'js-file-download';

export const loadCSV = (accountID: string, timeframe: Timeframe) => async (dispatch: AppDispatch) => {
    dispatch(loadChartStarted(timeframe));

    const response = await get(`/api/favorites/csv?account=${accountID}&timeframe=${timeframe}`);

    if (response.status === 200) {
        fileDownload(response.data, 'favorites.csv');
        dispatch(csvLoadSuccessful());
    } else {
        dispatch(loadFailed('Failed to load CSV data.'));
    }
};
