import * as React from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link } from '@remix-run/react';

import { StepProgress } from '../AccountSetup';

const AccountSetupComplete: React.FunctionComponent = () => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog fullScreen={fullScreen} open>
      <DialogTitle>Set Up Your Mastodon Account</DialogTitle>
      <DialogContent>
        <StepProgress currentStep={2}></StepProgress>
        <DialogContentText>
          You&apos;re all set. Your account has been connected successfully.
          <br />
          It may take a couple of minutes before you see any analytics for this account.
          <br />
          We&apos;ll send you an email once your data is ready.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ mb: 1, mr: 2 }}>
        <Button variant="contained" component={Link} to="/">
          Go to Dashboard
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountSetupComplete;
