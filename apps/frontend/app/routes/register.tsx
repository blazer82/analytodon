import * as React from 'react';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type MetaFunction } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import Footer from '~/components/Footer';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign up for Analytodon' }];
};

export async function loader() {
  // TODO: Check if user is already authenticated and redirect to dashboard if so
  return null;
}

export async function action() {
  // This will be implemented later to handle the actual registration
  return { error: 'Registration functionality will be implemented soon' };
}

export default function Register() {
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
          Sign up for Analytodon
        </Typography>
        <Box component={Form} method="post" sx={{ mt: 1 }}>
          <TextField margin="normal" required fullWidth label="Your Email Address" name="email" autoComplete="email" />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Choose a Password"
            type="password"
            autoComplete="new-password"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Server URL (e.g. mastodon.social)"
            name="serverURL"
            helperText="The URL of the Mastodon instance your account is on."
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="timezone"
            label="Timezone"
            helperText="The timezone you want your analytics reports to be in."
          />
          {actionData?.error && <Alert severity="error">{actionData.error}</Alert>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Sign up
          </Button>
          <Grid container>
            <Grid>
              <Link href="/login" variant="body2">
                {'Already have an account? Log in!'}
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Footer />
    </Container>
  );
}
