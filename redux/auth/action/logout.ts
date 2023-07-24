import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {User} from '@/types/User';
import {logoutSuccessful} from '../slice';

export const logout = (user: User) => async (dispatch: AppDispatch) => {
    await postJSON('/api/user/logout', user);
    dispatch(logoutSuccessful());
};
