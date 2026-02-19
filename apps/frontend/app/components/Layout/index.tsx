import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionUserDto } from '@analytodon/rest-client';
import AccountIcon from '@mui/icons-material/AccountCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  List,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { Form, useNavigation, useRouteLoaderData } from '@remix-run/react';
import type { AdminViewAsData } from '~/utils/admin-view';

import AccountOwnerNavigation from '../AccountOwnerNavigation';
import AdminViewBanner from '../AdminViewBanner';
import Footer from '../Footer';
import Logo from '../Logo';
import { AppBarContent, AppBarTitle, DashboardContainer, DrawerHeader, UserInfo } from './styles';
import { AppBar, Drawer } from './ux';

type AccountDto = SessionUserDto['accounts'][0];

interface LayoutProps {
  title: string;
  children: React.ReactNode;
  accountName?: string;
  username?: string;
  avatarURL?: string;
}

const Layout: React.FC<LayoutProps> = ({ title, children, accountName, username, avatarURL }) => {
  const { t } = useTranslation('components.layout');
  const theme = useTheme();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const isLoadingPage = navigation.state === 'loading';
  const [open, setOpen] = React.useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  interface AppLoaderData {
    user?: SessionUserDto;
    currentAccount?: AccountDto | null;
    adminViewAs?: AdminViewAsData | null;
  }
  const routeLoaderData = useRouteLoaderData('routes/_app') as AppLoaderData | undefined;
  const user = routeLoaderData?.user;
  const currentAccount = routeLoaderData?.currentAccount;
  const adminViewAs = routeLoaderData?.adminViewAs;

  const handleMenu = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = React.useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Logout is handled by Form submission, this just closes the menu
  const handleLogoutClick = React.useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <Box sx={{ display: 'flex' }}>
      {isLoadingPage && (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            zIndex: (theme) => theme.zIndex.drawer + 2, // Ensure it's above AppBar
          }}
        />
      )}
      <AppBar position="absolute" open={open} elevation={2}>
        <Toolbar>
          <AppBarContent>
            <IconButton
              edge="start"
              color="inherit"
              aria-label={t('drawer.openAriaLabel')}
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
                {title}
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                  &nbsp;{accountName ? t('accountFor', { accountName }) : t('accountForDefault')}
                </Box>
              </Typography>
            </AppBarTitle>

            <UserInfo>
              <Typography
                variant="body2"
                color="inherit"
                noWrap
                sx={{ opacity: 0.9, display: { xs: 'none', md: 'block' } }}
              >
                {username || t('username')}
              </Typography>
              <IconButton
                size="medium"
                aria-label={t('accountMenu.ariaLabel')}
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
                {!adminViewAs &&
                  user &&
                  user.accounts &&
                  user.accounts
                    .filter((item: AccountDto) => item.id !== currentAccount?.id)
                    .map((item: AccountDto) => (
                      <MenuItem
                        key={item.id}
                        onClick={handleClose} // Close menu on click, form submission handles the rest
                        sx={{
                          borderRadius: 1,
                          mx: 0.5,
                          my: 0.25,
                          p: 0, // Remove padding for the Form/Button to fill
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor:
                              theme.palette.mode === 'light' ? 'rgba(69, 90, 100, 0.08)' : 'rgba(97, 125, 139, 0.2)',
                          },
                        }}
                      >
                        <Form method="post" action="/api/switch-account" style={{ width: '100%' }}>
                          <input type="hidden" name="accountId" value={item.id} />
                          <Button
                            type="submit"
                            sx={{
                              width: '100%',
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              padding: '6px 16px', // Mimic MenuItem padding
                              color: 'inherit',
                              fontWeight: 'inherit',
                            }}
                            disabled={
                              isSubmitting &&
                              navigation.formAction === '/api/switch-account' &&
                              navigation.formData?.get('accountId') === item.id
                            }
                          >
                            {isSubmitting &&
                            navigation.formAction === '/api/switch-account' &&
                            navigation.formData?.get('accountId') === item.id
                              ? t('accountMenu.switching')
                              : item.accountName || item.name}
                          </Button>
                        </Form>
                      </MenuItem>
                    ))}
                {!adminViewAs && user && user.accounts && user.accounts.length > 1 && <Divider sx={{ my: 1 }} />}
                <MenuItem sx={{ borderRadius: 1, mx: 0.5, my: 0.25, p: 0 }}>
                  <Form action="/logout" method="post" style={{ width: '100%' }}>
                    <Button
                      type="submit"
                      onClick={handleLogoutClick} // Use the renamed handler
                      sx={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                      }}
                      disabled={isSubmitting && navigation.formAction === '/logout'}
                    >
                      {isSubmitting && navigation.formAction === '/logout'
                        ? t('logout.loggingOut')
                        : t('logout.button')}
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
                {t('branding')}
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
        {adminViewAs && <AdminViewBanner accountName={adminViewAs.accountName} ownerEmail={adminViewAs.ownerEmail} />}
        {children}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Footer />
        </Container>
      </DashboardContainer>
    </Box>
  );
};

export default Layout;
