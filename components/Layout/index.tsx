import * as React from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import MenuIcon from '@mui/icons-material/Menu';
import AccountIcon from '@mui/icons-material/AccountCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {Avatar, Menu, MenuItem} from '@mui/material';
import Footer from '../Footer';
import {AppBar, Drawer} from './ux';
import AccountOwnerNavigation from '../AccountOwnerNavigation';
import Head from 'next/head';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {UserRole} from '@/types/UserRole';
import AdminNavigation from '../AdminNavigation';
import {logout} from '@/redux/auth/action/logout';
import {useRouter} from 'next/router';
import getConfig from 'next/config';
import {SessionAccount} from '@/types/Account';

const {publicRuntimeConfig} = getConfig();

interface LayoutProps {
    title: string;
}

const Layout: React.FunctionComponent<React.PropsWithChildren<LayoutProps>> = ({title, children}) => {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const {user, account} = useAppSelector(({auth}) => auth);

    const [open, setOpen] = React.useState(true);
    const toggleDrawer = () => {
        setOpen(!open);
    };

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleMenu = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    }, []);

    const handleClose = React.useCallback(() => {
        setAnchorEl(null);
    }, []);

    const handleLogout = React.useCallback(async () => {
        if (user) {
            dispatch(logout(user));
        }
    }, [user, dispatch]);

    const handleAccountSwitch = React.useCallback(
        (account: SessionAccount) => {
            setAnchorEl(null);
            router.push(`${publicRuntimeConfig.appURL}/dashboard/${account._id}`);
        },
        [router],
    );

    const accountName = React.useMemo(() => {
        if (user?.role === UserRole.Admin) {
            return 'Admin';
        } else if (router.asPath.startsWith('/settings/')) {
            return user?.email;
        }
        return account?.name;
    }, [user, account, router]);

    const username = React.useMemo(() => (user?.role === UserRole.Admin ? user?.email : account?.accountName), [user, account]);

    return user ? (
        <>
            <Head>
                <title>{`${title} for ${accountName} - Analytodon`}</title>
            </Head>
            <Box sx={{display: 'flex'}}>
                <AppBar position="absolute" open={open}>
                    <Toolbar
                        sx={{
                            pr: '24px', // keep right padding when drawer closed
                        }}
                    >
                        <IconButton
                            edge="start"
                            color="inherit"
                            aria-label="open drawer"
                            onClick={toggleDrawer}
                            sx={{
                                marginRight: '36px',
                                ...(open && {display: 'none'}),
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography component="h1" variant="h6" color="inherit" noWrap sx={{flexGrow: 1}}>
                            {title} for {accountName}
                        </Typography>
                        <Typography variant="caption" color="inherit" noWrap>
                            {username}
                        </Typography>
                        <div>
                            <IconButton
                                size="large"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleMenu}
                                color="inherit"
                            >
                                {!account?.avatarURL && <AccountIcon />}
                                {account?.avatarURL && <Avatar src={account.avatarURL} sx={{width: 24, height: 24}} />}
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                {(user.accounts ?? [])
                                    .filter((item) => item.accountURL !== account?.accountURL)
                                    .map((item) => (
                                        <MenuItem key={item.accountURL} onClick={() => handleAccountSwitch(item)}>
                                            {item.accountName}
                                        </MenuItem>
                                    ))}
                                {(user.accounts?.length ?? 0) > 1 && <Divider />}
                                <MenuItem onClick={handleLogout}>Logout</MenuItem>
                            </Menu>
                        </div>
                    </Toolbar>
                </AppBar>
                <Drawer variant="permanent" open={open}>
                    <Toolbar
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            px: [1],
                        }}
                    >
                        <IconButton onClick={toggleDrawer}>
                            <ChevronLeftIcon />
                        </IconButton>
                    </Toolbar>
                    <Divider />
                    <List component="nav">
                        {user.role === UserRole.Admin && <AdminNavigation />}
                        {user.role === UserRole.AccountOwner && <AccountOwnerNavigation />}
                    </List>
                </Drawer>
                <Box
                    component="main"
                    sx={{
                        backgroundColor: (theme) => (theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900]),
                        flexGrow: 1,
                        height: '100vh',
                        overflow: 'auto',
                    }}
                >
                    <Toolbar />
                    {children}
                    <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                        <Footer />
                    </Container>
                </Box>
            </Box>
        </>
    ) : (
        <></>
    );
};

export default Layout;
