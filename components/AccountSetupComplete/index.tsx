import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, useTheme} from '@mui/material';
import * as React from 'react';
import {useRouter} from 'next/router';
import {StepProgress} from '../AccountSetup';

const AccountSetupComplete: React.FunctionComponent = () => {
    const theme = useTheme();
    const router = useRouter();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    const handleButtonClick = React.useCallback(() => {
        router.push('/');
    }, [router]);

    return (
        <Dialog fullScreen={fullScreen} open>
            <DialogTitle>Set Up Your Mastodon Account</DialogTitle>
            <DialogContent>
                <StepProgress currentStep={2}></StepProgress>
                <DialogContentText>
                    You&apos;re all set. Your account has been connected sucessfully.
                    <br />I may take a couple of minutes before you see any analytics for this account.
                    <br />
                    We&apos;ll send you an email once your data is ready.
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{mb: 1, mr: 2}} onClick={handleButtonClick}>
                <Button variant="contained">Go to Dashboard</Button>
            </DialogActions>
        </Dialog>
    );
};

export default AccountSetupComplete;
