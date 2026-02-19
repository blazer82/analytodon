import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Select,
  Snackbar,
  Typography,
} from '@mui/material';
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useNavigation, useSubmit } from '@remix-run/react';
import { EnhancedPaper } from '~/components/Layout/styles';
import { StyledButton, StyledTextField } from '~/components/StyledFormElements';
import { createUsersApiWithAuth } from '~/services/api.server';
import logger from '~/services/logger.server';
import { requireUser, withSessionHandling } from '~/utils/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon - Email Broadcast' }];
};

export const handle = {
  i18n: 'routes.admin.email',
};

export const loader = withSessionHandling(async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  return {};
});

export const action = withSessionHandling(async ({ request }: ActionFunctionArgs) => {
  const user = await requireUser(request);

  if (user.role !== 'admin') {
    throw redirect('/dashboard');
  }

  const formData = await request.formData();
  const recipientGroup = formData.get('recipientGroup') as string;
  const recipients = formData.get('recipients') as string;
  const subject = formData.get('subject') as string;
  const text = formData.get('text') as string;
  const isTest = formData.get('isTest') === 'true';

  try {
    const usersApi = await createUsersApiWithAuth(request);
    await usersApi.usersControllerSendEmailToUsers({
      sendEmailDto: {
        recipientGroup: recipientGroup as 'all' | 'admins' | 'account-owners' | 'custom',
        recipients: recipients || undefined,
        subject,
        text,
        isTest,
      },
    });
    return json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    logger.error('Failed to send email broadcast:', error);
    return json({ error: 'errors.failedToSend' }, { status: 500 });
  }
});

export default function AdminEmailBroadcast() {
  const { t } = useTranslation('routes.admin.email');
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === 'submitting';
  const formRef = React.useRef<HTMLFormElement>(null);

  const [recipientGroup, setRecipientGroup] = React.useState<string>('all');
  const [isTest, setIsTest] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const [errorSnackbarOpen, setErrorSnackbarOpen] = React.useState(!!actionData?.error);
  const [successSnackbarOpen, setSuccessSnackbarOpen] = React.useState(!!actionData?.success);

  React.useEffect(() => {
    setErrorSnackbarOpen(!!actionData?.error);
    setSuccessSnackbarOpen(!!actionData?.success);
  }, [actionData]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isTest) {
      submit(formRef.current);
    } else {
      setConfirmOpen(true);
    }
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    submit(formRef.current);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4, animation: 'fadeIn 0.6s ease-out' }}>
      <EnhancedPaper>
        <Form method="post" ref={formRef} onSubmit={handleSubmit}>
          <FormGroup sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('form.recipientGroup')}
            </Typography>
            <Select
              name="recipientGroup"
              value={recipientGroup}
              onChange={(e) => setRecipientGroup(e.target.value)}
              size="small"
              fullWidth
            >
              <MenuItem value="all">{t('form.groupAll')}</MenuItem>
              <MenuItem value="admins">{t('form.groupAdmins')}</MenuItem>
              <MenuItem value="account-owners">{t('form.groupAccountOwners')}</MenuItem>
              <MenuItem value="custom">{t('form.groupCustom')}</MenuItem>
            </Select>
          </FormGroup>

          {recipientGroup === 'custom' && (
            <FormGroup sx={{ mb: 3 }}>
              <StyledTextField
                label={t('form.customRecipients')}
                name="recipients"
                helperText={t('form.customRecipientsHelp')}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </FormGroup>
          )}

          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.subject')}
              name="subject"
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <StyledTextField
              label={t('form.body')}
              name="text"
              multiline
              rows={8}
              helperText={t('form.bodyHelp')}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </FormGroup>

          <FormGroup sx={{ mb: 3 }}>
            <FormControlLabel
              control={<Checkbox checked={isTest} onChange={(e) => setIsTest(e.target.checked)} />}
              label={t('form.isTest')}
            />
            <input type="hidden" name="isTest" value={String(isTest)} />
          </FormGroup>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <StyledButton variant="contained" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('actions.sending') : t('actions.send')}
            </StyledButton>
          </Box>
        </Form>
      </EnhancedPaper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('confirm.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('confirm.message')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('confirm.cancel')}</Button>
          <Button onClick={handleConfirm} variant="contained" color="primary">
            {t('confirm.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={errorSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error">{t(actionData?.error || '')}</Alert>
      </Snackbar>
      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSuccessSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success">{t('success.emailSent')}</Alert>
      </Snackbar>
    </Container>
  );
}
