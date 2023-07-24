import * as React from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Layout from '../Layout';
import TopToots from '../TopToots';
import PeriodSelector from '../PeriodSelector';
import {useAppDispatch, useAppSelector} from '@/redux/hooks';
import {Typography} from '@mui/material';
import {Timeframe} from '@/types/Timeframe';
import {loadTopToots} from '@/redux/toots/action/loadTopToots';

const TopTootsPage: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();

    const {account} = useAppSelector(({auth}) => auth);
    const {top, topByReplies, topByBoosts, topByFavorites, timeframe} = useAppSelector(({toots}) => toots);

    const handleTimeframeChange = React.useCallback(
        (timeframe: Timeframe) => {
            dispatch(loadTopToots(account?._id ?? '', timeframe));
        },
        [dispatch, account],
    );

    return (
        <Layout title="Top Toots">
            <Container maxWidth="lg" sx={{mt: 4, mb: 4}}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sx={{mt: 5}}>
                        <PeriodSelector timeframe={timeframe} onChange={handleTimeframeChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{p: 2, display: 'flex', flexDirection: 'column'}}>
                            {top && <TopToots data={top} title="Top Toots" />}
                            {!top && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{p: 2, display: 'flex', flexDirection: 'column'}}>
                            {topByReplies && <TopToots data={topByReplies} title="Top Toots by Replies" showBoosts={false} showFavorites={false} />}
                            {!topByReplies && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{p: 2, display: 'flex', flexDirection: 'column'}}>
                            {topByBoosts && <TopToots data={topByBoosts} title="Top Toots by Boosts" showReplies={false} showFavorites={false} />}
                            {!topByBoosts && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Paper sx={{p: 2, display: 'flex', flexDirection: 'column'}}>
                            {topByFavorites && <TopToots data={topByFavorites} title="Top Toots by Favorites" showReplies={false} showBoosts={false} />}
                            {!topByFavorites && <Typography sx={{textAlign: 'center'}}>No data available.</Typography>}
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Layout>
    );
};

export default TopTootsPage;
