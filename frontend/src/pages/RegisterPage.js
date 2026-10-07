import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { toast } from 'react-toastify';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useI18n } from '../i18n';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
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

    if (formData.password !== formData.passwordConfirm) {
      toast.error(t('passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        username: formData.username.replace(/^@/, '').trim(),
      });
      toast.success(t('registerSuccess'));
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || t('registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1b1b20] flex items-center justify-center py-12 px-4 text-white">
      <Card className="glass-panel rounded-3xl w-full max-w-md shadow-2xl">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">
              <span className="text-violet-600">VOZ</span> URBANA
            </h1>
            <p className="text-white/60">{t('registerTitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('fullNamePlaceholder')}
                required
                className="w-full rounded-xl border-2 border-white/10 p-3 focus:outline-none focus:border-violet-500"
              />
            </div>

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
              <label className="block text-sm font-semibold mb-2">{t('username')}</label>
              <div className="flex items-center border-2 rounded-xl focus-within:border-violet-600">
                <span className="pl-3 text-gray-500">@</span>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="seuusuario"
                  required
                  minLength="3"
                  maxLength="30"
                  pattern="[A-Za-z0-9._]+"
                  className="w-full rounded-xl p-3 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('usernameHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('password')}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('minPassword')}
                required
                className="w-full rounded-xl border-2 border-white/10 p-3 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('passwordConfirm')}</label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder={t('confirmPasswordPlaceholder')}
                required
                className="w-full rounded-xl border-2 border-white/10 p-3 focus:outline-none focus:border-violet-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl py-3 text-lg font-bold mt-6"
              disabled={loading}
            >
              {loading ? t('registerLoading') : t('createAccount')}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-white/60">
              {t('hasAccount')}{' '}
              <Link to="/login" className="text-violet-600 font-bold hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
