import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const AuthErrorBalloon = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="auth-error-balloon" role="alert">
      <AlertCircle aria-hidden="true" size={18} />
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Fechar aviso">
          <X aria-hidden="true" size={16} />
        </button>
      )}
    </div>
  );
};

export default AuthErrorBalloon;
