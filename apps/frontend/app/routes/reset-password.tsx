import { type MetaFunction } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { Alert } from '@mui/material';
import Footer from '~/components/Footer';

export const meta: MetaFunction = () => {
  return [{ title: 'Reset your Analytodon password' }];
};

export async function loader() {
  return null;
}

export async function action() {
  // This will be implemented later to handle the actual password reset request
  return { error: 'Password reset functionality will be implemented soon' };
}

export default function ResetPassword() {
  const actionData = useActionData<typeof action>();

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Reset your Analytodon password
        </Typography>
        <Box component={Form} method="post" noValidate sx={{ mt: 1 }}>
          <TextField margin="normal" required fullWidth label="Your Email Address" name="email" autoComplete="email" />
          {actionData?.error && <Alert severity="error">{actionData.error}</Alert>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Send reset link
          </Button>
          <Grid container>
            <Grid>
              <Link href="/login" variant="body2">
                {"Don't need to reset your password? Log in here!"}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Footer />
    </Container>
  );
}
