import {refresh} from '@/redux/auth/action/refresh';
import {useAppDispatch} from '@/redux/hooks';
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Link, useMediaQuery, useTheme} from '@mui/material';
import {useRouter} from 'next/router';
import * as React from 'react';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const SubscribePage: React.FunctionComponent<{matchedCount: number; type: string; userID: string; email: string}> = ({matchedCount, type, userID, email}) => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    const handleUnsubscribeClick = React.useCallback(() => {
        router.push(`/unsubscribe/${type}?u=${userID}&e=${email}`);
    }, [router, type, userID, email]);

    const handleHomepageClick = React.useCallback(() => {
        router.replace('/');
    }, [router]);

    const success = matchedCount > 0;

    React.useEffect(() => {
        if (success) {
            dispatch(refresh());
        }
    }, [success, dispatch]);

    return (
        <Dialog fullScreen={fullScreen} open>
            {success && <DialogTitle>You&apos;re Now Subscribed</DialogTitle>}
            {!success && <DialogTitle>Something went wrong</DialogTitle>}
            <DialogContent>
                {success && <DialogContentText>You&apos;ve successfully subscribed to this list.</DialogContentText>}
                {!success && (
                    <DialogContentText>
                        Failed to subscribe you. Please <Link href={`mailto:${publicRuntimeConfig.supportEmail}?subject=Support`}>contact support</Link>.
                    </DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                {success && <Button onClick={handleUnsubscribeClick}>Unsubscribe</Button>}
                {!success && <Button onClick={handleHomepageClick}>Go to Analytodon</Button>}
            </DialogActions>
        </Dialog>
    );
};

export default SubscribePage;
