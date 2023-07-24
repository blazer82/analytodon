import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {Account} from '@/types/Account';
import {connectSuccessful, failed, save} from '../slice';

export const connectAccount = (data: Partial<Account>) => async (dispatch: AppDispatch) => {
    dispatch(save());

    const response = await postJSON('/api/accounts/connect', data);

    if (response.status === 200) {
        const {url, account} = await response.data;
        dispatch(connectSuccessful({url, account}));
    } else {
        const {error} = await response.data;
        if (error) {
            dispatch(failed(error));
        } else {
            dispatch(failed('Connecting to account failed. Please try again later or get in touch with us.'));
        }
    }
};
