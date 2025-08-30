import React, { createContext, useContext } from 'react';

export const ModalContext = createContext({});
export const useModal = () => useContext(ModalContext);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModalContext.Provider value={{}}>{children}</ModalContext.Provider>
);
