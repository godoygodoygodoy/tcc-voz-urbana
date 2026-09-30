import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: '' });
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState({ loading: false, message: 'Abra o link enviado para o seu e-mail para confirmar a conta.' });
      return;
    }

    authAPI.verifyEmail(token)
      .then((response) => setState({ loading: false, message: response.data.message }))
      .catch((error) => setState({ loading: false, message: error.response?.data?.error || 'Não foi possível verificar o e-mail.' }));
  }, [searchParams]);

  const resendVerification = async (event) => {
    event.preventDefault();
    if (!email) return;
    setResending(true);
    try {
      await authAPI.resendVerification(email);
      setState({ loading: false, message: 'Enviamos um novo link de confirmação. Confira sua caixa de entrada e o spam.' });
    } catch (error) {
      setState({ loading: false, message: error.response?.data?.error || 'Não foi possível reenviar o e-mail.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-zinc-900">Verificação de e-mail</h1>
        <p className="mt-4 text-zinc-600">{state.loading ? 'Validando seu link...' : state.message}</p>
        {!state.loading && !searchParams.get('token') && (
          <form onSubmit={resendVerification} className="mt-6 space-y-3 text-left">
            <label className="block text-sm font-semibold text-zinc-700" htmlFor="verification-email">E-mail cadastrado</label>
            <input
              id="verification-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-xl border p-3 outline-none focus:border-violet-600"
              placeholder="seu@email.com"
            />
            <button type="submit" disabled={resending} className="w-full rounded-xl bg-violet-600 p-3 font-semibold text-white disabled:bg-zinc-400">
              {resending ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
            </button>
          </form>
        )}
        {!state.loading && searchParams.get('token') && <Link to="/login" className="mt-6 inline-block font-semibold text-violet-700">Ir para o login</Link>}
      </section>
    </main>
  );
};

export default VerifyEmailPage;
