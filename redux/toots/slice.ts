import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {HYDRATE} from 'next-redux-wrapper';
import {Toot} from '@/types/Toot';
import {Timeframe} from '@/types/Timeframe';

// Define a type for the slice state
interface TootsState {
    isLoading: boolean;
    top?: Toot[];
    topByReplies?: Toot[];
    topByBoosts?: Toot[];
    topByFavorites?: Toot[];
    timeframe: Timeframe;
}

// Define the initial state using that type
const initialState: TootsState = {isLoading: false, timeframe: 'last30days'};

export const tootsSlice = createSlice({
    name: 'toots',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        topLoadSuccessful: (state, action: PayloadAction<{data: Toot[]; timeframe: Timeframe}>) => {
            state.isLoading = false;
            state.top = action.payload.data;
            state.timeframe = action.payload.timeframe;
        },
        topByRepliesLoadSuccessful: (state, action: PayloadAction<{data: Toot[]; timeframe: Timeframe}>) => {
            state.isLoading = false;
            state.topByReplies = action.payload.data;
            state.timeframe = action.payload.timeframe;
        },
        topByBoostsLoadSuccessful: (state, action: PayloadAction<{data: Toot[]; timeframe: Timeframe}>) => {
            state.isLoading = false;
            state.topByBoosts = action.payload.data;
            state.timeframe = action.payload.timeframe;
        },
        topByFavoritesLoadSuccessful: (state, action: PayloadAction<{data: Toot[]; timeframe: Timeframe}>) => {
            state.isLoading = false;
            state.topByFavorites = action.payload.data;
            state.timeframe = action.payload.timeframe;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.toots,
            };
        },
    },
});

export const {topLoadSuccessful, topByRepliesLoadSuccessful, topByBoostsLoadSuccessful, topByFavoritesLoadSuccessful} = tootsSlice.actions;

export default tootsSlice.reducer;
