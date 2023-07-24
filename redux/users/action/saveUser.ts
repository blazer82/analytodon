import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {User} from '@/types/User';
import {save, loadSuccessful, failed} from '../slice';

export const saveUser = (data: Partial<User & {password: string}>) => async (dispatch: AppDispatch) => {
    dispatch(save());

    const response = await postJSON('/api/users/save', data);

    if (response.status === 200) {
        const user = await response.data;
        dispatch(loadSuccessful(user));
    } else {
        dispatch(failed('Failed to save user.'));
    }
};
