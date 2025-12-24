/**
 * Auth Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';
import { authService } from '@/services/auth.service';
import { STORAGE_KEYS } from '@/lib/constants';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
  isAuthenticated: false,
  isAdmin: false,
  isOfficer: false,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const authResponse = await authService.login(email, password);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authResponse.user));
      return authResponse;
    } catch (error: any) {
      // Handle both API errors and axios errors
      let errorMessage = 'Failed to login';
      
      if (error.response?.status === 429) {
        // Rate limiting error
        errorMessage = error.response?.data?.message || 
          error.response?.data?.error?.message ||
          error.message ||
          'Too many login attempts. Please wait 15 minutes before trying again.';
      } else {
        errorMessage = 
          error.response?.data?.error?.message || 
          error.response?.data?.error || 
          error.message || 
          'Failed to login';
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue }) => {
  try {
    const user = await authService.getMe();
    return user;
  } catch (error: any) {
    const errorMessage = 
      error.response?.data?.error?.message || 
      error.response?.data?.error || 
      error.message || 
      'Failed to get user';
    return rejectWithValue(errorMessage);
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    return true;
  } catch (error: any) {
    // Clear local storage even if API call fails
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    return rejectWithValue(error.response?.data?.error || error.message || 'Failed to logout');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isAdmin = action.payload?.role === 'admin';
      state.isOfficer = action.payload?.role === 'officer';
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    initializeAuth: (state) => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      
      if (token && storedUser) {
        try {
          state.token = token;
          state.user = JSON.parse(storedUser);
          state.isAuthenticated = true;
          state.isAdmin = state.user?.role === 'admin';
          state.isOfficer = state.user?.role === 'officer';
        } catch (error) {
          // Invalid stored data, clear it
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isAdmin = action.payload.user.role === 'admin';
        state.isOfficer = action.payload.user.role === 'officer';
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Get Me
    builder
      .addCase(getMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isAdmin = action.payload.role === 'admin';
        state.isOfficer = action.payload.role === 'officer';
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(action.payload));
      })
      .addCase(getMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
        state.isOfficer = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Clear state even if API call failed
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
        state.isOfficer = false;
      });
  },
});

export const { setUser, setToken, clearError, initializeAuth } = authSlice.actions;
export default authSlice.reducer;

