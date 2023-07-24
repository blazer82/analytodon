import type {AppProps} from 'next/app';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {wrapper} from '@/redux/store';
import {Provider} from 'react-redux';
import LoginRedirect from '@/components/LoginRedirect';
import UserSafeguard from '@/components/UserSafeguard';
import {useMediaQuery} from '@mui/material';
import {useMemo} from 'react';

export default function App({Component, ...rest}: AppProps) {
    const {store, props} = wrapper.useWrappedStore(rest);
    const {pageProps} = props;
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: prefersDarkMode ? 'dark' : 'light',
                },
            }),
        [prefersDarkMode],
    );

    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LoginRedirect />
                <UserSafeguard>
                    <Component {...pageProps} />
                </UserSafeguard>
            </ThemeProvider>
        </Provider>
    );
}
