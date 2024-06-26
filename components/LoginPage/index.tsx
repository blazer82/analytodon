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
import Footer from '@/components/Footer';
import {login} from '@/redux/auth/action/login';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {Alert} from '@mui/material';
import Head from 'next/head';
import {useRouter} from 'next/router';
import NextLink from 'next/link';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const LoginPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {loginInProgress, loginError, user, account} = useAppSelector(({auth}) => auth);
    const router = useRouter();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        dispatch(login(data.get('email')?.toString() ?? '', data.get('password')?.toString() ?? ''));
    };

    React.useEffect(() => {
        if (user) {
            if (account) {
                router.replace(`${publicRuntimeConfig.appURL}/dashboard/${account._id}`);
            } else {
                router.replace('/');
            }
        }
    }, [user, router, account]);

    return (
        <Container component="main" maxWidth="xs">
            <Head>
                <title>Sign in to Analytodon</title>
            </Head>
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Avatar sx={{m: 1, bgcolor: 'primary.main'}}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Sign in to Analytodon
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{mt: 1}}>
                    <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email" autoComplete="email" autoFocus />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                    />
                    {loginError && <Alert severity="error">{loginError}</Alert>}
                    <Button type="submit" disabled={loginInProgress} fullWidth variant="contained" sx={{mt: 3, mb: 2}}>
                        Sign In
                    </Button>
                    <Grid container>
                        <Grid item>
                            <NextLink href="/register" passHref legacyBehavior>
                                <Link variant="body2">{"Don't have an account? Sign up!"}</Link>
                            </NextLink>
                        </Grid>
                        <Grid item>
                            <NextLink href="/reset-password" passHref legacyBehavior>
                                <Link variant="body2">{'Forgot your password? Click here!'}</Link>
                            </NextLink>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Footer />
        </Container>
    );
};

export default LoginPage;
