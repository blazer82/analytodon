import * as React from 'react';
import Container from '@mui/material/Container';
import Layout from '../Layout';
import {Alert, Box, Button, FormControl, FormGroup, InputLabel, MenuItem, Paper, Select, Snackbar, TextField} from '@mui/material';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {Email} from '@/types/Email';
import {sendEmail} from '@/redux/users/action/sendEmail';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const EmailPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {error, isLoading} = useAppSelector(({users}) => users);

    const [errorSnackbarOpen, setErrorSnackbarOpen] = React.useState(!!error);
    const [successSnackbarOpen, setSuccessSnackbarOpen] = React.useState(false);
    const [formSubmitted, setFormSubmitted] = React.useState(false);

    const [values, setValues] = React.useState<Email>({
        recipientGroup: 'account-owner',
        recipients: '',
        subject: '',
        text: `Hi,

Unsubscribe: https://${publicRuntimeConfig.appURL}/unsubscribe/news?u=[[userid]]&e=[[email]]

Best regards,
Raphael Stäbler

Analytodon
Owner: Raphael Stäbler
Bischofsweg 31
60598 Frankfurt am Main
Germany

Email: ${publicRuntimeConfig.supportEmail}
Website: ${publicRuntimeConfig.marketingURL}
Mastodon: https://undefined.social/@analytodon
`,
    });

    const handleTestSubmit = () => {
        setFormSubmitted(true);
        dispatch(sendEmail(values, true));
    };

    const handleSubmit = () => {
        setFormSubmitted(true);
        dispatch(sendEmail(values));
    };

    React.useEffect(() => setErrorSnackbarOpen(!!error), [error]);
    React.useEffect(() => setSuccessSnackbarOpen(formSubmitted && !isLoading), [isLoading, formSubmitted]);

    return (
        <>
            <Layout title="Email">
                <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                    <Paper sx={{p: 4}}>
                        <FormControl sx={{mb: 4}}>
                            <InputLabel id="recipients-label">Recipients</InputLabel>
                            <Select
                                labelId="recipients-label"
                                value={values.recipientGroup}
                                label="Recipients"
                                onChange={(event) => setValues({...values, recipientGroup: event.target.value})}
                            >
                                <MenuItem value="account-owner">Active Account Owners</MenuItem>
                                <MenuItem value="custom">Custom Recipients</MenuItem>
                            </Select>
                        </FormControl>
                        {values.recipientGroup === 'custom' && (
                            <FormGroup sx={{mb: 4}}>
                                <TextField
                                    label="Recipients (1 per line)"
                                    multiline
                                    value={values.recipients}
                                    onChange={(event) => setValues({...values, recipients: event.target.value})}
                                />
                            </FormGroup>
                        )}
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Subject" value={values.subject} onChange={(event) => setValues({...values, subject: event.target.value})} />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Body" multiline value={values.text} onChange={(event) => setValues({...values, text: event.target.value})} />
                        </FormGroup>
                        <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'right'}}>
                            <Button variant="outlined" sx={{mr: 2}} onClick={() => window.history.go(-1)}>
                                Back
                            </Button>
                            <Button variant="outlined" sx={{mr: 2}} onClick={handleTestSubmit}>
                                Send Test
                            </Button>
                            <Button variant="contained" onClick={handleSubmit}>
                                Send
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
                <Alert severity="success">Email sent.</Alert>
            </Snackbar>
        </>
    );
};

export default EmailPage;
