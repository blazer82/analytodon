import * as React from 'react';

import AccountIcon from '@mui/icons-material/AccountCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import { Avatar, Button, Container, Divider, Menu, MenuItem, Toolbar, Typography, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import { Form, useRouteLoaderData } from '@remix-run/react';

import AccountOwnerNavigation from '../AccountOwnerNavigation';
import Footer from '../Footer';
import Logo from '../Logo';
import { AppBarContent, AppBarTitle, DashboardContainer, DrawerHeader, UserInfo } from './styles';
import { AppBar, Drawer } from './ux';

interface LayoutProps {
  title: string;
  children: React.ReactNode;
  accountName?: string;
  username?: string;
  avatarURL?: string;
}

const Layout: React.FC<LayoutProps> = ({ title, children, accountName, username, avatarURL }) => {
  const theme = useTheme();
  const [open, setOpen] = React.useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { user, currentAccount } = useRouteLoaderData<{ user: any; currentAccount: any }>('routes/app') || {};

  const handleMenu = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = React.useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = React.useCallback(() => {
    // The actual logout happens in the Form submission to /logout
    handleClose();
  }, [handleClose]);

  // TODO: Implement account switching functionality
  const handleAccountSwitch = React.useCallback((_accountId: string) => {
    setAnchorEl(null);
    // Will be implemented later
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="absolute" open={open} elevation={2}>
        <Toolbar>
          <AppBarContent>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={toggleDrawer}
              sx={{
                marginRight: '24px',
                ...(open && { display: 'none' }),
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'rotate(180deg)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>

            <AppBarTitle>
              <Typography component="h1" variant="h6" color="inherit" noWrap>
                {title} for {accountName || 'Your Account'}
              </Typography>
            </AppBarTitle>

            <UserInfo>
              <Typography variant="body2" color="inherit" noWrap sx={{ opacity: 0.9 }}>
                {username || 'Username'}
              </Typography>
              <IconButton
                size="medium"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                sx={{
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                {!avatarURL && <AccountIcon />}
                {avatarURL && (
                  <Avatar
                    src={avatarURL}
                    sx={{
                      width: 32,
                      height: 32,
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                    }}
                  />
                )}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    borderRadius: 2,
                    mt: 1,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    overflow: 'visible',
                    '&:before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                    },
                  },
                }}
              >
                {user &&
                  user.accounts &&
                  user.accounts
                    .filter((item: any) => item.id !== currentAccount?.id)
                    .map((item: any) => (
                      <MenuItem
                        key={item.id}
                        onClick={() => handleAccountSwitch(item.id)}
                        sx={{
                          borderRadius: 1,
                          mx: 0.5,
                          my: 0.25,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor:
                              theme.palette.mode === 'light' ? 'rgba(69, 90, 100, 0.08)' : 'rgba(97, 125, 139, 0.2)',
                          },
                        }}
                      >
                        {item.accountName || item.name}
                      </MenuItem>
                    ))}
                {user && user.accounts && user.accounts.length > 1 && <Divider sx={{ my: 1 }} />}
                <MenuItem sx={{ borderRadius: 1, mx: 0.5, my: 0.25 }}>
                  <Form action="/logout" method="post" style={{ width: '100%' }}>
                    <Button
                      type="submit"
                      onClick={handleLogout}
                      sx={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                      }}
                    >
                      Logout
                    </Button>
                  </Form>
                </MenuItem>
              </Menu>
            </UserInfo>
          </AppBarContent>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          {open && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, flexGrow: 1 }}>
              <Logo size="x-small" withText={false} />
              <Typography
                variant="h6"
                sx={{
                  ml: 1,
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Analytodon
              </Typography>
            </Box>
          )}
          <IconButton
            onClick={toggleDrawer}
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'rotate(180deg)',
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List component="nav">
          <AccountOwnerNavigation />
        </List>
      </Drawer>

      <DashboardContainer>
        <Toolbar />
        {children}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Footer />
        </Container>
      </DashboardContainer>
    </Box>
  );
};

export default Layout;
