import { useI18n } from '../i18n';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { toast } from '../components/LocalizedToast';
import { authAPI } from '../services/api';


const ForgotPasswordPage = () => {

  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email);
      setSent(true);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.error || t("Não foi possível solicitar a redefinição."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-auth-page min-h-screen flex items-center justify-center py-12 px-4 text-white">
      <div className="site-auth-card glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl sm:p-10">
        <Link to="/login" className="site-auth-back"><ArrowLeft size={16} /> {t("Voltar para o login")}</Link>
        <div className="mt-8 text-center">
          <div className="site-auth-icon"><Mail size={23} /></div>
          <h1 className="mt-5 text-3xl font-black">{t('forgotPasswordTitle')}</h1>
          <p className="mt-3 text-sm text-white/55">{t("Informe seu e-mail e enviaremos um link seguro para criar uma nova senha.")}</p>
        </div>
        {sent ? (
          <div className="site-auth-success mt-8"><strong>{t("Confira sua caixa de entrada")}</strong><span>{t("Se existir uma conta com esse e-mail, o link de redefinição já foi enviado. Ele expira em 1 hora.")}</span></div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold">{t('email')}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('emailPlaceholder')} required className="site-form-input mt-2 w-full rounded-xl border p-3" /></label>
            <button type="submit" disabled={loading} className="site-auth-submit"> <Send size={16} /> {loading ? 'Enviando...' : t("Enviar link de redefinição")}</button>
          </form>
        )}
        <p className="mt-7 text-center text-sm text-white/50">{t("Lembrou da senha?")} <Link to="/login" className="font-bold text-fuchsia-300 hover:text-white">{t("Entrar")}</Link></p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
