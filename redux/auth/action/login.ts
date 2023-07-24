import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {User} from '@/types/User';
import jwt from 'jsonwebtoken';
import {loginAttempt, loginFailed, loginSuccessful} from '../slice';

export const login = (email: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(loginAttempt());

    const response = await postJSON('/api/user/login', {email, password});

    if (response.status === 200) {
        const {token} = await response.data;
        const user = jwt.decode(token) as User;
        dispatch(loginSuccessful(user));
    } else {
        dispatch(loginFailed('Failed to log in. User or password invalid. Please try again.'));
    }
};
