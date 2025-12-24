/**
 * Meetings Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Meeting, MeetingRequest } from '@/types';
import { meetingsService } from '@/services/meetings.service';

interface MeetingsState {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: MeetingsState = {
  meetings: [],
  currentMeeting: null,
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
export const fetchMeetings = createAsyncThunk(
  'meetings/fetchMeetings',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await meetingsService.getMeetings(page, limit);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch meetings');
    }
  }
);

export const fetchMeetingById = createAsyncThunk(
  'meetings/fetchMeetingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const meeting = await meetingsService.getMeetingById(id);
      return meeting;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch meeting');
    }
  }
);

export const createMeeting = createAsyncThunk(
  'meetings/createMeeting',
  async (meeting: MeetingRequest, { rejectWithValue }) => {
    try {
      const newMeeting = await meetingsService.createMeeting(meeting);
      return newMeeting;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to create meeting');
    }
  }
);

export const updateMeeting = createAsyncThunk(
  'meetings/updateMeeting',
  async ({ id, updates }: { id: string; updates: Partial<Meeting> }, { rejectWithValue }) => {
    try {
      const updatedMeeting = await meetingsService.updateMeeting(id, updates);
      return updatedMeeting;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to update meeting');
    }
  }
);

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    setCurrentMeeting: (state, action: PayloadAction<Meeting | null>) => {
      state.currentMeeting = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Meetings
    builder
      .addCase(fetchMeetings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetings.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings = action.payload.data;
        if (action.payload.meta) {
          state.pagination = action.payload.meta;
        }
      })
      .addCase(fetchMeetings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Meeting By ID
    builder
      .addCase(fetchMeetingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetingById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMeeting = action.payload;
      })
      .addCase(fetchMeetingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Meeting
    builder
      .addCase(createMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMeeting.fulfilled, (state, action) => {
        state.loading = false;
        state.meetings.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Meeting
    builder
      .addCase(updateMeeting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMeeting.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.meetings.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.meetings[index] = action.payload;
        }
        if (state.currentMeeting?._id === action.payload._id) {
          state.currentMeeting = action.payload;
        }
      })
      .addCase(updateMeeting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentMeeting, clearError } = meetingsSlice.actions;
export default meetingsSlice.reducer;

