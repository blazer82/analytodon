import {useAppSelector} from '@/redux/hooks';
import {Typography} from '@mui/material';
import Link from '@mui/material/Link';
import {useRouter} from 'next/router';
import {FunctionComponent, useMemo} from 'react';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const Footer: FunctionComponent = () => {
    const router = useRouter();
    const {user} = useAppSelector(({auth}) => auth);

    const hasEmailSupport = useMemo(() => !!user && !router.asPath.startsWith('/login') && !router.asPath.startsWith('/register'), [user, router]);

    return (
        <Typography variant="body2" color="text.secondary" align="center" sx={{mt: 8, mb: 4}}>
            {'Brought to you by '}
            <Link color="inherit" href={publicRuntimeConfig.marketingURL}>
                Analytodon
            </Link>
            {hasEmailSupport && (
                <>
                    {' | '}
                    <Link color="inherit" href={`mailto:${publicRuntimeConfig.supportEmail}?subject=Support`}>
                        Get Support
                    </Link>
                </>
            )}
        </Typography>
    );
};

export default Footer;
