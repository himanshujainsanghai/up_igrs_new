/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/auth.slice';
import complaintsSlice from './slices/complaints.slice';
import meetingsSlice from './slices/meetings.slice';
import uiSlice from './slices/ui.slice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    complaints: complaintsSlice,
    meetings: meetingsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

