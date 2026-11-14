import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionUserDto } from '@analytodon/rest-client';
import {
  Box,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  type SxProps,
  type Theme,
} from '@mui/material';
import { Link as RemixLink, useRouteLoaderData } from '@remix-run/react';
import Title from '~/components/Title';
import { formatDate, shortenToot, tootToPlainText } from '~/utils/formatters';

// Define types similar to legacy app
export interface Toot {
  uri: string;
  url: string;
  content: string;
  createdAt: string | Date;
  repliesCount: number;
  reblogsCount: number;
  favouritesCount: number;
}

// Headers never wrap: a column must not get narrower than its title (e.g. "返信" breaking into 返/信)
const headerCellSx: SxProps<Theme> = {
  fontWeight: 600,
  borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
  whiteSpace: 'nowrap',
};

const numberCellSx: SxProps<Theme> = { fontWeight: 500, whiteSpace: 'nowrap' };

// The post always stays on one line, whatever its script: the column takes the width the other
// columns leave over (width 100% + max-width 0 keeps the text from widening it) and the text is cut
// with an ellipsis where it doesn't fit. On narrow screens the column keeps a readable minimum and
// the table scrolls sideways instead.
const postCellSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: 0,
  minWidth: 240,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const TopToots: React.FunctionComponent<{
  data: Toot[];
  title?: string;
  linkText?: string;
  link?: string;
  showReplies?: boolean;
  showBoosts?: boolean;
  showFavorites?: boolean;
}> = ({ data, title, linkText, link, showReplies = true, showBoosts = true, showFavorites = true }) => {
  const { t, i18n } = useTranslation('components.topToots');
  const locale = i18n.language || 'en';
  const appData = useRouteLoaderData('routes/_app') as { user?: SessionUserDto };
  const userTimezone = appData?.user?.timezone;

  return (
    <React.Fragment>
      {title && <Title>{title}</Title>}
      <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table
          size="small"
          sx={{
            '& .MuiTableCell-root': {
              borderColor: (theme) => theme.palette.divider,
              py: 1.5,
            },
            '& .MuiTableRow-root:hover': {
              backgroundColor: (theme) =>
                theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>{t('headers.date')}</TableCell>
              <TableCell sx={headerCellSx}>{t('headers.toot')}</TableCell>
              {showReplies && (
                <TableCell align="right" sx={headerCellSx}>
                  {t('headers.replies')}
                </TableCell>
              )}
              {showBoosts && (
                <TableCell align="right" sx={headerCellSx}>
                  {t('headers.boosts')}
                </TableCell>
              )}
              {showFavorites && (
                <TableCell align="right" sx={headerCellSx}>
                  {t('headers.favorites')}
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((toot) => (
              <TableRow key={toot.uri} sx={{ transition: 'background-color 0.2s ease' }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(toot.createdAt, userTimezone, locale)}</TableCell>
                <TableCell sx={postCellSx}>
                  <Link
                    href={toot.url}
                    title={tootToPlainText(toot.content)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      textDecoration: 'none',
                      color: 'primary.main',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        color: 'primary.main', // TODO: Choose a different color for hover
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {shortenToot(toot.content)}
                  </Link>
                </TableCell>
                {showReplies && (
                  <TableCell align="right" sx={numberCellSx}>
                    {`${toot.repliesCount}`}
                  </TableCell>
                )}
                {showBoosts && (
                  <TableCell align="right" sx={numberCellSx}>
                    {`${toot.reblogsCount}`}
                  </TableCell>
                )}
                {showFavorites && (
                  <TableCell align="right" sx={numberCellSx}>
                    {`${toot.favouritesCount}`}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {linkText && link && (
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Link
            component={RemixLink}
            to={link}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              fontWeight: 500,
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -2,
                left: 0,
                width: '100%',
                height: '2px',
                backgroundColor: 'primary.main',
                borderRadius: '2px',
                opacity: 0.7,
                transition: 'all 0.2s ease',
              },
              '&:hover': {
                '&::after': {
                  opacity: 1,
                  height: '3px',
                },
              },
            }}
          >
            {linkText}
          </Link>
        </Box>
      )}
    </React.Fragment>
  );
};

export default TopToots;
