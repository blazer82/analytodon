import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {HYDRATE} from 'next-redux-wrapper';
import {Account} from '@/types/Account';

// Define a type for the slice state
interface AccountsState {
    isLoading: boolean;
    list?: Account[] | null;
    current?: Account | null;
    error?: string | null;
    connect?: {
        url: string;
        id: string;
    } | null;
}

// Define the initial state using that type
const initialState: AccountsState = {isLoading: false};

export const accountsSlice = createSlice({
    name: 'accounts',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        listLoadSuccessful: (state, action: PayloadAction<Account[]>) => {
            state.isLoading = false;
            state.list = action.payload;
            state.error = null;
        },
        loadSuccessful: (state, action: PayloadAction<Account>) => {
            state.isLoading = false;
            state.current = action.payload;
            state.error = null;
        },
        connectSuccessful: (state, action: PayloadAction<{url: string; account: string}>) => {
            state.isLoading = false;
            state.connect = {
                url: action.payload.url,
                id: action.payload.account,
            };
            state.error = null;
        },
        save: (state) => {
            state.isLoading = true;
            state.error = null;
            state.connect = null;
        },
        failed: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.error = action.payload;
        },
        remove: (state) => {
            state.isLoading = true;
            state.error = null;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.accounts,
            };
        },
    },
});

export const {listLoadSuccessful, loadSuccessful, connectSuccessful, save, failed, remove} = accountsSlice.actions;

export default accountsSlice.reducer;
