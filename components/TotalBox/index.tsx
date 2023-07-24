import * as React from 'react';
import NextLink from 'next/link';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Title from '@/components/Title';
import {formatDate, formatNumber} from '@/helpers/localization';
import {useAppSelector} from '@/redux/hooks';

const TotalBox: React.FunctionComponent<{title: string; amount: number; date: Date; linkText?: string; link?: string}> = ({
    title,
    amount,
    date,
    linkText,
    link,
}) => {
    const {account} = useAppSelector(({auth}) => auth);

    return (
        <React.Fragment>
            <Title>{title}</Title>
            <Typography component="p" variant="h4">
                {formatNumber(amount)}
            </Typography>
            <Typography color="text.secondary" sx={{flex: 1}}>
                on {formatDate(date, account?.timezone)}
            </Typography>
            {linkText && (
                <div>
                    <NextLink href={link ?? ''} passHref legacyBehavior>
                        <Link color="primary">{linkText}</Link>
                    </NextLink>
                </div>
            )}
        </React.Fragment>
    );
};

export default TotalBox;
