import { keyframes } from '@emotion/react';
import { Box, Paper, styled } from '@mui/material';

// Animations
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideIn = keyframes`
  from {
    transform: translateX(-10px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Styled components for the dashboard
export const DashboardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900],
  flexGrow: 1,
  height: '100vh',
  overflow: 'auto',
  position: 'relative',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='dashboard_grid' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='${encodeURIComponent(
    theme.palette.divider,
  )}' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23dashboard_grid)'/%3E%3C/svg%3E")`,
}));

export const EnhancedPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  borderRadius: (theme.shape.borderRadius as number) * 1.5,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  animation: `${fadeIn} 0.5s ease-out`,
  '&:hover': {
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.1)',
    transform: 'translateY(-2px)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    opacity: 0.7,
  },
}));

export const ChartPaper = styled(EnhancedPaper)({
  height: 240,
});

export const TotalBoxPaper = styled(EnhancedPaper)({
  height: 240,
});

export const DataTablePaper = styled(EnhancedPaper)({
  minHeight: 300,
});

export const NavItemContainer = styled(Box)(({ theme }) => ({
  '& .MuiListItemButton-root': {
    borderRadius: theme.shape.borderRadius,
    margin: theme.spacing(0.5, 1),
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
      transform: 'translateX(4px)',
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.mode === 'light' ? 'rgba(69, 90, 100, 0.08)' : 'rgba(97, 125, 139, 0.2)',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'light' ? 'rgba(69, 90, 100, 0.12)' : 'rgba(97, 125, 139, 0.3)',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '25%',
        height: '50%',
        width: '4px',
        backgroundColor: theme.palette.primary.main,
        borderRadius: '0 4px 4px 0',
      },
    },
    '& .MuiListItemIcon-root': {
      minWidth: 40,
      color: theme.palette.mode === 'light' ? theme.palette.primary.main : theme.palette.primary.light,
    },
  },
}));

export const AppBarContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: theme.spacing(0, 2),
}));

export const AppBarTitle = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  display: 'flex',
  alignItems: 'center',
  '& h1': {
    fontWeight: 600,
    background: `linear-gradient(45deg, ${theme.palette.primary.contrastText}, ${theme.palette.secondary.light})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textFillColor: 'transparent',
  },
}));

export const UserInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: '10%',
    width: '80%',
    height: '1px',
    background: theme.palette.divider,
  },
}));
