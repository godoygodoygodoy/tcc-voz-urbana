import { useEffect } from 'react';
import { useI18n } from '../i18n';

// Browser constraint messages otherwise follow the browser's locale, not the site's.
const LocalizedValidation = () => {
  const { t } = useI18n();
  useEffect(() => {
    const localize = (field) => {
      if (typeof field.setCustomValidity !== 'function') return;
      field.setCustomValidity('');
      const validity = field.validity;
      const message = validity.valueMissing ? t('requiredFields')
        : validity.typeMismatch && field.type === 'email' ? t('invalidEmail')
        : validity.tooShort ? t('minimumCharacters', { count: field.minLength })
        : validity.tooLong ? t('maximumCharacters', { count: field.maxLength })
        : validity.patternMismatch ? t('invalidFormat')
        : !validity.valid ? t('invalidValue') : '';
      field.setCustomValidity(message);
      if (message) field.dataset.localizedValidation = 'true';
      else delete field.dataset.localizedValidation;
    };
    const invalid = (event) => localize(event.target);
    const input = (event) => {
      if (event.target.dataset?.localizedValidation) {
        event.target.setCustomValidity('');
        delete event.target.dataset.localizedValidation;
      }
    };
    document.querySelectorAll('[data-localized-validation]').forEach(localize);
    document.addEventListener('invalid', invalid, true);
    document.addEventListener('input', input, true);
    return () => {
      document.removeEventListener('invalid', invalid, true);
      document.removeEventListener('input', input, true);
    };
  }, [t]);
  return null;
};
export default LocalizedValidation;
