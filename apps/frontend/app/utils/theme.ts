import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { deDE, enUS } from '@mui/material/locale';
import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const MUI_LOCALES = {
  en: enUS,
  de: deDE,
};

/**
 * Creates and returns a MUI theme based on the user's preferred color scheme and language
 */
export function useAppTheme() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const { i18n } = useTranslation();

  return useMemo(() => {
    const muiLocale = MUI_LOCALES[i18n.language as keyof typeof MUI_LOCALES] || enUS;

    return createTheme(
      {
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: prefersDarkMode ? '#8eb2c3' : '#455a64', // Slate blue color
            light: '#718792',
            dark: '#1c313a',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#607d8b', // Lighter slate blue for secondary actions
            light: '#8eacbb',
            dark: '#34515e',
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
      },
      muiLocale,
    );
  }, [prefersDarkMode, i18n.language]);
}
