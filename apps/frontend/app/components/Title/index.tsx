import * as React from 'react';

import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface TitleProps {
  children?: React.ReactNode;
}

export default function Title(props: TitleProps) {
  const theme = useTheme();

  return (
    <Typography
      component="h2"
      variant="h6"
      gutterBottom
      sx={{
        fontWeight: 600,
        position: 'relative',
        display: 'inline-block',
        mb: 2,
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -4,
          left: 0,
          width: '40px',
          height: '3px',
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          borderRadius: '2px',
        },
      }}
    >
      {props.children}
    </Typography>
  );
}
