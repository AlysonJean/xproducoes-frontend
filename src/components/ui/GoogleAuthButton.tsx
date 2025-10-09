import React from 'react';
import type { GoogleAuthButtonProps } from '@/types/ui';

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ onSuccess }) => {
  // Implemente a lógica de autenticação Google conforme necessário
  return (
    <button
      type="button"
      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-bold transition-colors"
      onClick={() => {
        // Chame a lógica de autenticação Google
        if (onSuccess) onSuccess({});
      }}
    >
      Entrar com Google
    </button>
  );
};

export default GoogleAuthButton;
