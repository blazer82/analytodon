import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionUserDto } from '@analytodon/rest-client';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BoostsIcon from '@mui/icons-material/Cached';
import RepliesIcon from '@mui/icons-material/Comment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmailIcon from '@mui/icons-material/Email';
import TopIcon from '@mui/icons-material/EmojiEvents';
import FollowersIcon from '@mui/icons-material/Group';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PeopleIcon from '@mui/icons-material/People';
import FavoritesIcon from '@mui/icons-material/Star';
import AccountsIcon from '@mui/icons-material/SupervisedUserCircle';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Box, Divider, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Tooltip } from '@mui/material';
import { Link, useLocation, useRouteLoaderData } from '@remix-run/react';
import type { AdminViewAsData } from '~/utils/admin-view';

import { NavItemContainer } from '../Layout/styles';

const AccountOwnerNavigation: React.FunctionComponent = () => {
  const { t } = useTranslation('components.navigation');
  const location = useLocation();
  const routeLoaderData = useRouteLoaderData('routes/_app') as
    | { user?: SessionUserDto; adminViewAs?: AdminViewAsData | null }
    | undefined;
  const user = routeLoaderData?.user;
  const adminViewAs = routeLoaderData?.adminViewAs;

  const viewAsSuffix = adminViewAs ? `?viewAs=${adminViewAs.accountId}` : '';

  const navigation = React.useMemo(() => {
    const sections = [
      {
        label: t('sections.analytics'),
        items: [
          { label: t('items.dashboard'), link: `/dashboard${viewAsSuffix}`, icon: <DashboardIcon /> },
          { label: t('items.followers'), link: `/followers${viewAsSuffix}`, icon: <FollowersIcon /> },
          { label: t('items.replies'), link: `/replies${viewAsSuffix}`, icon: <RepliesIcon /> },
          { label: t('items.boosts'), link: `/boosts${viewAsSuffix}`, icon: <BoostsIcon /> },
          { label: t('items.favorites'), link: `/favorites${viewAsSuffix}`, icon: <FavoritesIcon /> },
          { label: t('items.topPosts'), link: `/top-posts${viewAsSuffix}`, icon: <TopIcon /> },
        ],
      },
      {
        label: t('sections.settings'),
        items: [{ label: t('items.accounts'), link: '/settings/accounts', icon: <AccountsIcon /> }],
      },
    ];

    if (user?.role === 'admin') {
      sections.push({
        label: t('sections.admin'),
        items: [
          { label: t('items.adminDashboard'), link: '/admin/dashboard', icon: <AdminPanelSettingsIcon /> },
          { label: t('items.accountBrowser'), link: '/admin/accounts', icon: <ViewListIcon /> },
          { label: t('items.accountHealth'), link: '/admin/accounts-health', icon: <HealthAndSafetyIcon /> },
          { label: t('items.systemHealth'), link: '/admin/system-health', icon: <MonitorHeartIcon /> },
          { label: t('items.userManagement'), link: '/admin/users', icon: <PeopleIcon /> },
          { label: t('items.emailBroadcast'), link: '/admin/email', icon: <EmailIcon /> },
        ],
      });
    }

    return sections;
  }, [t, user?.role, viewAsSuffix]);

  return (
    <NavItemContainer>
      {navigation.map((folder, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Divider sx={{ my: 1.5, mx: 2 }} />}
          <ListSubheader
            component="div"
            inset
            sx={{
              background: 'transparent',
              fontWeight: 600,
              letterSpacing: '0.5px',
              fontSize: '0.75rem',
              opacity: 0.8,
            }}
          >
            {folder.label}
          </ListSubheader>
          {folder.items.map(({ label, link, icon }) => {
            const linkPathname = link.split('?')[0];
            const isActive = location.pathname === linkPathname;
            return (
              <Tooltip
                key={link}
                title={label}
                placement="right"
                arrow
                disableHoverListener={true}
                disableFocusListener={true}
              >
                <ListItemButton
                  component={Link}
                  to={link}
                  selected={isActive}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      transition: 'transform 0.2s ease',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        component="span"
                        sx={{
                          fontWeight: isActive ? 600 : 400,
                          position: 'relative',
                          '&::after': isActive
                            ? {
                                content: '""',
                                position: 'absolute',
                                bottom: -2,
                                left: 0,
                                width: '30%',
                                height: '2px',
                                backgroundColor: 'primary.main',
                                borderRadius: '2px',
                              }
                            : {},
                        }}
                      >
                        {label}
                      </Box>
                    }
                  />
                </ListItemButton>
              </Tooltip>
            );
          })}
        </React.Fragment>
      ))}
    </NavItemContainer>
  );
};

export default AccountOwnerNavigation;
