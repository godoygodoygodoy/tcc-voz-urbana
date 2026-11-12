import React from 'react';
import { toast as nativeToast } from 'react-toastify';
import { translateSystemText, useI18n } from '../i18n';

const ToastMessage = ({ message }) => {
  useI18n();
  return <>{translateSystemText(message)}</>;
};
const content = (message) => typeof message === 'string' ? <ToastMessage message={message} /> : message;
// Keep open notices subscribed to the same locale context as the rest of the UI.
export const toast = Object.assign((message, options) => nativeToast(content(message), options), nativeToast);
for (const type of ['success', 'error', 'info', 'warning', 'warn']) {
  toast[type] = (message, options) => nativeToast[type](content(message), options);
}
export const ToastCloseButton = ({ closeToast, theme }) => {
  const { t } = useI18n();
  return <button type="button" className={`Toastify__close-button Toastify__close-button--${theme}`} aria-label={t('Fechar')} onClick={closeToast}><svg aria-hidden="true" viewBox="0 0 14 16"><path d="M1 2 12 14M12 2 1 14" fill="none" stroke="currentColor" strokeWidth="2" /></svg></button>;
};
