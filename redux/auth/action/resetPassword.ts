import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {resetPasswordAttempt, resetPasswordFailed, resetPasswordSuccessful} from '../slice';

export const resetPassword = (token: string, password: string) => async (dispatch: AppDispatch) => {
    dispatch(resetPasswordAttempt());

    const response = await postJSON('/api/user/reset-password', {token, password});

    if (response.status === 200) {
        dispatch(resetPasswordSuccessful());
    } else {
        dispatch(resetPasswordFailed('Failed send link. Please check your email address.'));
    }
};
