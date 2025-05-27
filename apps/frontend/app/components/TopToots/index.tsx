import * as React from 'react';

import type { SessionUserDto } from '@analytodon/rest-client';
import { Box, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Link as RemixLink, useRouteLoaderData } from '@remix-run/react';
import Title from '~/components/Title';
import { formatDate, shortenToot } from '~/utils/formatters';

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

const TopToots: React.FunctionComponent<{
  data: Toot[];
  title?: string;
  linkText?: string;
  link?: string;
  showReplies?: boolean;
  showBoosts?: boolean;
  showFavorites?: boolean;
}> = ({ data, title, linkText, link, showReplies = true, showBoosts = true, showFavorites = true }) => {
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
              <TableCell
                sx={{
                  fontWeight: 600,
                  borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                }}
              >
                Date
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 600,
                  borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                }}
              >
                Toot
              </TableCell>
              {showReplies && (
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Replies
                </TableCell>
              )}
              {showBoosts && (
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Boosts
                </TableCell>
              )}
              {showFavorites && (
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    borderBottom: (theme) => `2px solid ${theme.palette.divider}`,
                  }}
                >
                  Favorites
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((toot) => (
              <TableRow key={toot.uri} sx={{ transition: 'background-color 0.2s ease' }}>
                <TableCell>{formatDate(toot.createdAt, userTimezone)}</TableCell>
                <TableCell>
                  <Link
                    href={toot.url}
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
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {`${toot.repliesCount}`}
                  </TableCell>
                )}
                {showBoosts && (
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
                    {`${toot.reblogsCount}`}
                  </TableCell>
                )}
                {showFavorites && (
                  <TableCell align="right" sx={{ fontWeight: 500 }}>
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
