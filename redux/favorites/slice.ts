import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {HYDRATE} from 'next-redux-wrapper';
import {TotalSnapshot} from '@/types/TotalSnapshot';
import {ChartData} from '@/types/ChartData';
import {KPI} from '@/types/KPI';
import {Timeframe} from '@/types/Timeframe';

// Define a type for the slice state
interface FavoritesState {
    isLoading: boolean;
    total?: TotalSnapshot;
    chart?: ChartData;
    timeframe: Timeframe;
    weeklyKPI?: KPI;
    monthlyKPI?: KPI;
    yearlyKPI?: KPI;
    error?: string | null;
}

// Define the initial state using that type
const initialState: FavoritesState = {isLoading: false, timeframe: 'last30days'};

export const favoritesSlice = createSlice({
    name: 'favorites',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        totalLoadSuccessful: (state, action: PayloadAction<TotalSnapshot>) => {
            state.isLoading = false;
            state.total = action.payload;
            state.error = null;
        },
        chartLoadSuccessful: (state, action: PayloadAction<{data: ChartData; timeframe: Timeframe}>) => {
            state.isLoading = false;
            state.chart = action.payload.data;
            state.timeframe = action.payload.timeframe;
            state.error = null;
        },
        csvLoadSuccessful: (state) => {
            state.isLoading = false;
            state.error = null;
        },
        weeklyKPILoadSuccessful: (state, action: PayloadAction<KPI>) => {
            state.isLoading = false;
            state.weeklyKPI = action.payload;
            state.error = null;
        },
        monthlyKPILoadSuccessful: (state, action: PayloadAction<KPI>) => {
            state.isLoading = false;
            state.monthlyKPI = action.payload;
            state.error = null;
        },
        yearlyKPILoadSuccessful: (state, action: PayloadAction<KPI>) => {
            state.isLoading = false;
            state.yearlyKPI = action.payload;
            state.error = null;
        },
        loadChartStarted: (state, action: PayloadAction<Timeframe>) => {
            state.isLoading = true;
            state.timeframe = action.payload;
            state.error = null;
        },
        loadCSVStarted: (state, action: PayloadAction<Timeframe>) => {
            state.isLoading = true;
            state.error = null;
        },
        loadFailed: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.error = action.payload;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.favorites,
            };
        },
    },
});

export const {
    totalLoadSuccessful,
    chartLoadSuccessful,
    csvLoadSuccessful,
    weeklyKPILoadSuccessful,
    monthlyKPILoadSuccessful,
    yearlyKPILoadSuccessful,
    loadChartStarted,
    loadCSVStarted,
    loadFailed,
} = favoritesSlice.actions;

export default favoritesSlice.reducer;
