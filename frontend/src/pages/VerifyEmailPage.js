import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useI18n } from '../i18n';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: '' });
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [resending, setResending] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState({ loading: false, message: t('verifyPrompt') });
      return;
    }

    authAPI.verifyEmail(token)
      .then((response) => setState({ loading: false, message: response.data.message }))
        .catch((error) => setState({ loading: false, message: error.response?.data?.error || t('verifyError') }));
      }, [searchParams, t]);

  const resendVerification = async (event) => {
    event.preventDefault();
    if (!email) return;
    setResending(true);
    try {
      await authAPI.resendVerification(email);
      setState({ loading: false, message: t('resendSuccess') });
    } catch (error) {
      setState({ loading: false, message: error.response?.data?.error || t('resendError') });
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1b1b20] flex items-center justify-center px-4 text-white">
      <section className="glass-panel w-full max-w-md rounded-2xl border border-white/10 bg-[#202026] p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-white">{t('verifyTitle')}</h1>
        <p className="mt-4 text-white/65">{state.loading ? t('verifyLoading') : state.message}</p>
        {!state.loading && !searchParams.get('token') && (
          <form onSubmit={resendVerification} className="mt-6 space-y-3 text-left">
            <label className="block text-sm font-semibold text-white/80" htmlFor="verification-email">{t('registeredEmail')}</label>
            <input
              id="verification-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border border-white/15 bg-[#17171b] p-3 text-white outline-none focus:border-violet-600"
              placeholder="seu@email.com"
            />
            <button type="submit" disabled={resending} className="w-full rounded-xl bg-violet-600 p-3 font-semibold text-white disabled:bg-zinc-400">
              {resending ? t('resending') : t('resend')}
            </button>
          </form>
        )}
        {!state.loading && searchParams.get('token') && <Link to="/login" className="mt-6 inline-block font-semibold text-violet-700">{t('goToLogin')}</Link>}
      </section>
    </main>
  );
};

export default VerifyEmailPage;
