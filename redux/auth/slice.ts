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
    resetPasswordRequestInProgress?: boolean;
    resetPasswordRequestError?: string | null;
    resetPasswordInProgress?: boolean;
    resetPasswordError?: string | null;
}

// Define the initial state using that type
const initialState: AuthState = {loginInProgress: false, resetPasswordRequestInProgress: false, resetPasswordInProgress: false};

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
        resetPasswordRequestStarted: (state) => {
            state.resetPasswordRequestInProgress = true;
            state.resetPasswordRequestError = null;
        },
        resetPasswordRequestSuccessful: (state) => {
            state.resetPasswordRequestInProgress = false;
            state.resetPasswordRequestError = null;
        },
        resetPasswordRequestFailed: (state, action: PayloadAction<string>) => {
            state.resetPasswordRequestInProgress = false;
            state.resetPasswordRequestError = action.payload;
        },
        resetPasswordAttempt: (state) => {
            state.resetPasswordInProgress = true;
        },
        resetPasswordSuccessful: (state) => {
            state.resetPasswordInProgress = false;
            state.resetPasswordError = null;
        },
        resetPasswordFailed: (state, action: PayloadAction<string>) => {
            state.resetPasswordInProgress = false;
            state.resetPasswordError = action.payload;
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

export const {
    loginAttempt,
    loginSuccessful,
    loginFailed,
    logoutSuccessful,
    switchAccount,
    resetPasswordRequestStarted,
    resetPasswordRequestSuccessful,
    resetPasswordRequestFailed,
    resetPasswordAttempt,
    resetPasswordSuccessful,
    resetPasswordFailed,
} = authSlice.actions;

export default authSlice.reducer;
