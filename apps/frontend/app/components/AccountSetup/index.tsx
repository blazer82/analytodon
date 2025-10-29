import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Alert,
  Autocomplete,
  // Button, // Replaced by StyledButton
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormGroup,
  Step,
  StepLabel,
  Stepper,
  // TextField, // Replaced by StyledTextField
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Form, useNavigation } from '@remix-run/react';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';
import timezones from '~/utils/timezones.json';

export interface AccountSetupFormData {
  serverURL: string;
  timezone: string;
}

export const StepProgress: React.FunctionComponent<{ currentStep: number }> = ({ currentStep }) => {
  const { t } = useTranslation('components.accountSetup');
  return (
    <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4, mt: 2 }}>
      <Step>
        <StepLabel>{t('steps.connect')}</StepLabel>
      </Step>
      <Step>
        <StepLabel>{t('steps.authorize')}</StepLabel>
      </Step>
      <Step>
        <StepLabel>{t('steps.complete')}</StepLabel>
      </Step>
    </Stepper>
  );
};

interface StepOneProps {
  currentStep: number;
  onClose?: () => void;
  initialServerURL?: string;
  initialTimezone?: string;
  error?: string;
}

export const StepOne: React.FunctionComponent<StepOneProps> = ({
  currentStep,
  onClose,
  initialServerURL = '',
  initialTimezone = '',
  error,
}) => {
  const { t } = useTranslation('components.accountSetup');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const navigation = useNavigation();
  const isSubmitting =
    (navigation.state === 'submitting' || navigation.state === 'loading') &&
    navigation.formData?.get('_action') === 'connect';

  const [values, setValues] = React.useState<AccountSetupFormData>({
    serverURL: initialServerURL,
    timezone: initialTimezone,
  });

  const [errors, _setErrors] = React.useState<AccountSetupFormData>({
    serverURL: '',
    timezone: '',
  });

  const timezoneOptions = React.useMemo(
    () => timezones.map(({ name, utcOffset }) => ({ label: `${name} (${utcOffset})`, name, utcOffset })),
    [],
  );

  const hasErrors = React.useMemo(
    () => Object.keys(errors).reduce((prev, current) => prev || !!errors[current as keyof AccountSetupFormData], false),
    [errors],
  );

  // TODO: Implement validation logic

  return (
    <Dialog fullScreen={fullScreen} open onClose={onClose}>
      <DialogTitle>{t('dialog.title')}</DialogTitle>
      <DialogContent>
        <StepProgress currentStep={currentStep}></StepProgress>
        <DialogContentText>{t('dialog.description')}</DialogContentText>
        <Form method="post">
          <FormGroup sx={{ mt: 4 }}>
            <StyledTextField
              margin="normal"
              required
              fullWidth
              label={t('form.serverUrl.label')}
              name="serverURL"
              value={values.serverURL}
              onChange={(event) => setValues({ ...values, serverURL: event.target.value })}
              helperText={t('form.serverUrl.helperText')}
              error={!!errors.serverURL}
            />
          </FormGroup>
          <FormGroup sx={{ mt: 4 }}>
            <Autocomplete
              disablePortal
              options={timezoneOptions}
              fullWidth
              value={timezoneOptions.find(({ name }) => name === values.timezone)}
              onChange={(_, value) => {
                // Extract just the timezone name without the offset part
                const timezoneName = value?.name ?? '';
                setValues({ ...values, timezone: timezoneName });
              }}
              renderInput={(params) => (
                <StyledTextField
                  {...params}
                  margin="normal"
                  required
                  name="timezone"
                  label={t('form.timezone.label')}
                  helperText={t('form.timezone.helperText')}
                  error={!!errors.timezone}
                />
              )}
            />
          </FormGroup>
          {hasErrors && <Alert severity="error">{t('form.validationError')}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <DialogActions sx={{ mb: 1, mr: 2, mt: 2, pl: 0 }}>
            {onClose && (
              <StyledButton variant="outlined" onClick={() => onClose()}>
                {t('form.cancel')}
              </StyledButton>
            )}
            <StyledButton variant="contained" type="submit" name="_action" value="connect" disabled={isSubmitting}>
              {isSubmitting ? t('form.connecting') : t('form.connect')}
            </StyledButton>
          </DialogActions>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

interface StepTwoProps {
  currentStep: number;
  url: string;
  onClose?: () => void;
}

export const StepTwo: React.FunctionComponent<StepTwoProps> = ({ currentStep, url, onClose }) => {
  const { t } = useTranslation('components.accountSetup');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog fullScreen={fullScreen} open onClose={onClose}>
      <DialogTitle>{t('dialog.title')}</DialogTitle>
      <DialogContent>
        <StepProgress currentStep={currentStep}></StepProgress>
        <DialogContentText>{t('authorize.description')}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ mb: 1, mr: 2 }}>
        <StyledButton variant="contained" component="a" href={url}>
          {t('authorize.button')}
        </StyledButton>
      </DialogActions>
    </Dialog>
  );
};

interface AccountSetupProps {
  currentStep: number;
  authUrl?: string;
  initialServerURL?: string;
  initialTimezone?: string;
  onClose?: () => void;
  error?: string;
}

const AccountSetup: React.FunctionComponent<AccountSetupProps> = ({
  currentStep,
  authUrl = '',
  initialServerURL = '',
  initialTimezone = '',
  onClose,
  error,
}) => {
  switch (currentStep) {
    case 0:
      return (
        <StepOne
          currentStep={currentStep}
          onClose={onClose}
          initialServerURL={initialServerURL}
          initialTimezone={initialTimezone}
          error={error}
        />
      );
    case 1:
      return <StepTwo currentStep={currentStep} url={authUrl} onClose={onClose} />;
    default:
      return <></>;
  }
};

export default AccountSetup;
