import postJSON from '@/helpers/postJSON';
import {AppDispatch} from '@/redux/store';
import {sendEmail as sendEmailStart, failed, sendEmailSuccessful} from '../slice';
import {Email} from '@/types/Email';

export const sendEmail =
    (data: Email, isTest = false) =>
    async (dispatch: AppDispatch) => {
        dispatch(sendEmailStart());

        const response = await postJSON('/api/users/email', {...data, isTest});

        if (response.status === 200) {
            const user = await response.data;
            dispatch(sendEmailSuccessful());
        } else {
            dispatch(failed('Failed to send email.'));
        }
    };
