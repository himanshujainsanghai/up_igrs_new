/**
 * Executives Redux Slice
 * Stores executive authorities data to avoid redundant API calls
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { complaintsService } from '@/services/complaints.service';

export interface Executive {
  name: string;
  designation: string;
  email: string;
  phone: string;
  office_address: string;
  district: string;
  category: 'general_administration' | 'police_administration';
  role?: string;
  [key: string]: any; // Allow additional properties
}

interface ExecutivesState {
  executives: Executive[];
  flattenedExecutives: Executive[];
  lastFetched: number | null;
  loading: boolean;
  error: string | null;
  // Cache duration in milliseconds (default: 5 minutes)
  cacheDuration: number;
}

const initialState: ExecutivesState = {
  executives: [],
  flattenedExecutives: [],
  lastFetched: null,
  loading: false,
  error: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

/**
 * Flatten executives from nested district structure to flat array
 */
const flattenExecutives = (executivesData: any[]): Executive[] => {
  const flattenedExecutives: Executive[] = [];

  executivesData.forEach((districtData: any) => {
    const district = districtData.district;
    const districtName =
      district?.districtName ||
      districtData.district_profile?.name ||
      'Unknown District';

    // Add general administration executives
    if (districtData.executive_authorities?.general_administration) {
      districtData.executive_authorities.general_administration.forEach(
        (exec: any) => {
          flattenedExecutives.push({
            ...exec,
            district: districtName,
            category: 'general_administration',
            // Transform to match expected officer format
            name: exec.name || '',
            designation: exec.designation || '',
            email: exec.contact?.email || '',
            phone:
              exec.contact?.office_phone || exec.contact?.cug_mobile || '',
            office_address: exec.contact?.address || '',
            role: exec.role || '',
          });
        }
      );
    }

    // Add police administration executives
    if (districtData.executive_authorities?.police_administration) {
      districtData.executive_authorities.police_administration.forEach(
        (exec: any) => {
          flattenedExecutives.push({
            ...exec,
            district: districtName,
            category: 'police_administration',
            // Transform to match expected officer format
            name: exec.name || '',
            designation: exec.designation || '',
            email: exec.contact?.email || '',
            phone:
              exec.contact?.office_phone || exec.contact?.cug_mobile || '',
            office_address: exec.contact?.address || '',
            role: exec.role || '',
          });
        }
      );
    }
  });

  return flattenedExecutives;
};

// Async thunk to fetch executives
export const fetchExecutives = createAsyncThunk(
  'executives/fetchExecutives',
  async (forceRefresh: boolean = false, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { executives: ExecutivesState };
      const { lastFetched, cacheDuration, flattenedExecutives } =
        state.executives;

      // Check if we have cached data and it's still valid
      if (
        !forceRefresh &&
        lastFetched &&
        flattenedExecutives.length > 0 &&
        Date.now() - lastFetched < cacheDuration
      ) {
        // Return cached data
        return {
          executives: state.executives.executives,
          flattenedExecutives: flattenedExecutives,
          fromCache: true,
        };
      }

      // Fetch fresh data from API
      const executivesData = await complaintsService.getExecutives();
      const flattened = flattenExecutives(executivesData);

      return {
        executives: executivesData,
        flattenedExecutives: flattened,
        fromCache: false,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          'Failed to fetch executives'
      );
    }
  }
);

const executivesSlice = createSlice({
  name: 'executives',
  initialState,
  reducers: {
    clearExecutives: (state) => {
      state.executives = [];
      state.flattenedExecutives = [];
      state.lastFetched = null;
      state.error = null;
    },
    setCacheDuration: (state, action: PayloadAction<number>) => {
      state.cacheDuration = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExecutives.pending, (state) => {
        // Only set loading if we're actually fetching (not using cache)
        if (!state.lastFetched || state.flattenedExecutives.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchExecutives.fulfilled, (state, action) => {
        state.loading = false;
        state.executives = action.payload.executives;
        state.flattenedExecutives = action.payload.flattenedExecutives;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchExecutives.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearExecutives, setCacheDuration, clearError } =
  executivesSlice.actions;

// Selectors
export const selectExecutives = (state: { executives: ExecutivesState }) =>
  state.executives.executives;
export const selectFlattenedExecutives = (state: {
  executives: ExecutivesState;
}) => state.executives.flattenedExecutives;
export const selectExecutivesLoading = (state: {
  executives: ExecutivesState;
}) => state.executives.loading;
export const selectExecutivesError = (state: { executives: ExecutivesState }) =>
  state.executives.error;
export const selectExecutivesLastFetched = (state: {
  executives: ExecutivesState;
}) => state.executives.lastFetched;
export const selectIsExecutivesCacheValid = (state: {
  executives: ExecutivesState;
}) => {
  const { lastFetched, cacheDuration, flattenedExecutives } = state.executives;
  return (
    lastFetched &&
    flattenedExecutives.length > 0 &&
    Date.now() - lastFetched < cacheDuration
  );
};

export default executivesSlice.reducer;

