import * as React from 'react';

import { Box, Container, Grid, Link, Typography } from '@mui/material';
import type { MetaFunction } from '@remix-run/node';
import { useLoaderData, useRouteLoaderData } from '@remix-run/react';
import Chart from '~/components/Chart';
import { ChartPaper, DataTablePaper, TotalBoxPaper } from '~/components/Layout/styles';
import TopToots from '~/components/TopToots';
import TotalBox from '~/components/TotalBox';

export const meta: MetaFunction = () => {
  return [{ title: 'Analytodon Dashboard' }];
};

// Define types for our data
interface TotalData {
  amount: number;
  day: string | Date;
}

export async function loader() {
  // TODO: Load dashboard data (followers, chart data, top toots)

  // For now, return empty data
  return {
    total: null as TotalData | null,
    chart: [] as Array<{ time: string; value: number }>,
    top: null as any[] | null,
  };
}

export default function Dashboard() {
  const { total, chart, top } = useLoaderData<typeof loader>();

  // Get ENV from the root loader data for support email
  const rootData = useRouteLoaderData<{ ENV: { SUPPORT_EMAIL: string } }>('root');
  const supportEmail = rootData?.ENV?.SUPPORT_EMAIL || 'support@analytodon.com';

  const hasChart = React.useMemo(() => (chart?.length ?? 0) > 0, [chart]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, position: 'relative', zIndex: 1 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <ChartPaper>
            {hasChart && chart && <Chart title="Followers Last 30 Days" data={chart} dataLabel="Followers" />}
            {!hasChart && (
              <Typography
                sx={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%',
                  opacity: 0.8,
                  px: 2,
                }}
              >
                No data available.
                <br />
                <br />
                If you&apos;ve just set up your account this message is expected.
                <br />
                We&apos;ll send you an email once your data is ready.
                <br />
                <br />
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  If this message persists please{' '}
                  <Link
                    href={`mailto:${supportEmail}?subject=Support`}
                    sx={{
                      textDecoration: 'none',
                      position: 'relative',
                      mx: 0.5,
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
                      },
                      '&:hover': {
                        '&::after': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    contact support
                  </Link>
                  .
                </Box>
              </Typography>
            )}
          </ChartPaper>
        </Grid>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <TotalBoxPaper>
            {total && (
              <TotalBox
                title="Total Followers"
                amount={total.amount}
                date={total.day}
                linkText="View follower stats"
                link="/app/followers"
              />
            )}
            {!total && (
              <Typography
                sx={{
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  opacity: 0.8,
                }}
              >
                No data available.
              </Typography>
            )}
          </TotalBoxPaper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <DataTablePaper>
            {top && (
              <TopToots data={top} title="Top Posts Last 30 Days" linkText="See more top posts" link="/app/top-posts" />
            )}
            {!top && (
              <Typography
                sx={{
                  textAlign: 'center',
                  py: 4,
                  opacity: 0.8,
                }}
              >
                No data available.
              </Typography>
            )}
          </DataTablePaper>
        </Grid>
      </Grid>
    </Container>
  );
}
