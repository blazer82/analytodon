import { createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMemo } from 'react';

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
        },
      }),
    [prefersDarkMode],
  );
}
