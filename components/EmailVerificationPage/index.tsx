import {refresh} from '@/redux/auth/action/refresh';
import {useAppDispatch} from '@/redux/hooks';
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, useTheme} from '@mui/material';
import {useRouter} from 'next/router';
import * as React from 'react';

const EmailVerificationPage: React.FunctionComponent<{matchedCount: number}> = ({matchedCount}) => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    const handleClick = React.useCallback(() => {
        router.replace('/');
    }, [router]);

    const success = matchedCount > 0;

    React.useEffect(() => {
        if (success) {
            dispatch(refresh());
        }
    }, [success, dispatch]);

    return (
        <Dialog fullScreen={fullScreen} open>
            {success && <DialogTitle>Email Verification Successful</DialogTitle>}
            {!success && <DialogTitle>Email Verification Failed</DialogTitle>}
            <DialogContent>
                {success && <DialogContentText>Thanks for verifying your email address.</DialogContentText>}
                {!success && <DialogContentText>The provided code is invalid our your email address has already been verified</DialogContentText>}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClick}>Go to Analytodon</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EmailVerificationPage;
