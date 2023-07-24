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
import {loadChart} from '@/redux/replies/action/loadChart';
import {Box, IconButton, Link, Typography} from '@mui/material';
import {getKPITrend} from '@/helpers/getKPITrend';
import {loadTopToots} from '@/redux/replies/action/loadTopToots';
import {loadCSV} from '@/redux/replies/action/loadCSV';
import DownloadIcon from '@mui/icons-material/Download';
import getConfig from 'next/config';

const {publicRuntimeConfig} = getConfig();

const RepliesPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();

    const {account} = useAppSelector(({auth}) => auth);
    const {weeklyKPI, monthlyKPI, yearlyKPI, total, chart, timeframe} = useAppSelector(({replies}) => replies);
    const {topByReplies} = useAppSelector(({toots}) => toots);

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
        <Layout title="Replies">
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
                                    subtitle="replies received"
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
                                    subtitle="replies received"
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
                                    subtitle="replies received"
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
                            {total && <TotalBox title="Total Replies" amount={total.amount} date={total.day} />}
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
                            {hasChart && chart && <Chart data={chart} type="bar" dataLabel="Replies" />}
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
                            {topByReplies && (
                                <TopToots
                                    data={topByReplies}
                                    title="Top Posts by Replies"
                                    /*linkText="See more top posts"
                                    link="/top-posts"*/
                                    showBoosts={false}
                                    showFavorites={false}
                                />
                            )}
                            {!topByReplies && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Layout>
    );
};

export default RepliesPage;
