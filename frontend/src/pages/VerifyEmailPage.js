import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: '' });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState({ loading: false, message: 'Link de verificação inválido.' });
      return;
    }

    authAPI.verifyEmail(token)
      .then((response) => setState({ loading: false, message: response.data.message }))
      .catch((error) => setState({ loading: false, message: error.response?.data?.error || 'Não foi possível verificar o e-mail.' }));
  }, [searchParams]);

  return (
      <main className="min-h-screen bg-[#1b1b20] flex items-center justify-center px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#202026] p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-white">Verificação de e-mail</h1>
        <p className="mt-4 text-white/65">{state.loading ? 'Validando seu link...' : state.message}</p>
        {!state.loading && <Link to="/login" className="mt-6 inline-block font-semibold text-violet-700">Ir para o login</Link>}
      </section>
    </main>
  );
};

export default VerifyEmailPage;
