import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {resetPasswordRequestStarted, resetPasswordRequestFailed, resetPasswordRequestSuccessful} from '../slice';

export const resetPasswordRequest = (email: string) => async (dispatch: AppDispatch) => {
    dispatch(resetPasswordRequestStarted());

    const response = await postJSON('/api/user/reset-password-request', {email});

    if (response.status === 200) {
        dispatch(resetPasswordRequestSuccessful());
    } else {
        dispatch(resetPasswordRequestFailed('Failed send link. Please check your email address.'));
    }
};
