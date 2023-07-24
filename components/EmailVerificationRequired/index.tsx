import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, useTheme} from '@mui/material';
import * as React from 'react';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const EmailVerificationRequired: React.FunctionComponent = () => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Dialog fullScreen={fullScreen} open>
            <DialogTitle>Email Verification Required</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Please click on the link we sent to your email address in order to complete your registration for Analytodon.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button href={`mailto:${publicRuntimeConfig.supportEmail}?subject=Support`}>Contact Support</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EmailVerificationRequired;
