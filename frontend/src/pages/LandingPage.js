import { shallow } from 'zustand/shallow';
import { translateCategory, useI18n } from '../i18n';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '../components/LocalizedToast';
import { motion } from 'framer-motion';
import {
  Camera,
  MapPin,
  CheckCircle2,
  Mail,
  Phone,
  PhoneCall,
  MessageCircle,
  ArrowRight,
  LayoutDashboard,
  FileText,
  Compass,
  Sparkles,
  Shield,
  Waves,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import ViewportLoad from '../components/ViewportLoad';
import { lazyModule } from '../utils/lazyModule';
const Map = lazyModule(() => import('../components/Map'));
import ProblemCard from '../components/ProblemCard';
import { categoriesAPI, problemsAPI } from '../services/api';
import { getPurpleTone } from '../utils/theme';
import { useAuthStore } from '../store';
import Header from '../components/Header';

import LandingHero from '../components/LandingHero';
import AmbientContour from '../components/AmbientContour';
import { formatBrazilianPhone } from '../utils/formatters';
import { NativityFooter } from '../components/ChristmasEffects';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

export default function LandingPage() {

  const { user } = useAuthStore(state => ({ user: state.user }), shallow);
  const { t } = useI18n();
  const [recentProblems, setRecentProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);


  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        setLoadingFeed(true);
        const [problemsRes, categoriesRes] = await Promise.all([
          problemsAPI.list({ limit: 6 }),
          categoriesAPI.list(),
        ]);

        const problems = problemsRes.data?.data || [];
        const fetchedCategories = categoriesRes.data || [];

        setRecentProblems(problems);
        setSelectedProblem((currentSelected) => currentSelected || problems[0] || null);
        setCategories(fetchedCategories);
      } catch (error) {
        setRecentProblems([]);
        setSelectedProblem(null);
        setCategories([]);
        toast.error(t('apiUnavailable'));
      } finally {
        setLoadingFeed(false);
      }
    };

    fetchLandingData();
  }, []);

  const activeCategories = categories;

  const stats = useMemo(() => {
    const openCount = recentProblems.filter((problem) => ['open', 'ABERTO'].includes(problem.status)).length;
    const inProgressCount = recentProblems.filter((problem) => ['in_progress', 'EM_ANDAMENTO'].includes(problem.status)).length;
    const resolvedCount = recentProblems.filter((problem) => ['resolved', 'RESOLVIDO'].includes(problem.status)).length;

    return [
      { label: t('recentIdentifications'), value: recentProblems.length || 0 },
      { label: t("Abertos"), value: openCount },
      { label: t("Em andamento"), value: inProgressCount },
      { label: t("Resolvidos"), value: resolvedCount },
    ];
  }, [recentProblems, t]);

  const quickActions = [
    {
      title: t('reportProblem'),
      description: t('reportDescription'),
      icon: FileText,
      href: '/feed#create',
    },
    {
      title: t('openMapAction'),
      description: t('mapDescription'),
      icon: Compass,
      href: '/map',
    },
    {
      title: t('enterAccount'),
      description: t('accountDescription'),
      icon: LayoutDashboard,
      href: '/login',
    },
  ];

  const heroMetrics = [
    { label: t('feedCases'), value: `${recentProblems.length || 0}` },
    { label: t('connectedCities'), value: '1' },
    { label: t('collectiveSupport'), value: `${recentProblems.filter((item) => item.status !== 'closed').length || 0}` },
  ];

  return (
    <div className="landing-page min-h-screen bg-[#1b1d1f] text-white">
      <Header />

      <LandingHero
        user={user}
        t={t}
        heroMetrics={heroMetrics}
        quickActions={quickActions}
        stats={stats}
        recentProblems={recentProblems}
      />



      <motion.section
        id="como"
        className="landing-chapter landing-chapter--flow mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <AmbientContour variant="violet" />
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">{t("Fluxo")}</p>
          <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">{t('howItWorks')}</h3>
          <p className="mt-4 text-white/65"> {t("Uma experiência simples: registrar, localizar e acompanhar a melhoria.")} </p>
        </div>

        <motion.div className="grid gap-6 md:grid-cols-3" variants={stagger}>
          {[
            {
              title: t('takePhoto'),
              description: t("Registre o problema com contexto visual para acelerar a triagem."),
              icon: Camera,
            },
            {
              title: t('locateProblem'),
              description: t("Marque o ponto exato no mapa para facilitar a mobilização."),
              icon: MapPin,
            },
            {
              title: t('trackResolution'),
              description: t("Veja quando o caso mudar de status e avance no acompanhamento."),
              icon: CheckCircle2,
            },
          ].map(({ title, description, icon: Icon }) => (
            <motion.div key={title} variants={fadeUp} whileHover={{ y: -6 }}>
              <Card className="glass-panel h-full rounded-[1.8rem] border-white/10 bg-white/6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
                <CardContent className="p-8">
                  <Icon className="h-12 w-12 text-violet-300" />
                  <h4 className="mt-5 text-2xl font-black">{title}</h4>
                  <p className="mt-3 text-sm leading-7 text-white/65">{description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="landing-chapter landing-chapter--feed mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Feed</p>
            <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">{t('recentIdentifications')}</h3>
            <p className="mt-4 max-w-2xl text-white/65">{t('feedDescription')}</p>
          </div>
          <Link to="/map" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 transition hover:text-white"> {t("Ver tudo no mapa")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8">
          {loadingFeed ? (
            <div className="glass-panel rounded-[1.8rem] p-8 text-center text-white/70">{t('loadingProblems')}</div>
          ) : recentProblems.length === 0 ? (
            <div className="glass-panel rounded-[1.8rem] p-8 text-center text-white/70">{t('noProblems')}</div>
          ) : (
            <motion.div className="grid gap-6 md:grid-cols-3" variants={stagger}>
              {recentProblems.map((problem) => (
                <motion.div key={problem.id} variants={fadeUp}>
                  <ProblemCard problem={problem} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.section>

      <section className="landing-stats-band bg-[#160d25] py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
          {stats.map((item) => (
            <Card key={item.label} className="glass-panel rounded-[1.6rem] border-white/10 bg-white/6 text-white">
              <CardContent className="p-7 text-center">
                <div className="text-4xl font-black">{item.value}</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <motion.section
        className="landing-chapter landing-chapter--context mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.16 }}
        variants={fadeUp}
      >
        <AmbientContour variant="plum" />
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <Card
            className="overflow-hidden rounded-[2rem] border-white/10 bg-cover text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,0,0,.48),rgba(0,0,0,.48)),url(https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1200&auto=format&fit=crop)',
            }}
          >
            <CardContent className="p-10 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">{t('context')}</p>
              <h3 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
                {t('together')}
              </h3>
              <p className="mt-5 max-w-lg text-white/76 leading-8"> {t("A plataforma conecta relato, mapa e acompanhamento em um fluxo direto, sem ruído visual.")} </p>
            </CardContent>
          </Card>

          {!user && <Card className="glass-panel rounded-[2rem] border-white/10 bg-white/6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
            <CardContent className="p-8 sm:p-10 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">{t('quickAccess')}</p>
                <h3 className="mt-3 text-3xl font-black">{t('createAccount')}</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder={t('name')} />
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder={t('email')} />
                <input
                  className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60"
                  placeholder={t('phone')}
                  type="tel"
                  onChange={(event) => { event.target.value = formatBrazilianPhone(event.target.value); }}
                />
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60 md:col-span-2" placeholder={t('password')} />
              </div>

              <Link to="/register" className="block">
                <Button className="w-full rounded-full bg-white px-6 py-4 text-base font-black text-zinc-950 hover:bg-violet-50">
                  {t('createAccount')}
                </Button>
              </Link>
            </CardContent>
          </Card>}
        </div>
      </motion.section>

      <motion.section
        id="mapa"
        className="landing-chapter landing-chapter--map mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">{t('mapLabel')}</p>
          <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">{t('mapProblems')}</h3>
          <p className="mt-4 text-white/65">{t('mapSectionIntro')}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_2fr]">
          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-6 sm:p-7 space-y-3">
              <h4 className="text-xl font-black">{t('activeCategories')}</h4>
              <p className="text-sm text-white/55">{t('legend')}</p>
              <div className="mt-4 grid gap-3">
                {activeCategories.slice(0, 8).map((category, index) => (
                  <div key={category.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color || getPurpleTone(category.name || category.id, index) }} />
                    <span className="text-sm font-semibold text-white/85">{translateCategory(category.name)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#120b20] shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <CardContent className="p-4">
              <ViewportLoad minHeight={520}><Suspense fallback={<div className="deferred-surface" style={{height:520}} />}><Map problems={recentProblems} onMarkerClick={setSelectedProblem} height="520px" /></Suspense></ViewportLoad>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-xl font-black">{t('selectedProblem')}</h4>
                {selectedProblem && (
                  <button
                    type="button"
                    onClick={() => setSelectedProblem(null)}
                    className="text-sm font-semibold text-violet-200 transition hover:text-white"
                  >
                    {t('clearSelection')}
                  </button>
                )}
              </div>
              <div className="mt-5">
                {selectedProblem ? (
                  <ProblemCard problem={selectedProblem} />
                ) : (
                  <p className="text-white/65">{t('clickMarkerShort')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-7 sm:p-8 space-y-4">
              <h4 className="text-xl font-black">{t('quickAccess')}</h4>
              <p className="leading-8 text-white/65"> {t("Este espaço liga o mapa ao fluxo de denúncia. A pessoa entra, identifica o ponto, envia a ocorrência e acompanha a evolução no painel.")} </p>
              <div className="grid gap-3 text-sm text-white/78">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">1</span>
                  <p>{t("Abra o mapa ou o formulário.")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">2</span>
                  <p>{t("Veja os registros existentes e clique neles.")}</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">3</span>
                  <p>{t("Acompanhe respostas, votos e resolução.")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <motion.section
        id="sobre"
        className="landing-chapter landing-chapter--about mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <AmbientContour variant="lilac" />
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">{t("Sobre")}</p>
            <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">{t('whatIs')}</h3>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65"> {t("O Voz Urbana é uma plataforma para facilitar a comunicação entre população e órgãos públicos, permitindo denúncias práticas e acompanhamento do status de cada caso.")} </p>
          </div>

          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-7 sm:p-8 space-y-4">
              <h4 className="text-2xl font-black">{t('platformInUse')}</h4>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{t("Mapa")}</p>
                  <p className="mt-2 text-white/72">{t("Marcadores reais com popups, fit bounds e visual escuro.")}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">{t("Relatórios")}</p>
                  <p className="mt-2 text-white/72">{t("Criação de ocorrências com categoria, localização e acompanhamento.")}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/map">
                    <Button className="rounded-full bg-white px-6 py-3 font-black text-zinc-950 hover:bg-violet-50">{t("Abrir mapa")}</Button>
                  </Link>
                  <Link to="/feed#create">
                    <Button variant="outline" className="rounded-full border-white/16 bg-white/6 px-6 py-3 font-black text-white hover:bg-white/12"> {t("Reportar")} </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <motion.section
        id="contato"
        className="landing-contact bg-[#140b22] py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <AmbientContour variant="contact" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">{t("Contato")}</p>
            <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">{t('contactTitle')}</h3>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
              <CardContent className="p-7 sm:p-8 space-y-4">
                <input className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder={t("Nome")} />
                <input className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder={t("Email")} />
                <textarea className="h-40 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder={t("Mensagem")} />
                <Button className="w-full rounded-full bg-white px-6 py-4 text-base font-black text-zinc-950 hover:bg-violet-50"> {t("Enviar mensagem")} </Button>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="glass-panel rounded-[1.5rem] border-white/10 bg-white/6 text-white">
                <CardContent className="flex items-center gap-4 p-6">
                  <span className="relative flex h-7 w-7 items-center justify-center text-violet-300" aria-hidden="true">
                    <MessageCircle className="h-7 w-7" />
                    <PhoneCall className="absolute h-3.5 w-3.5" />
                  </span>
                  <span className="font-bold">WhatsApp</span>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-[1.5rem] border-white/10 bg-white/6 text-white">
                <CardContent className="flex items-center gap-4 p-6">
                  <Phone className="h-6 w-6 text-violet-300" />
                  <span className="font-bold">{t("Telefone")}</span>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-[1.5rem] border-white/10 bg-white/6 text-white">
                <CardContent className="flex items-center gap-4 p-6">
                  <Mail className="h-6 w-6 text-violet-300" />
                  <span className="font-bold">{t("E-mail")}</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.section>

      <NativityFooter />
      {/*
        © Voz Urbana 2026 - Sua voz melhora a cidade
      */}
    </div>
  );
}
