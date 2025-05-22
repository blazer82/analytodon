import * as React from 'react';

import { keyframes } from '@emotion/react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, styled } from '@mui/material';
import { LinkProps as RemixLinkProps } from '@remix-run/react';

// Define a type that can accept MuiButtonProps and RemixLinkProps for the 'to' prop
type StyledButtonProps = MuiButtonProps & Partial<Pick<RemixLinkProps, 'to'>>;

const pulseAnimation = (color: string) => keyframes`
  0% {
    box-shadow: 0 0 0 0 ${color}66; // 0.4 opacity (e.g., "66" for "AA" in hex opacity)
  }
  70% {
    box-shadow: 0 0 0 10px ${color}00; // 0 opacity
  }
  100% {
    box-shadow: 0 0 0 0 ${color}00; // 0 opacity
  }
`;

const StyledMuiButton = styled(MuiButton)<StyledButtonProps>(({ theme }) => {
  const pulse = pulseAnimation(theme.palette.primary.main);
  return {
    paddingTop: theme.spacing(1.2), // Consistent with LoginPage SubmitButton
    paddingBottom: theme.spacing(1.2), // Consistent with LoginPage SubmitButton
    transition: 'all 0.2s ease-in-out',
    position: 'relative',
    overflow: 'hidden', // From LoginPage SubmitButton
    textTransform: 'none', // Default in theme, but good to ensure
    fontWeight: 600, // Default in theme
    borderRadius: theme.shape.borderRadius, // Default in theme (8px)

    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: theme.shadows[2],
      animation: `${pulse} 0.8s`,
    },
  };
});

const StyledButton: React.FC<StyledButtonProps> = (props) => {
  return <StyledMuiButton {...props} />;
};

export default StyledButton;
