import * as React from 'react';
import NextLink from 'next/link';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Title from '@/components/Title';
import {Toot} from '@/types/Toot';
import {formatDate} from '@/helpers/localization';
import {shortenToot} from '@/helpers/shortenToot';
import {useAppSelector} from '@/redux/hooks';

const TopToots: React.FunctionComponent<{
    data: Toot[];
    title?: string;
    linkText?: string;
    link?: string;
    showReplies?: boolean;
    showBoosts?: boolean;
    showFavorites?: boolean;
}> = ({data, title, linkText, link, showReplies = true, showBoosts = true, showFavorites = true}) => {
    const {account} = useAppSelector(({auth}) => auth);
    return (
        <React.Fragment>
            {title && <Title>{title}</Title>}
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Toot</TableCell>
                        {showReplies && <TableCell align="right">Replies</TableCell>}
                        {showBoosts && <TableCell align="right">Boosts</TableCell>}
                        {showFavorites && <TableCell align="right">Favorites</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((toot) => (
                        <TableRow key={toot.uri}>
                            <TableCell>{formatDate(toot.createdAt, account?.timezone)}</TableCell>
                            <TableCell>
                                <NextLink href={toot.url} passHref legacyBehavior>
                                    <Link color="primary" target="_blank">
                                        {shortenToot(toot.content)}
                                    </Link>
                                </NextLink>
                            </TableCell>
                            {showReplies && <TableCell align="right">{`${toot.repliesCount}`}</TableCell>}
                            {showBoosts && <TableCell align="right">{`${toot.reblogsCount}`}</TableCell>}
                            {showFavorites && <TableCell align="right">{`${toot.favouritesCount}`}</TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {linkText && (
                <NextLink href={link ?? ''} passHref legacyBehavior>
                    <Link color="primary" sx={{mt: 3}}>
                        {linkText}
                    </Link>
                </NextLink>
            )}
        </React.Fragment>
    );
};

export default TopToots;
