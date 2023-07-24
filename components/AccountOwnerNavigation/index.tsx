import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FollowersIcon from '@mui/icons-material/Group';
import RepliesIcon from '@mui/icons-material/Comment';
import BoostsIcon from '@mui/icons-material/Cached';
import FavoritesIcon from '@mui/icons-material/Star';
import TopIcon from '@mui/icons-material/EmojiEvents';
import AccountsIcon from '@mui/icons-material/SupervisedUserCircle';
import Divider from '@mui/material/Divider';
import {useRouter} from 'next/router';
import Link from 'next/link';
import {useAppSelector} from '@/redux/hooks';

const AccountOwnerNavigation: React.FunctionComponent = () => {
    const router = useRouter();
    const {account} = useAppSelector(({auth}) => auth);

    const navigation = React.useMemo(
        () => [
            {
                label: 'Analytics',
                items: [
                    {label: 'Dashboard', link: `/dashboard/${account?._id}`, icon: <DashboardIcon />},
                    {label: 'Followers', link: `/followers/${account?._id}`, icon: <FollowersIcon />},
                    {label: 'Replies', link: `/replies/${account?._id}`, icon: <RepliesIcon />},
                    {label: 'Boosts', link: `/boosts/${account?._id}`, icon: <BoostsIcon />},
                    {label: 'Favorites', link: `/favorites/${account?._id}`, icon: <FavoritesIcon />},
                    {label: 'Top Posts', link: `/top-posts/${account?._id}`, icon: <TopIcon />},
                ],
            },
            {
                label: 'Settings',
                items: [{label: 'Accounts', link: '/settings/accounts', icon: <AccountsIcon />}],
            },
        ],
        [account],
    );

    return (
        <>
            {navigation.map((folder, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <Divider sx={{my: 1}} />}
                    <ListSubheader component="div" inset>
                        {folder.label}
                    </ListSubheader>
                    {folder.items.map(({label, link, icon}) => (
                        <Link key={link} href={link} passHref legacyBehavior>
                            <ListItemButton component="a" selected={router.asPath === link}>
                                <ListItemIcon>{icon}</ListItemIcon>
                                <ListItemText primary={label} />
                            </ListItemButton>
                        </Link>
                    ))}
                </React.Fragment>
            ))}
        </>
    );
};

export default AccountOwnerNavigation;
