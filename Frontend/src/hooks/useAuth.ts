/**
 * useAuth Hook
 * Combines Redux state with auth actions
 */

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, logout, getMe, clearError } from '@/store/slices/auth.slice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isAdmin, isOfficer, loading, error } = useAppSelector((state) => state.auth);

  return {
    // State
    user,
    token,
    isAuthenticated,
    isAdmin,
    isOfficer,
    loading,
    error,
    
    // Actions
    login: (email: string, password: string) => dispatch(login({ email, password })),
    logout: () => dispatch(logout()),
    getMe: () => dispatch(getMe()),
    clearError: () => dispatch(clearError()),
  };
};

