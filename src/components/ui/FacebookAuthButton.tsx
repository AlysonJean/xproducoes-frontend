import React from 'react';
import { FacebookAuthButtonProps } from '../../types/types';

const FacebookAuthButton: React.FC<FacebookAuthButtonProps> = ({ onSuccess }) => {
  // Implemente a lógica de autenticação Facebook conforme necessário
  return (
    <button
      type="button"
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-bold transition-colors"
      onClick={() => {
        // Chame a lógica de autenticação Facebook
        if (onSuccess) onSuccess({});
      }}
    >
      Entrar com Facebook
    </button>
  );
};

export default FacebookAuthButton;
