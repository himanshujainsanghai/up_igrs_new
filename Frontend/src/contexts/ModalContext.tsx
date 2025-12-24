/**
 * Modal Context
 * Manages global modal state
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';

export type ModalType = 'file-complaint' | 'track-complaint' | 'request-meeting' | 'feedback' | 'otp' | 'document-ai' | null;

interface ModalContextProps {
  activeModal: ModalType;
  openModal: (modal: ModalType, props?: any) => void;
  closeModal: () => void;
  modalProps: any;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalProps, setModalProps] = useState<any>({});

  const openModal = (modal: ModalType, props: any = {}) => {
    setActiveModal(modal);
    setModalProps(props);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalProps({});
  };

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal, modalProps }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

