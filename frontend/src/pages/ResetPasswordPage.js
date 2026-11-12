import { useI18n } from '../i18n';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Save } from 'lucide-react';
import { toast } from '../components/LocalizedToast';
import { authAPI } from '../services/api';

import PasswordField from '../components/PasswordField';

const ResetPasswordPage = () => {

  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams, t]);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 6) return toast.error(t("A senha deve ter pelo menos 6 caracteres."));
    if (password !== passwordConfirm) return toast.error(t("As senhas não coincidem."));
    if (!token) return toast.error(t("Link de redefinição inválido."));

    try {
      setLoading(true);
      const response = await authAPI.resetPassword({ token, password });
      toast.success(response.data.message);
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || t("Não foi possível redefinir sua senha."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-auth-page min-h-screen flex items-center justify-center py-12 px-4 text-white">
      <div className="site-auth-card glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl sm:p-10">
        <Link to="/login" className="site-auth-back"><ArrowLeft size={16} /> {t("Voltar para o login")}</Link>
        <div className="mt-8 text-center"><div className="site-auth-icon"><LockKeyhole size={23} /></div><h1 className="mt-5 text-3xl font-black">{t('resetPasswordTitle')}</h1><p className="mt-3 text-sm text-white/55">{t("Crie uma senha nova para recuperar o acesso à sua conta.")}</p></div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold">{t('resetPasswordTitle')}<PasswordField value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("Mínimo de 6 caracteres")} minLength="6" required className="site-form-input mt-2 w-full rounded-xl border p-3" /></label>
          <label className="block text-sm font-semibold">{t("Confirme a nova senha")}<PasswordField value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder={t("Digite novamente sua senha")} minLength="6" required className="site-form-input mt-2 w-full rounded-xl border p-3" /></label>
          <button type="submit" disabled={loading} className="site-auth-submit"><Save size={16} /> {loading ? t("Salvando...") : t("Redefinir senha")}</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
