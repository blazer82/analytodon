import deleteJSON from '@/helpers/deleteJSON';
import {refresh} from '@/redux/auth/action/refresh';
import {AppDispatch} from '@/redux/store';
import {Account} from '@/types/Account';
import {remove, failed, listLoadSuccessful} from '../slice';

export const deleteAccount = (data: Pick<Account, '_id'>) => async (dispatch: AppDispatch) => {
    dispatch(remove());

    const response = await deleteJSON('/api/accounts/delete', data);

    if (response.status === 200) {
        const accounts = await response.data;
        dispatch(listLoadSuccessful(accounts));
        dispatch(refresh());
    } else {
        dispatch(failed('Failed to delete account.'));
    }
};
