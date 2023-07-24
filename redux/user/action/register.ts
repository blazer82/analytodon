import postJSON from '@/helpers/postJSON';
import {loginSuccessful} from '@/redux/auth/slice';
import {AppDispatch} from '@/redux/store';
import {RegistrationFormData} from '@/schemas/registrationForm';
import {User} from '@/types/User';
import jwt from 'jsonwebtoken';
import {registrationAttempt, registrationFailed} from '../slice';

export const register = (data: RegistrationFormData) => async (dispatch: AppDispatch) => {
    dispatch(registrationAttempt());

    const response = await postJSON('/api/user/register', data);

    if (response.status === 200) {
        const {token} = await response.data;
        const user = jwt.decode(token) as User;
        dispatch(loginSuccessful(user));
    } else {
        const {error} = await response.data;
        if (error) {
            dispatch(registrationFailed(error));
        } else {
            dispatch(registrationFailed('Registration failed. Please try again later or get in touch with us.'));
        }
    }
};
