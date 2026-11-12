import { translate as _tr, useI18n as _useLocale } from '../i18n';
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordField = ({ className = '', ...props }) => {
  _useLocale();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} className={className} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className={`password-field-toggle ${visible ? 'is-visible' : ''}`}
        aria-label={visible ? _tr("Ocultar senha") : _tr("Mostrar senha")}
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
