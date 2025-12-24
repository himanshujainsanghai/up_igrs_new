/**
 * Complaints Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Complaint, ComplaintFilters, ComplaintStatistics } from '@/types';
import { complaintsService } from '@/services/complaints.service';

interface ComplaintsState {
  complaints: Complaint[];
  currentComplaint: Complaint | null;
  statistics: ComplaintStatistics | null;
  filters: ComplaintFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: ComplaintsState = {
  complaints: [],
  currentComplaint: null,
  statistics: null,
  filters: {
    page: 1,
    limit: 20,
    status: 'all',
    category: 'all',
    priority: 'all',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

// Async thunks
export const fetchComplaints = createAsyncThunk(
  'complaints/fetchComplaints',
  async (filters: ComplaintFilters, { rejectWithValue }) => {
    try {
      const response = await complaintsService.getComplaints(filters);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch complaints');
    }
  }
);

export const fetchComplaintById = createAsyncThunk(
  'complaints/fetchComplaintById',
  async (id: string, { rejectWithValue }) => {
    try {
      const complaint = await complaintsService.getComplaintById(id);
      return complaint;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch complaint');
    }
  }
);

export const createComplaint = createAsyncThunk(
  'complaints/createComplaint',
  async (complaint: Partial<Complaint>, { rejectWithValue }) => {
    try {
      const newComplaint = await complaintsService.createComplaint(complaint);
      return newComplaint;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to create complaint');
    }
  }
);

export const updateComplaint = createAsyncThunk(
  'complaints/updateComplaint',
  async ({ id, updates }: { id: string; updates: Partial<Complaint> }, { rejectWithValue }) => {
    try {
      const updatedComplaint = await complaintsService.updateComplaint(id, updates);
      return updatedComplaint;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to update complaint');
    }
  }
);

export const fetchStatistics = createAsyncThunk(
  'complaints/fetchStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const statistics = await complaintsService.getStatistics();
      return statistics;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch statistics');
    }
  }
);

const complaintsSlice = createSlice({
  name: 'complaints',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ComplaintFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentComplaint: (state, action: PayloadAction<Complaint | null>) => {
      state.currentComplaint = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Complaints
    builder
      .addCase(fetchComplaints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaints.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints = action.payload.data;
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
      })
      .addCase(fetchComplaints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Complaint By ID
    builder
      .addCase(fetchComplaintById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComplaintById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentComplaint = action.payload;
      })
      .addCase(fetchComplaintById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Complaint
    builder
      .addCase(createComplaint.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.loading = false;
        state.complaints.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createComplaint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Complaint
    builder
      .addCase(updateComplaint.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComplaint.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.complaints.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.complaints[index] = action.payload;
        }
        if (state.currentComplaint?._id === action.payload._id) {
          state.currentComplaint = action.payload;
        }
      })
      .addCase(updateComplaint.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Statistics
    builder
      .addCase(fetchStatistics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.loading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, setCurrentComplaint, clearError } = complaintsSlice.actions;
export default complaintsSlice.reducer;

