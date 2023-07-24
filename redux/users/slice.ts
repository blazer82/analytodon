import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {User} from '@/types/User';
import {HYDRATE} from 'next-redux-wrapper';

// Define a type for the slice state
interface UsersState {
    isLoading: boolean;
    list?: User[] | null;
    current?: User | null;
    error?: string | null;
}

// Define the initial state using that type
const initialState: UsersState = {isLoading: false};

export const usersSlice = createSlice({
    name: 'users',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        listLoadSuccessful: (state, action: PayloadAction<User[]>) => {
            state.isLoading = false;
            state.list = action.payload;
            state.error = null;
        },
        loadSuccessful: (state, action: PayloadAction<User>) => {
            state.isLoading = false;
            state.current = action.payload;
            state.error = null;
        },
        save: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        failed: (state, action: PayloadAction<string>) => {
            state.isLoading = true;
            state.error = action.payload;
        },
        sendEmail: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        sendEmailSuccessful: (state) => {
            state.isLoading = false;
            state.error = null;
        },
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.users,
            };
        },
    },
});

export const {listLoadSuccessful, loadSuccessful, save, failed, sendEmail, sendEmailSuccessful} = usersSlice.actions;

export default usersSlice.reducer;
