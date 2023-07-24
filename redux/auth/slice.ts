import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {User} from '@/types/User';
import {HYDRATE} from 'next-redux-wrapper';
import {Account} from '@/types/Account';

// Define a type for the slice state
interface AuthState {
    user?: User | null;
    account?: Account | null;
    loginInProgress: boolean;
    loginError?: string | null;
}

// Define the initial state using that type
const initialState: AuthState = {loginInProgress: false};

export const authSlice = createSlice({
    name: 'auth',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        loginAttempt: (state) => {
            state.loginInProgress = true;
            state.loginError = null;
        },
        loginSuccessful: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.account = (action.payload.accounts?.length ?? 0) > 0 ? action.payload.accounts![0] : null;
            state.loginInProgress = false;
        },
        loginFailed: (state, action: PayloadAction<string>) => {
            state.user = null;
            state.loginInProgress = false;
            state.loginError = action.payload;
        },
        logoutSuccessful: (state) => {
            state.user = null;
            state.account = null;
        },
        switchAccount: (state, action: PayloadAction<Account>) => {
            state.account = action.payload;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.auth,
            };
        },
    },
});

export const {loginAttempt, loginSuccessful, loginFailed, logoutSuccessful, switchAccount} = authSlice.actions;

export default authSlice.reducer;
