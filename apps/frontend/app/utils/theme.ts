import { useMemo } from 'react';

import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Creates and returns a MUI theme based on the user's preferred color scheme
 */
export function useAppTheme() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  return useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: '#5c6bc0', // Indigo-like color for Mastodon theme
            light: '#8e99f3',
            dark: '#26418f',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#26a69a', // Teal-like color
            light: '#64d8cb',
            dark: '#00766c',
            contrastText: '#ffffff',
          },
          background: {
            default: prefersDarkMode ? '#121212' : '#f5f7fa',
            paper: prefersDarkMode ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700,
          },
          h2: {
            fontWeight: 700,
          },
          h3: {
            fontWeight: 600,
          },
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 500,
          },
          h6: {
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 8,
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              variant: 'outlined',
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
        },
      }),
    [prefersDarkMode],
  );
}
