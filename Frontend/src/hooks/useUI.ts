/**
 * useUI Hook
 * Combines Redux state with UI actions
 */

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  openModal,
  closeModal,
  setSidebarOpen,
  toggleSidebar,
  addNotification,
  removeNotification,
  clearNotifications,
} from '@/store/slices/ui.slice';
import { ModalType } from '@/store/slices/ui.slice';

export const useUI = () => {
  const dispatch = useAppDispatch();
  const { activeModal, modalProps, sidebarOpen, notifications } = useAppSelector((state) => state.ui);

  return {
    // State
    activeModal,
    modalProps,
    sidebarOpen,
    notifications,

    // Modal Actions
    openModal: (type: ModalType, props?: Record<string, any>) =>
      dispatch(openModal({ type, props })),
    closeModal: () => dispatch(closeModal()),

    // Sidebar Actions
    setSidebarOpen: (open: boolean) => dispatch(setSidebarOpen(open)),
    toggleSidebar: () => dispatch(toggleSidebar()),

    // Notification Actions
    addNotification: (notification: {
      id: string;
      type: 'success' | 'error' | 'warning' | 'info';
      message: string;
    }) => dispatch(addNotification(notification)),
    removeNotification: (id: string) => dispatch(removeNotification(id)),
    clearNotifications: () => dispatch(clearNotifications()),
  };
};

