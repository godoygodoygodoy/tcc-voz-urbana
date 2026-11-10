import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';
import PasswordField from './PasswordField';
import { formatBrazilianPhone, normalizeDigits } from '../utils/formatters';

const AuthModal = () => {
  const { authModal, closeAuthModal, login, register } = useAuthStore();
  const [mode, setMode] = useState(authModal || 'login');
  const [form, setForm] = useState({ identifier: '', password: '', name: '', email: '', username: '', phone: '', passwordConfirm: '' });
  const [loading, setLoading] = useState(false);
  if (!authModal) return null;
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.name === 'phone' ? formatBrazilianPhone(event.target.value) : event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (mode === 'register' && form.password !== form.passwordConfirm) return toast.error('As senhas não conferem.');
    setLoading(true);
    try {
      if (mode === 'login') await login({ identifier: form.identifier, password: form.password });
      else await register({ name: form.name, email: form.email, username: form.username.replace(/^@/, ''), phone: normalizeDigits(form.phone), password: form.password });
      toast.success(mode === 'login' ? 'Login realizado.' : 'Cadastro realizado.');
      closeAuthModal();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível concluir a autenticação.');
    } finally { setLoading(false); }
  };
  return <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Autenticação">
    <div className="site-auth-card relative max-h-[90vh] w-full max-w-md overflow-auto rounded-3xl p-7 text-white">
      <button type="button" onClick={closeAuthModal} className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10" aria-label="Fechar"><X size={18} /></button>
      <h2 className="mb-1 text-3xl font-black">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
      <p className="mb-6 text-sm text-white/60">{mode === 'login' ? 'Continue sua participação na cidade.' : 'Faça parte da comunidade Voz Urbana.'}</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && <><input name="name" value={form.name} onChange={update} placeholder="Nome completo" required className="site-form-input w-full rounded-xl p-3" /><input name="email" type="email" value={form.email} onChange={update} placeholder="E-mail" required className="site-form-input w-full rounded-xl p-3" /><input name="username" value={form.username} onChange={update} placeholder="@usuário" required minLength="3" maxLength="30" className="site-form-input w-full rounded-xl p-3" /><input name="phone" value={form.phone} onChange={update} placeholder="Telefone (opcional)" className="site-form-input w-full rounded-xl p-3" /></>}
        {mode === 'login' && <input name="identifier" value={form.identifier} onChange={update} placeholder="E-mail ou @usuário" required className="site-form-input w-full rounded-xl p-3" />}
        <PasswordField name="password" value={form.password} onChange={update} placeholder="Senha" required className="site-form-input w-full rounded-xl p-3" />
        {mode === 'register' && <PasswordField name="passwordConfirm" value={form.passwordConfirm} onChange={update} placeholder="Confirme a senha" required className="site-form-input w-full rounded-xl p-3" />}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-violet-600 py-3 font-bold disabled:opacity-60">{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      </form>
      <button type="button" onClick={() => setMode((current) => current === 'login' ? 'register' : 'login')} className="mt-5 w-full text-sm font-bold text-fuchsia-300">{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
    </div>
  </div>;
};

export default AuthModal;
