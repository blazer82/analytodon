import * as React from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('components.accountSetupComplete');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog fullScreen={fullScreen} open onClose={onClose}>
      <DialogTitle>{t('title')}</DialogTitle>
      <DialogContent>
        <StepProgress currentStep={2}></StepProgress>
        <DialogContentText>
          {t('success')}
          <br />
          {t('waitMessage')}
          <br />
          {t('common:messages.emailNotification')}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ mb: 1, mr: 2 }}>
        {onClose ? (
          <StyledButton variant="contained" onClick={onClose}>
            {t('close')}
          </StyledButton>
        ) : (
          <StyledButton variant="contained" component={Link} to="/">
            {t('goToDashboard')}
          </StyledButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AccountSetupComplete;
