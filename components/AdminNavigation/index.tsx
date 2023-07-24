import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UsersIcon from '@mui/icons-material/Group';
import EmailIcon from '@mui/icons-material/Mail';
import Divider from '@mui/material/Divider';
import {useRouter} from 'next/router';
import Link from 'next/link';

const AdminNavigation: React.FunctionComponent = () => {
    const router = useRouter();

    const navigation = React.useMemo(
        () => [
            {
                label: 'Admin',
                items: [
                    {label: 'Dashboard', link: '/', icon: <DashboardIcon />},
                    {label: 'Users', link: '/admin/users', icon: <UsersIcon />},
                    {label: 'Email', link: '/admin/email', icon: <EmailIcon />},
                ],
            },
        ],
        [],
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

export default AdminNavigation;
