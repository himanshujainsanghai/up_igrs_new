/**
 * useComplaints Hook
 * Combines Redux state with complaints actions
 */

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchComplaints,
  fetchComplaintById,
  createComplaint,
  updateComplaint,
  fetchStatistics,
  setFilters,
  clearFilters,
  setCurrentComplaint,
  clearError,
} from '@/store/slices/complaints.slice';
import { Complaint, ComplaintFilters } from '@/types';

export const useComplaints = () => {
  const dispatch = useAppDispatch();
  const {
    complaints,
    currentComplaint,
    statistics,
    filters,
    pagination,
    loading,
    error,
  } = useAppSelector((state) => state.complaints);

  return {
    // State
    complaints,
    currentComplaint,
    statistics,
    filters,
    pagination,
    loading,
    error,

    // Actions
    fetchComplaints: (filters?: ComplaintFilters) => dispatch(fetchComplaints(filters || filters)),
    fetchComplaintById: (id: string) => dispatch(fetchComplaintById(id)),
    createComplaint: (complaint: Partial<Complaint>) => dispatch(createComplaint(complaint)),
    updateComplaint: (id: string, updates: Partial<Complaint>) =>
      dispatch(updateComplaint({ id, updates })),
    fetchStatistics: () => dispatch(fetchStatistics()),
    setFilters: (filters: ComplaintFilters) => dispatch(setFilters(filters)),
    clearFilters: () => dispatch(clearFilters()),
    setCurrentComplaint: (complaint: Complaint | null) => dispatch(setCurrentComplaint(complaint)),
    clearError: () => dispatch(clearError()),
  };
};

