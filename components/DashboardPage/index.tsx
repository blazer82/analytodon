import * as React from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Chart from '@/components/Chart';
import TotalBox from '@/components/TotalBox';
import TopToots from '@/components/TopToots';
import Layout from '../Layout';
import {useAppSelector} from '@/redux/hooks';
import {Link, Typography} from '@mui/material';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const DashboardPage: React.FunctionComponent = () => {
    const {total, chart} = useAppSelector(({followers}) => followers);
    const {top} = useAppSelector(({toots}) => toots);

    const hasChart = React.useMemo(() => (chart?.length ?? 0) > 0, [chart]);

    return (
        <Layout title="Dashboard">
            <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8} lg={9}>
                        <Paper
                            sx={{
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                height: 240,
                            }}
                        >
                            {hasChart && chart && <Chart title="Followers Last 30 Days" data={chart} dataLabel="Followers" />}
                            {!hasChart && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
                                    <br />
                                    <br />
                                    If you&apos;ve just set up your account this message is expected.
                                    <br />
                                    We&apos;ll send you an email once your data is ready.
                                    <br />
                                    <br />
                                    If this message persists please{' '}
                                    <Link href={`mailto:${publicRuntimeConfig.supportEmail}?subject=Support`}>contact support</Link>.
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4} lg={3}>
                        <Paper
                            sx={{
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                height: 240,
                            }}
                        >
                            {total && (
                                <TotalBox title="Total Followers" amount={total.amount} date={total.day} linkText="View follower stats" link="/followers" />
                            )}
                            {!total && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{p: 2, display: 'flex', flexDirection: 'column'}}>
                            {top && <TopToots data={top} title="Top Posts Last 30 Days" linkText="See more top posts" link="/top-posts" />}
                            {!top && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Layout>
    );
};

export default DashboardPage;
