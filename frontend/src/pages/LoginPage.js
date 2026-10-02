import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { toast } from 'react-toastify';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useI18n } from '../i18n';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login({ email: formData.email, password: formData.password });
      toast.success(t('loginSuccess'));
      navigate('/');
    } catch (error) {
      if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(error.response.data.email || formData.email)}`);
        return;
      }
      toast.error(error.response?.data?.error || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1b1b20] flex items-center justify-center py-12 px-4 text-white">
      <Card className="rounded-3xl w-full max-w-md shadow-2xl">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">
              <span className="text-violet-600">VOZ</span> URBANA
            </h1>
            <p className="text-white/60">{t('loginTitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('email')}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder')}
                required
                className="w-full rounded-xl border-2 border-white/10 p-3 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('password')}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('passwordPlaceholder')}
                required
                className="w-full rounded-xl border-2 border-white/10 p-3 focus:outline-none focus:border-violet-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl py-3 text-lg font-bold mt-6"
              disabled={loading}
            >
              {loading ? t('loginLoading') : t('login')}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-white/60">
              {t('noAccount')}{' '}
              <Link to="/register" className="text-violet-600 font-bold hover:underline">
                {t('signUp')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
