import * as React from 'react';
import Container from '@mui/material/Container';
import Layout from '../Layout';
import {useAppSelector} from '@/redux/hooks';
import {Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import NextLink from 'next/link';
import {formatDate} from '@/helpers/localization';

const UsersPage: React.FunctionComponent = () => {
    const {list} = useAppSelector(({users}) => users);

    return (
        <Layout title="User list">
            <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                <TableContainer component={Paper}>
                    <Table sx={{minWidth: 650}} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell></TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Accounts</TableCell>
                                <TableCell>Last Activity</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {list?.map((user, index) => (
                                <TableRow key={user._id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <NextLink href={`/admin/users/${user._id}`} passHref legacyBehavior>
                                            <Link>{user.email}</Link>
                                        </NextLink>
                                    </TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell>
                                        {user.accounts?.map(({_id, accountName}) => (
                                            <React.Fragment key={_id}>
                                                {accountName}
                                                <br />
                                            </React.Fragment>
                                        ))}
                                    </TableCell>
                                    <TableCell>{user.credentials?.updatedAt && formatDate(user.credentials?.updatedAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Container>
        </Layout>
    );
};

export default UsersPage;
