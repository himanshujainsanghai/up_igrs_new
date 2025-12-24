/**
 * useMeetings Hook
 * Combines Redux state with meetings actions
 */

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchMeetings,
  fetchMeetingById,
  createMeeting,
  updateMeeting,
  setCurrentMeeting,
  clearError,
} from '@/store/slices/meetings.slice';
import { Meeting, MeetingRequest } from '@/types';

export const useMeetings = () => {
  const dispatch = useAppDispatch();
  const { meetings, currentMeeting, pagination, loading, error } = useAppSelector(
    (state) => state.meetings
  );

  return {
    // State
    meetings,
    currentMeeting,
    pagination,
    loading,
    error,

    // Actions
    fetchMeetings: (page?: number, limit?: number) =>
      dispatch(fetchMeetings({ page, limit })),
    fetchMeetingById: (id: string) => dispatch(fetchMeetingById(id)),
    createMeeting: (meeting: MeetingRequest) => dispatch(createMeeting(meeting)),
    updateMeeting: (id: string, updates: Partial<Meeting>) =>
      dispatch(updateMeeting({ id, updates })),
    setCurrentMeeting: (meeting: Meeting | null) => dispatch(setCurrentMeeting(meeting)),
    clearError: () => dispatch(clearError()),
  };
};

