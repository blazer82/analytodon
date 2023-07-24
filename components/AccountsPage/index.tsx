import * as React from 'react';
import Container from '@mui/material/Container';
import Layout from '../Layout';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    FormGroup,
    TextField,
    Alert,
    Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReconnectIcon from '@mui/icons-material/Sync';
import {useRouter} from 'next/router';
import {Account} from '@/types/Account';
import {formatDate} from '@/helpers/localization';
import {stripSchema} from '@/helpers/stripSchema';
import {deleteAccount} from '@/redux/accounts/action/deleteAccount';
import AccountSetup from '../AccountSetup';
import {connectAccount} from '@/redux/accounts/action/connectAccount';

const ReconnectDialog: React.FunctionComponent<{account: Account; onClose: () => void}> = ({account, onClose}) => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {connect} = useAppSelector(({accounts}) => accounts);

    const onDialogClose = React.useCallback(() => {
        onClose();
    }, [onClose]);

    const handleReconnect = React.useCallback(() => {
        dispatch(connectAccount({_id: account._id, serverURL: account.serverURL, timezone: account.timezone}));
    }, [dispatch, account]);

    React.useEffect(() => {
        if (connect?.url) {
            router.push(connect.url);
        }
    }, [router, connect]);

    return (
        <Dialog open onClose={onDialogClose}>
            <DialogTitle>Reconnect Account</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Use this if you want to reconnect your account <strong>{account.name ?? account.accountName ?? account._id}</strong> to your Mastodon
                    account.
                </DialogContentText>
                <DialogContentText sx={{mt: 1}}>
                    Doing so might be necessary if you revoked Analytodon&apos;s access token on your Mastodon account.
                </DialogContentText>
                <DialogContentText sx={{mt: 1}}>
                    Reconnecting your account <strong>won&apos;t alter or delete any analytics data</strong> gathered so far.
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{mb: 1, mr: 2}}>
                <Button variant="outlined" onClick={() => onClose()}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleReconnect}>
                    Reconnect Account
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const DeleteDialog: React.FunctionComponent<{account: Account; onClose: () => void}> = ({account, onClose}) => {
    const {isLoading, error} = useAppSelector(({accounts}) => accounts);
    const dispatch = useAppDispatch();

    const [value, setValue] = React.useState('');
    const [deleteStarted, setDeletedStarted] = React.useState(false);

    const onDialogClose = React.useCallback(() => {
        if (!isLoading) {
            onClose();
        }
    }, [isLoading, onClose]);

    const handleDelete = React.useCallback(() => {
        dispatch(deleteAccount(account));
    }, [dispatch, account]);

    React.useEffect(() => {
        if (deleteStarted && !isLoading && !error) {
            onClose();
        }
        if (isLoading) {
            setDeletedStarted(true);
        }
    }, [deleteStarted, isLoading, error, onClose]);

    return (
        <Dialog open onClose={onDialogClose}>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    This will delete the account <strong>{account.name ?? account.accountName ?? account._id}</strong> and all related analytics data. This
                    operation cannot be undone!
                </DialogContentText>
                <DialogContentText sx={{mt: 1}}>
                    To continue type <strong>delete</strong> into the field below:
                </DialogContentText>
                <FormGroup>
                    <TextField margin="normal" value={value} onChange={(event) => setValue(event.target.value)} required fullWidth />
                </FormGroup>
                {!!error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{mb: 1, mr: 2}}>
                <Button variant="outlined" onClick={() => onClose()}>
                    Cancel
                </Button>
                <Button variant="contained" onClick={handleDelete} disabled={value !== 'delete'}>
                    Delete Account
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const AccountsPage: React.FunctionComponent = () => {
    const router = useRouter();
    const {list} = useAppSelector(({accounts}) => accounts);
    const {user} = useAppSelector(({auth}) => auth);

    const [reconnectRequested, setReconnectRequested] = React.useState<Account | null>();
    const [deleteRequested, setDeleteRequested] = React.useState<Account | null>();
    const [addRequested, setAddRequested] = React.useState(false);

    const canAddAccount = React.useMemo(() => (user?.maxAccounts ?? 0) - (list?.length ?? 0) > 0, [user, list]);

    const handleReconnect = React.useCallback(
        (account: Account) => {
            setReconnectRequested(account);
        },
        [setReconnectRequested],
    );

    const handleEdit = React.useCallback(
        (account: Account) => {
            router.push(`/settings/accounts/${account._id}`);
        },
        [router],
    );

    const handleDelete = React.useCallback(
        (account: Account) => {
            setDeleteRequested(account);
        },
        [setDeleteRequested],
    );

    const handleAdd = React.useCallback(() => setAddRequested(true), [setAddRequested]);

    return (
        <Layout title="Account list">
            <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                <TableContainer component={Paper}>
                    <Table sx={{minWidth: 650}} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell>Server</TableCell>
                                <TableCell>Timezone</TableCell>
                                <TableCell>Added</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list?.map((account) => (
                                <TableRow key={account._id}>
                                    <TableCell>{account.name}</TableCell>
                                    <TableCell>{account.username}</TableCell>
                                    <TableCell>{stripSchema(account.serverURL)}</TableCell>
                                    <TableCell>{account.timezone}</TableCell>
                                    <TableCell>{formatDate(account.createdAt)}</TableCell>
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleReconnect(account)} title="Reconnect">
                                            <ReconnectIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleEdit(account)} title="Edit">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(account)} title="Delete">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {canAddAccount && (
                    <Box sx={{mt: 2}}>
                        <Button variant="contained" onClick={handleAdd}>
                            Add Account
                        </Button>
                    </Box>
                )}
                <Typography component="p" variant="body2" sx={{mt: 2}}>
                    {list?.length ?? 0} / {user?.maxAccounts ?? 0} used
                    {/*{' - '}
                        <NextLink href="#" passHref legacyBehavior>
                            <Link>need more?</Link>
                                </NextLink>*/}
                </Typography>
            </Container>
            {reconnectRequested && <ReconnectDialog account={reconnectRequested} onClose={() => setReconnectRequested(null)} />}
            {deleteRequested && <DeleteDialog account={deleteRequested} onClose={() => setDeleteRequested(null)} />}
            {addRequested && <AccountSetup onClose={() => setAddRequested(false)} />}
        </Layout>
    );
};

export default AccountsPage;
