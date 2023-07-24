import get from '@/helpers/get';
import {AppDispatch} from '@/redux/store';
import {User} from '@/types/User';
import jwt from 'jsonwebtoken';
import {loginSuccessful} from '../slice';

export const refresh = () => async (dispatch: AppDispatch) => {
    const response = await get('/api/user/refresh');

    if (response.status === 200) {
        const {token} = await response.data;
        const user = jwt.decode(token) as User;
        dispatch(loginSuccessful(user));
    }
};
