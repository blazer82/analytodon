import * as React from 'react';
import { useTranslation } from 'react-i18next';

import BoostsIcon from '@mui/icons-material/Cached';
import RepliesIcon from '@mui/icons-material/Comment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TopIcon from '@mui/icons-material/EmojiEvents';
import FollowersIcon from '@mui/icons-material/Group';
import FavoritesIcon from '@mui/icons-material/Star';
import AccountsIcon from '@mui/icons-material/SupervisedUserCircle';
import { Box, Divider, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Tooltip } from '@mui/material';
import { Link, useLocation } from '@remix-run/react';

import { NavItemContainer } from '../Layout/styles';

const AccountOwnerNavigation: React.FunctionComponent = () => {
  const { t } = useTranslation('components.navigation');
  const location = useLocation();

  const navigation = React.useMemo(
    () => [
      {
        label: t('sections.analytics'),
        items: [
          { label: t('items.dashboard'), link: `/dashboard`, icon: <DashboardIcon /> },
          { label: t('items.followers'), link: `/followers`, icon: <FollowersIcon /> },
          { label: t('items.replies'), link: `/replies`, icon: <RepliesIcon /> },
          { label: t('items.boosts'), link: `/boosts`, icon: <BoostsIcon /> },
          { label: t('items.favorites'), link: `/favorites`, icon: <FavoritesIcon /> },
          { label: t('items.topPosts'), link: `/top-posts`, icon: <TopIcon /> },
        ],
      },
      {
        label: t('sections.settings'),
        items: [{ label: t('items.accounts'), link: '/settings/accounts', icon: <AccountsIcon /> }],
      },
    ],
    [t],
  );

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
          {folder.items.map(({ label, link, icon }) => (
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
                selected={location.pathname === link}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    transition: 'transform 0.2s ease',
                    transform: location.pathname === link ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      component="span"
                      sx={{
                        fontWeight: location.pathname === link ? 600 : 400,
                        position: 'relative',
                        '&::after':
                          location.pathname === link
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
          ))}
        </React.Fragment>
      ))}
    </NavItemContainer>
  );
};

export default AccountOwnerNavigation;
