import * as React from 'react';

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link } from '@remix-run/react';
import { StyledButton } from '~/components/StyledFormElements';

import { StepProgress } from '../AccountSetup';

interface AccountSetupCompleteProps {
  onClose?: () => void;
}

const AccountSetupComplete: React.FunctionComponent<AccountSetupCompleteProps> = ({ onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog fullScreen={fullScreen} open onClose={onClose}>
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
        {onClose ? (
          <StyledButton variant="contained" onClick={onClose}>
            Close
          </StyledButton>
        ) : (
          <StyledButton variant="contained" component={Link} to="/">
            Go to Dashboard
          </StyledButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AccountSetupComplete;
