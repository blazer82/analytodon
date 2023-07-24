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
import Head from 'next/head';
import NextLink from 'next/link';
import {Alert, Autocomplete} from '@mui/material';
import registrationFormSchema, {RegistrationFormData} from '@/schemas/registrationForm';
import timezones from '@/helpers/timezones.json';
import {register} from '@/redux/user/action/register';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {useRouter} from 'next/router';
import {serverNameFromUsername} from '@/helpers/serverNameFromUsername';

const RegisterPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {registrationInProcess, registrationError} = useAppSelector(({user}) => user);
    const {user} = useAppSelector(({auth}) => auth);
    const router = useRouter();

    const [values, setValues] = React.useState<RegistrationFormData>({
        email: '',
        password: '',
        serverURL: '',
        timezone: '',
    });

    const [errors, setErrors] = React.useState<RegistrationFormData>({
        email: '',
        password: '',
        serverURL: '',
        timezone: '',
    });

    const timezoneOptions = React.useMemo(() => timezones.map(({name, utcOffset}) => ({label: `${name} (${utcOffset})`, name, utcOffset})), []);

    const hasErrors = React.useMemo(
        () => Object.keys(errors).reduce((prev, current) => prev || !!errors[current as keyof RegistrationFormData], false),
        [errors],
    );

    const validate = React.useCallback(() => {
        const {value, error} = registrationFormSchema.validate(values, {abortEarly: false, errors: {render: false}});

        const formErrors: RegistrationFormData = {
            email: '',
            password: '',
            serverURL: '',
            timezone: '',
        };

        if ((error?.details?.length ?? 0) > 0) {
            for (const detail of error?.details ?? []) {
                const key = `${detail.path}` as keyof RegistrationFormData;
                formErrors[key] = detail.message;
            }
            setErrors(formErrors);
            return null;
        }

        setErrors(formErrors);
        return value;
    }, [values]);

    const handleSubmit = React.useCallback(() => {
        const value = validate();
        if (value) {
            dispatch(register(value));
        }
    }, [validate, dispatch]);

    React.useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    React.useEffect(() => {
        setValues((values) => ({
            ...values,
            serverURL: serverNameFromUsername(router.query?.username?.toString() ?? ''),
        }));
    }, [router]);

    return (
        <Container component="main" maxWidth="xs">
            <Head>
                <title>Sign up for Analytodon</title>
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
                    Sign up for Analytodon
                </Typography>
                <Box sx={{mt: 1}}>
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
                    <TextField
                        error={!!errors.serverURL}
                        margin="normal"
                        required
                        fullWidth
                        label="Server URL (e.g. mastodon.social)"
                        name="serverURL"
                        value={values.serverURL}
                        onChange={(event) => setValues({...values, serverURL: event.target.value})}
                        helperText="The URL of the Mastodon instance your account is on."
                    />
                    <Autocomplete
                        disablePortal
                        options={timezoneOptions}
                        fullWidth
                        value={timezoneOptions.find(({name}) => name === values.timezone)}
                        onChange={(_, value) => setValues({...values, timezone: value?.name ?? ''})}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                error={!!errors.timezone}
                                margin="normal"
                                required
                                name="timezone"
                                label="Timezone"
                                helperText="The timezone you want your analytics reports to be in."
                            />
                        )}
                    />
                    {hasErrors && <Alert severity="error">Please enter valid values into all form fields.</Alert>}
                    {!!registrationError && <Alert severity="error">{registrationError}</Alert>}
                    <Button fullWidth variant="contained" onClick={handleSubmit} disabled={registrationInProcess} sx={{mt: 3, mb: 2}}>
                        Sign up
                    </Button>
                    <Grid container>
                        <Grid item>
                            <NextLink href="/login" passHref legacyBehavior>
                                <Link variant="body2">{'Already have an account? Log in!'}</Link>
                            </NextLink>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
            <Footer />
        </Container>
    );
};

export default RegisterPage;
