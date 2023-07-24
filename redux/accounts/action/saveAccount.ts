import postJSON from '@/helpers/postJSON';
import {refresh} from '@/redux/auth/action/refresh';
import {AppDispatch} from '@/redux/store';
import {Account} from '@/types/Account';
import {save, loadSuccessful, failed} from '../slice';

export const saveAccount = (data: Partial<Account>) => async (dispatch: AppDispatch) => {
    dispatch(save());

    const response = await postJSON('/api/accounts/save', data);

    if (response.status === 200) {
        const account = await response.data;
        dispatch(loadSuccessful(account));
        dispatch(refresh());
    } else {
        dispatch(failed('Failed to save account.'));
    }
};
