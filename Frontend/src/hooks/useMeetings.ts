/**
 * useMeetings Hook
 * Combines Redux state with meetings actions.
 * Action functions are wrapped in useCallback so they are stable references
 * and safe to use in useEffect dependency arrays (avoids infinite request loops).
 */

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMeetings,
  fetchMeetingById,
  createMeeting,
  updateMeeting,
  setCurrentMeeting,
  clearError,
} from "@/store/slices/meetings.slice";
import { Meeting, MeetingRequest } from "@/types";

export const useMeetings = () => {
  const dispatch = useAppDispatch();
  const { meetings, currentMeeting, pagination, loading, error } =
    useAppSelector((state) => state.meetings);

  const fetchMeetingsFn = useCallback(
    (page?: number, limit?: number, status?: string) => {
      dispatch(fetchMeetings({ page, limit, status }));
    },
    [dispatch],
  );

  const fetchMeetingByIdFn = useCallback(
    (id: string) => dispatch(fetchMeetingById(id)),
    [dispatch],
  );

  const createMeetingFn = useCallback(
    (meeting: MeetingRequest) => dispatch(createMeeting(meeting)),
    [dispatch],
  );

  const updateMeetingFn = useCallback(
    (id: string, updates: Partial<Meeting>) =>
      dispatch(updateMeeting({ id, updates })),
    [dispatch],
  );

  const setCurrentMeetingFn = useCallback(
    (meeting: Meeting | null) => dispatch(setCurrentMeeting(meeting)),
    [dispatch],
  );

  const clearErrorFn = useCallback(() => dispatch(clearError()), [dispatch]);

  return {
    meetings,
    currentMeeting,
    pagination,
    loading,
    error,
    fetchMeetings: fetchMeetingsFn,
    fetchMeetingById: fetchMeetingByIdFn,
    createMeeting: createMeetingFn,
    updateMeeting: updateMeetingFn,
    setCurrentMeeting: setCurrentMeetingFn,
    clearError: clearErrorFn,
  };
};
