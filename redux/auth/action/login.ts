import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {loginAttempt, loginFailed, loginSuccessful} from '../slice';

export const login = (email: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(loginAttempt());

    const response = await postJSON('/api/user/login', {email, password});

    if (response.status === 200) {
        const {user} = await response.data;
        dispatch(loginSuccessful(user));
    } else {
        dispatch(loginFailed('Failed to log in. User or password invalid. Please try again.'));
    }
};
