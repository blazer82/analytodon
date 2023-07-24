import * as React from 'react';
import Container from '@mui/material/Container';
import Layout from '../Layout';
import {Alert, Box, Button, FormControl, FormControlLabel, FormGroup, InputLabel, MenuItem, Paper, Select, Snackbar, Switch, TextField} from '@mui/material';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {UserRole} from '@/types/UserRole';
import {saveUser} from '@/redux/users/action/saveUser';
import {User} from '@/types/User';

const EditUserPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {current, error, isLoading} = useAppSelector(({users}) => users);

    const [errorSnackbarOpen, setErrorSnackbarOpen] = React.useState(!!error);
    const [successSnackbarOpen, setSuccessSnackbarOpen] = React.useState(false);
    const [formSubmitted, setFormSubmitted] = React.useState(false);

    const [values, setValues] = React.useState<Partial<User & {password: string}>>(current ?? {});

    const handleSubmit = () => {
        setFormSubmitted(true);
        dispatch(saveUser(values));
    };

    React.useEffect(() => setErrorSnackbarOpen(!!error), [error]);
    React.useEffect(() => setSuccessSnackbarOpen(formSubmitted && !isLoading), [isLoading, formSubmitted]);

    return (
        <>
            <Layout title="Edit User">
                <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                    <Paper sx={{p: 4}}>
                        <FormGroup sx={{mb: 4}}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        name="isActive"
                                        checked={values.isActive}
                                        onChange={(event) => setValues({...values, isActive: event.target.checked})}
                                    />
                                }
                                label="Active"
                            />
                        </FormGroup>
                        <FormControl sx={{mb: 4}}>
                            <InputLabel id="role-label">Role</InputLabel>
                            <Select
                                labelId="role-label"
                                value={values.role}
                                label="Role"
                                onChange={(event) => setValues({...values, role: event.target.value})}
                            >
                                <MenuItem value={UserRole.Admin}>Administrator</MenuItem>
                                <MenuItem value={UserRole.AccountOwner}>Account Owner</MenuItem>
                            </Select>
                        </FormControl>
                        <FormGroup sx={{mb: 4}}>
                            <TextField label="Email" value={values.email} onChange={(event) => setValues({...values, email: event.target.value})} />
                        </FormGroup>
                        <FormGroup sx={{mb: 4}}>
                            <TextField
                                label="Set New Password"
                                value={values.password}
                                onChange={(event) => setValues({...values, password: event.target.value})}
                            />
                        </FormGroup>
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
                <Alert severity="success">User saved.</Alert>
            </Snackbar>
        </>
    );
};

export default EditUserPage;
