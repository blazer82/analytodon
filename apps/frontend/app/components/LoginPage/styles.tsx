import { keyframes } from '@emotion/react';
import { Box, Button, styled, TextField } from '@mui/material';

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

export const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

// Styled components
export const LoginContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

export const FormSection = styled(Box)(({ theme }) => ({
  flex: '1 1 50%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(4),
  [theme.breakpoints.down('md')]: {
    flex: '1 1 100%',
  },
}));

export const HeroSection = styled(Box)(({ theme }) => ({
  flex: '1 1 50%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(4),
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    flex: '0 1 auto',
    minHeight: '300px',
    paddingTop: theme.spacing(6),
    paddingBottom: theme.spacing(6),
  },
}));

export const FormCard = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '450px',
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'light' ? '#ffffff' : theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  animation: `${fadeIn} 0.6s ease-out`,
}));

export const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiOutlinedInput-root': {
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
      },
    },
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderWidth: '2px',
      },
    },
  },
  '& .MuiInputLabel-root': {
    transition: 'all 0.2s ease-in-out',
  },
}));

export const SubmitButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(3),
  padding: theme.spacing(1.2),
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  '&:active': {
    transform: 'translateY(0)',
    boxShadow: theme.shadows[2],
    animation: `${pulse} 0.8s`,
  },
}));

export const LinksContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

export const LogoContainer = styled(Box)({
  marginBottom: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

export const HeroContent = styled(Box)(() => ({
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  maxWidth: '80%',
}));

export const HeroBackground = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  opacity: 0.1,
});
