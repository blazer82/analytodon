import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {HYDRATE} from 'next-redux-wrapper';

// Define a type for the slice state
interface UserState {
    registrationInProcess: boolean;
    registrationError?: string | null;
}

// Define the initial state using that type
const initialState: UserState = {registrationInProcess: false};

export const userSlice = createSlice({
    name: 'user',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        registrationAttempt: (state) => {
            state.registrationInProcess = true;
            state.registrationError = null;
        },
        registrationFailed: (state, action: PayloadAction<string>) => {
            state.registrationInProcess = false;
            state.registrationError = action.payload;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.user,
            };
        },
    },
});

export const {registrationAttempt, registrationFailed} = userSlice.actions;

export default userSlice.reducer;
