import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    const verify = async () => {
      if (!token) {
        setStatus('Token ausente');
        setLoading(false);
        return;
      }

      try {
        await authAPI.verifyEmail({ token });
        setStatus('E-mail confirmado com sucesso');
        toast.success('E-mail confirmado com sucesso');
      } catch (error) {
        const message = error.response?.data?.error || 'Não foi possível confirmar o e-mail';
        setStatus(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#06070b] px-4 py-12 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <Card className="glass-panel rounded-[2rem] border-white/10 bg-white/6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          <CardContent className="p-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Verificação</p>
            <h1 className="mt-4 text-3xl font-black">Confirmação de e-mail</h1>
            <p className="mt-4 text-white/65">
              {loading ? 'Confirmando seu e-mail...' : status}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/login">
                <Button className="rounded-full bg-white px-6 py-3 font-black text-zinc-950 hover:bg-violet-50">
                  Ir para login
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="rounded-full border-white/16 bg-white/6 px-6 py-3 font-black text-white hover:bg-white/12">
                  Voltar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
