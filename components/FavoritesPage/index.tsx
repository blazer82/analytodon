import * as React from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TotalBox from '../TotalBox';
import Layout from '../Layout';
import TrendBox from '../TrendBox';
import Chart from '../Chart';
import TopToots from '../TopToots';
import PeriodSelector from '../PeriodSelector';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {Timeframe} from '@/types/Timeframe';
import {loadChart} from '@/redux/favorites/action/loadChart';
import {loadTopToots} from '@/redux/favorites/action/loadTopToots';
import {Box, IconButton, Link, Typography} from '@mui/material';
import {getKPITrend} from '@/helpers/getKPITrend';
import {loadCSV} from '@/redux/favorites/action/loadCSV';
import DownloadIcon from '@mui/icons-material/Download';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const FavoritesPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();

    const {account} = useAppSelector(({auth}) => auth);
    const {weeklyKPI, monthlyKPI, yearlyKPI, total, chart, timeframe} = useAppSelector(({favorites}) => favorites);
    const {topByFavorites} = useAppSelector(({toots}) => toots);

    const hasChart = React.useMemo(() => (chart?.length ?? 0) > 0, [chart]);

    const handleTimeframeChange = React.useCallback(
        (timeframe: Timeframe) => {
            dispatch(loadChart(account?._id ?? '', timeframe));
            dispatch(loadTopToots(account?._id ?? '', timeframe));
        },
        [dispatch, account],
    );

    const handleCSVDownload = React.useCallback(() => {
        dispatch(loadCSV(account?._id ?? '', timeframe));
    }, [dispatch, account, timeframe]);

    return (
        <Layout title="Favorites">
            <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4} lg={3}>
                        <Paper
                            sx={{
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                height: 160,
                            }}
                        >
                            {weeklyKPI && (
                                <TrendBox
                                    title={weeklyKPI.isLastPerdiod ? 'Last Week' : 'This Week'}
                                    subtitle="favorited posts"
                                    amount={weeklyKPI.currentPeriod ?? 0}
                                    trend={getKPITrend(weeklyKPI)}
                                />
                            )}
                            {!weeklyKPI && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
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
                                height: 160,
                            }}
                        >
                            {monthlyKPI && (
                                <TrendBox
                                    title={monthlyKPI.isLastPerdiod ? 'Last Month' : 'This Month'}
                                    subtitle="favorited posts"
                                    amount={monthlyKPI.currentPeriod ?? 0}
                                    trend={getKPITrend(monthlyKPI)}
                                />
                            )}
                            {!monthlyKPI && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
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
                                height: 160,
                            }}
                        >
                            {yearlyKPI && (
                                <TrendBox
                                    title={yearlyKPI.isLastPerdiod ? 'Last Year' : 'This Year'}
                                    subtitle="favorited posts"
                                    amount={yearlyKPI.currentPeriod ?? 0}
                                    trend={getKPITrend(yearlyKPI)}
                                />
                            )}
                            {!yearlyKPI && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
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
                                height: 160,
                            }}
                        >
                            {total && <TotalBox title="Total Favorites" amount={total.amount} date={total.day} />}
                            {!total && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
                                </Typography>
                            )}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sx={{mt: 5}}>
                        <Box display="flex" justifyContent="space-between">
                            <PeriodSelector timeframe={timeframe} onChange={handleTimeframeChange} />
                            <IconButton title="Download CSV" aria-label="Download CSV" onClick={handleCSVDownload}>
                                <DownloadIcon />
                            </IconButton>
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper
                            sx={{
                                p: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                height: 510,
                            }}
                        >
                            {hasChart && chart && <Chart data={chart} type="bar" dataLabel="Favorites" />}
                            {!hasChart && (
                                <Typography sx={{textAlign: 'center'}}>
                                    <br />
                                    No data available.
                                    <br />
                                    Please select another time frame.
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
                    <Grid item xs={12}>
                        <Paper sx={{p: 2, display: 'flex', flexDirection: 'column'}}>
                            {topByFavorites && (
                                <TopToots
                                    data={topByFavorites}
                                    title="Top Posts by Favorites"
                                    /*linkText="See more top posts"
                                    link="/top-posts"*/
                                    showReplies={false}
                                    showBoosts={false}
                                />
                            )}
                            {!topByFavorites && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Layout>
    );
};

export default FavoritesPage;
