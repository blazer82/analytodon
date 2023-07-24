import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {
    Alert,
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormGroup,
    Step,
    StepLabel,
    Stepper,
    TextField,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import * as React from 'react';
import timezones from '@/helpers/timezones.json';
import accountSetupSchema, {AccountSetupFormData} from '@/schemas/accountSetupForm';
import {connectAccount} from '@/redux/accounts/action/connectAccount';
import {useRouter} from 'next/router';

export const StepProgress: React.FunctionComponent<{currentStep: number}> = ({currentStep}) => {
    return (
        <Stepper activeStep={currentStep} alternativeLabel sx={{mb: 4, mt: 2}}>
            <Step>
                <StepLabel>Connect</StepLabel>
            </Step>
            <Step>
                <StepLabel>Authorize</StepLabel>
            </Step>
            <Step>
                <StepLabel>Complete</StepLabel>
            </Step>
        </Stepper>
    );
};

const StepOne: React.FunctionComponent<{currentStep: number; onClose?: () => void}> = ({currentStep, onClose}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
    const dispatch = useAppDispatch();

    const {user} = useAppSelector(({auth}) => auth);
    const {error, isLoading} = useAppSelector(({accounts}) => accounts);

    const [values, setValues] = React.useState<AccountSetupFormData>({
        serverURL: user?.serverURLOnSignUp ?? '',
        timezone: user?.timezone ?? '',
    });

    const [errors, setErrors] = React.useState<AccountSetupFormData>({
        serverURL: '',
        timezone: '',
    });

    const timezoneOptions = React.useMemo(() => timezones.map(({name, utcOffset}) => ({label: `${name} (${utcOffset})`, name, utcOffset})), []);

    const hasErrors = React.useMemo(
        () => Object.keys(errors).reduce((prev, current) => prev || !!errors[current as keyof AccountSetupFormData], false),
        [errors],
    );

    const validate = React.useCallback(() => {
        const {value, error} = accountSetupSchema.validate(values, {abortEarly: false, errors: {render: false}});

        const formErrors: AccountSetupFormData = {
            serverURL: '',
            timezone: '',
        };

        if ((error?.details?.length ?? 0) > 0) {
            for (const detail of error?.details ?? []) {
                const key = `${detail.path}` as keyof AccountSetupFormData;
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
            dispatch(connectAccount(value));
        }
    }, [validate, dispatch]);

    return (
        <Dialog fullScreen={fullScreen} open onClose={onClose}>
            <DialogTitle>Set Up Your Mastodon Account</DialogTitle>
            <DialogContent>
                <StepProgress currentStep={currentStep}></StepProgress>
                <DialogContentText>In order to use Analytodon, you need to connect your Mastodon account.</DialogContentText>
                <FormGroup sx={{mt: 4}}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Server URL (e.g. mastodon.social)"
                        name="serverURL"
                        value={values.serverURL}
                        onChange={(event) => setValues({...values, serverURL: event.target.value})}
                        helperText="The URL of the Mastodon instance your account is on."
                    />
                </FormGroup>
                <FormGroup sx={{mt: 4}}>
                    <Autocomplete
                        disablePortal
                        options={timezoneOptions}
                        fullWidth
                        value={timezoneOptions.find(({name}) => name === values.timezone)}
                        onChange={(_, value) => setValues({...values, timezone: value?.name ?? ''})}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="normal"
                                required
                                name="timezone"
                                label="Timezone"
                                helperText="The timezone you want your analytics reports to be in."
                            />
                        )}
                    />
                </FormGroup>
                {hasErrors && <Alert severity="error">Please enter valid values into all form fields.</Alert>}
                {!!error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{mb: 1, mr: 2}}>
                {onClose && (
                    <Button variant="outlined" onClick={() => onClose()}>
                        Cancel
                    </Button>
                )}
                <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
                    Connect Account
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const StepTwo: React.FunctionComponent<{currentStep: number; url: string; onClose?: () => void}> = ({currentStep, url, onClose}) => {
    const theme = useTheme();
    const router = useRouter();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    const handleSubmit = React.useCallback(() => {
        router.push(url);
    }, [router, url]);

    return (
        <Dialog fullScreen={fullScreen} open onClose={onClose}>
            <DialogTitle>Set Up Your Mastodon Account</DialogTitle>
            <DialogContent>
                <StepProgress currentStep={currentStep}></StepProgress>
                <DialogContentText>
                    For this next step you&apos;ll need to authorize Analytodon with your Mastodon account. Click on the button below to go to your instance and
                    authorize Analytodon.
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{mb: 1, mr: 2}}>
                <Button variant="contained" onClick={handleSubmit}>
                    Authorize Analytodon
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const AccountSetup: React.FunctionComponent<{onClose?: () => void}> = ({onClose}) => {
    const {connect} = useAppSelector(({accounts}) => accounts);

    const currentStep = React.useMemo(() => (connect?.url ? 1 : 0), [connect]);

    switch (currentStep) {
        case 0:
            return <StepOne currentStep={currentStep} onClose={onClose} />;
        case 1:
            return <StepTwo currentStep={currentStep} url={connect?.url ?? ''} onClose={onClose} />;
        default:
            return <></>;
    }
};

export default AccountSetup;
