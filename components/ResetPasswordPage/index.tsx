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
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {Alert} from '@mui/material';
import Head from 'next/head';
import NextLink from 'next/link';
import {resetPasswordRequest} from '@/redux/auth/action/resetPasswordRequest';
import ResetPasswordRequestFormSchema, {ResetPasswordRequestFormData} from '@/schemas/resetPasswordRequestForm';
import ResetPasswordFormSchema, {ResetPasswordFormData} from '@/schemas/resetPasswordForm';
import {resetPassword} from '@/redux/auth/action/resetPassword';

const RequestLink: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {resetPasswordRequestError} = useAppSelector(({auth}) => auth);
    const [requested, setRequested] = React.useState(false);

    const [values, setValues] = React.useState<ResetPasswordRequestFormData>({
        email: '',
    });

    const [errors, setErrors] = React.useState<ResetPasswordRequestFormData>({
        email: '',
    });

    const hasErrors = React.useMemo(
        () => Object.keys(errors).reduce((prev, current) => prev || !!errors[current as keyof ResetPasswordRequestFormData], false),
        [errors],
    );

    const validate = React.useCallback(() => {
        const {value, error} = ResetPasswordRequestFormSchema.validate(values, {abortEarly: false, errors: {render: false}});

        const formErrors: ResetPasswordRequestFormData = {
            email: '',
        };

        if ((error?.details?.length ?? 0) > 0) {
            for (const detail of error?.details ?? []) {
                const key = `${detail.path}` as keyof ResetPasswordRequestFormData;
                formErrors[key] = detail.message;
            }
            setErrors(formErrors);
            return null;
        }

        setErrors(formErrors);
        return value;
    }, [values]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = validate();
        if (value) {
            dispatch(resetPasswordRequest(value.email));
        }
        setRequested(true);
    };

    React.useEffect(() => {
        if (resetPasswordRequestError || hasErrors) {
            setRequested(false);
        }
    }, [resetPasswordRequestError, hasErrors]);

    return (
        <Container component="main" maxWidth="xs">
            <Head>
                <title>Reset your Analytodon password</title>
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
                    Reset your Analytodon password
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{mt: 1}}>
                    <TextField
                        error={!!errors.email}
                        margin="normal"
                        required
                        fullWidth
                        label="Your Email Address"
                        name="email"
                        value={values.email}
                        onChange={(event) => setValues({...values, email: event.target.value})}
                        autoComplete="email"
                        autoFocus
                    />
                    {hasErrors && <Alert severity="error">Please enter valid values into all form fields.</Alert>}
                    {resetPasswordRequestError && <Alert severity="error">{resetPasswordRequestError}</Alert>}
                    <Button type="submit" disabled={requested} fullWidth variant="contained" sx={{mt: 3, mb: 2}}>
                        {requested ? 'Check your emails!' : 'Send reset link'}
                    </Button>
                    <Grid container>
                        <Grid item>
                            <NextLink href="/login" passHref legacyBehavior>
                                <Link variant="body2">{"Don't need to reset your password? Log in here!"}</Link>
                            </NextLink>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Footer />
        </Container>
    );
};

const ResetPassword: React.FunctionComponent<{token: string}> = ({token}) => {
    const dispatch = useAppDispatch();
    const {resetPasswordError} = useAppSelector(({auth}) => auth);
    const [requested, setRequested] = React.useState(false);

    const [values, setValues] = React.useState<ResetPasswordFormData>({
        token,
        password: '',
    });

    const [errors, setErrors] = React.useState<ResetPasswordFormData>({
        token: '',
        password: '',
    });

    const hasErrors = React.useMemo(
        () => Object.keys(errors).reduce((prev, current) => prev || !!errors[current as keyof ResetPasswordFormData], false),
        [errors],
    );

    const validate = React.useCallback(() => {
        const {value, error} = ResetPasswordFormSchema.validate(values, {abortEarly: false, errors: {render: false}});

        const formErrors: ResetPasswordFormData = {
            token: '',
            password: '',
        };

        if ((error?.details?.length ?? 0) > 0) {
            for (const detail of error?.details ?? []) {
                const key = `${detail.path}` as keyof ResetPasswordFormData;
                formErrors[key] = detail.message;
            }
            setErrors(formErrors);
            return null;
        }

        setErrors(formErrors);
        return value;
    }, [values]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = validate();
        if (value) {
            dispatch(resetPassword(value.token, value.password));
        }
        setRequested(true);
    };

    React.useEffect(() => {
        if (resetPasswordError) {
            setRequested(false);
        }
    }, [resetPasswordError]);

    return (
        <Container component="main" maxWidth="xs">
            <Head>
                <title>Reset your Analytodon password</title>
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
                    Reset your Analytodon password
                </Typography>
                {!requested && (
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{mt: 1}}>
                        <TextField
                            error={!!errors.password}
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Choose a Password"
                            type="password"
                            value={values.password}
                            onChange={(event) => setValues({...values, password: event.target.value})}
                            autoComplete="current-password"
                        />
                        {hasErrors && <Alert severity="error">Please enter valid values into all form fields.</Alert>}
                        {resetPasswordError && <Alert severity="error">{resetPasswordError}</Alert>}
                        <Button type="submit" disabled={requested} fullWidth variant="contained" sx={{mt: 3, mb: 2}}>
                            Reset your password
                        </Button>
                        <Grid container>
                            <Grid item>
                                <NextLink href="/login" passHref legacyBehavior>
                                    <Link variant="body2">{"Don't need to reset your password? Log in here!"}</Link>
                                </NextLink>
                            </Grid>
                        </Grid>
                    </Box>
                )}
                {requested && (
                    <Typography component="h1" variant="h6" mt={10}>
                        <NextLink href="/login" passHref legacyBehavior>
                            <Link>{'Your password has been reset - log in here!'}</Link>
                        </NextLink>
                    </Typography>
                )}
            </Box>
            <Footer />
        </Container>
    );
};

const ResetPasswordPage: React.FunctionComponent<{token?: string}> = ({token}) => {
    if (!token) {
        return <RequestLink />;
    }
    return <ResetPassword token={token} />;
};

export default ResetPasswordPage;
