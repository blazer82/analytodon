import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { SessionUserDto } from '@analytodon/rest-client';
import { Box, Link } from '@mui/material';
import Typography from '@mui/material/Typography';
import { Link as RemixLink, useRouteLoaderData } from '@remix-run/react';
import Title from '~/components/Title';
import { formatDate, formatNumber } from '~/utils/formatters';

const TotalBox: React.FunctionComponent<{
  title: string;
  amount: number;
  date: Date | string;
  linkText?: string;
  link?: string;
}> = ({ title, amount, date, linkText, link }) => {
  const { t } = useTranslation('components.totalBox');
  const appData = useRouteLoaderData('routes/_app') as { user?: SessionUserDto };
  const userTimezone = appData?.user?.timezone;

  return (
    <React.Fragment>
      <Title>{title}</Title>
      <Typography
        component="p"
        variant="h3"
        sx={{
          fontWeight: 700,
          background: (theme) =>
            `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textFillColor: 'transparent',
          mb: 1,
        }}
      >
        {formatNumber(amount)}
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          flex: 1,
          fontSize: '0.9rem',
          opacity: 0.8,
        }}
      >
        {t('on')} {formatDate(date, userTimezone)}
      </Typography>
      {linkText && link && (
        <Box sx={{ mt: 2 }}>
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

export default TotalBox;
