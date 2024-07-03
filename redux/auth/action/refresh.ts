import get from '@/helpers/get';
import {AppDispatch} from '@/redux/store';
import {loginSuccessful} from '../slice';

export const refresh = () => async (dispatch: AppDispatch) => {
    const response = await get('/api/user/refresh');

    if (response.status === 200) {
        const {user} = await response.data;
        dispatch(loginSuccessful(user));
    }
};
