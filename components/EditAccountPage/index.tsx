import * as React from 'react';
import Container from '@mui/material/Container';
import Layout from '../Layout';
import {Alert, Box, Button, FormGroup, Link, Paper, Snackbar, TextField, Typography} from '@mui/material';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {Account} from '@/types/Account';
import {saveAccount} from '@/redux/accounts/action/saveAccount';
import {stripSchema} from '@/helpers/stripSchema';
import NextLink from 'next/link';

const EditAccountPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {current, error, isLoading} = useAppSelector(({accounts}) => accounts);

    const [errorSnackbarOpen, setErrorSnackbarOpen] = React.useState(!!error);
    const [successSnackbarOpen, setSuccessSnackbarOpen] = React.useState(false);
    const [formSubmitted, setFormSubmitted] = React.useState(false);

    const [values, setValues] = React.useState<Partial<Account>>({...(current ?? {}), serverURL: stripSchema(current?.serverURL ?? '')});

    const handleSubmit = () => {
        setFormSubmitted(true);
        dispatch(saveAccount(values));
    };

    React.useEffect(() => {
        if (current) {
            setValues({...current, serverURL: stripSchema(current.serverURL ?? '')});
        }
    }, [current, setValues]);

    React.useEffect(() => setErrorSnackbarOpen(!!error), [error]);
    React.useEffect(() => setSuccessSnackbarOpen(formSubmitted && !isLoading), [isLoading, formSubmitted]);

    return (
        <>
            <Layout title="Edit Account">
                <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                    <Paper sx={{p: 4}}>
                        <FormGroup sx={{mb: 4}}>
                            <TextField
                                label="Name"
                                value={values.name}
                                onChange={(event) => setValues({...values, name: event.target.value})}
                                InputLabelProps={{shrink: Boolean(values.name)}}
                            />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Username" value={values.username} disabled InputLabelProps={{shrink: Boolean(values.username)}} />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Server URL" value={values.serverURL} disabled InputLabelProps={{shrink: Boolean(values.serverURL)}} />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Account URL" value={values.accountURL} disabled InputLabelProps={{shrink: Boolean(values.accountURL)}} />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Avatar URL" value={values.avatarURL} disabled InputLabelProps={{shrink: Boolean(values.avatarURL)}} />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Timezone" value={values.timezone} disabled InputLabelProps={{shrink: Boolean(values.timezone)}} />
                        </FormGroup>
                        {current?.accountName && (
                            <Typography component="p">
                                Connected to{' '}
                                <NextLink href={current.accountURL ?? ''} passHref legacyBehavior>
                                    <Link target="_blank">{current.accountName}</Link>
                                </NextLink>
                                {/*<Button variant="outlined" size="small" sx={{ml: 2}}>
                                    Reconnect
                        </Button>*/}
                            </Typography>
                        )}
                        {!current?.accountName && (
                            <Typography component="p">
                                Not connected to any account
                                {/*<Button variant="outlined" size="small" sx={{ml: 2}}>
                                    Connect now
                        </Button>*/}
                            </Typography>
                        )}
                        <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'right'}}>
                            <Button variant="outlined" sx={{mr: 2}} onClick={() => window.history.go(-1)}>
                                Back
                            </Button>
                            <Button variant="contained" onClick={handleSubmit}>
                                Save
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Layout>
            <Snackbar
                open={errorSnackbarOpen}
                autoHideDuration={6000}
                onClose={() => setErrorSnackbarOpen(false)}
                anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
            >
                <Alert severity="error">{error}</Alert>
            </Snackbar>
            <Snackbar
                open={successSnackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSuccessSnackbarOpen(false)}
                anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
            >
                <Alert severity="success">Account saved.</Alert>
            </Snackbar>
        </>
    );
};

export default EditAccountPage;
