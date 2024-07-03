import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {SessionUser} from '@/types/User';
import {logoutSuccessful} from '../slice';

export const logout = (user: SessionUser) => async (dispatch: AppDispatch) => {
    await postJSON('/api/user/logout', user);
    dispatch(logoutSuccessful());
};
