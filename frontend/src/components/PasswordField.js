import { useI18n } from '../i18n';
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordField = ({ className = '', ...props }) => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} className={className} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className={`password-field-toggle ${visible ? 'is-visible' : ''}`}
        aria-label={visible ? t("Ocultar senha") : t("Mostrar senha")}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        <EyeOff className="password-eye password-eye--closed" size={18} />
        <Eye className="password-eye password-eye--open" size={18} />
      </button>
    </div>
  );
};

export default PasswordField;
