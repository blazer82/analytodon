import * as React from 'react';

import { TextField as MuiTextField, TextFieldProps as MuiTextFieldProps, styled } from '@mui/material';

const StyledMuiTextField = styled(MuiTextField)<MuiTextFieldProps>(({ theme }) => ({
  transition: 'transform 0.2s ease-in-out', // For the translateY effect on the whole component
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
        borderColor: theme.palette.primary.main,
      },
    },
  },
  '& .MuiInputLabel-root': {
    transition: 'all 0.2s ease-in-out',
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
  '&:focus-within': {
    // This applies to the root when a child input is focused
    transform: 'translateY(-4px)',
  },
}));

const StyledTextField: React.FC<MuiTextFieldProps> = (props) => {
  return <StyledMuiTextField {...props} />;
};

export default StyledTextField;
