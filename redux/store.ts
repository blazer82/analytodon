import {configureStore} from '@reduxjs/toolkit';
import {createWrapper} from 'next-redux-wrapper';
import authReducer from './auth/slice';
import userReducer from './user/slice';
import usersReducer from './users/slice';
import accountsReducer from './accounts/slice';
import followersReducer from './followers/slice';
import tootsReducer from './toots/slice';
import relpiesReducer from './replies/slice';
import boostsReducer from './boosts/slice';
import favoritesReducer from './favorites/slice';

export const makeStore = () =>
    configureStore({
        reducer: {
            auth: authReducer,
            user: userReducer,
            users: usersReducer,
            accounts: accountsReducer,
            followers: followersReducer,
            toots: tootsReducer,
            replies: relpiesReducer,
            boosts: boostsReducer,
            favorites: favoritesReducer,
        },
    });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const wrapper = createWrapper<AppStore>(makeStore, {debug: true});
