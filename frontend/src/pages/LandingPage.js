import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  Camera,
  MapPin,
  CheckCircle2,
  Mail,
  Phone,
  AlertTriangle,
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
import Map from '../components/Map';
import ProblemCard from '../components/ProblemCard';
import { categoriesAPI, problemsAPI } from '../services/api';
import ThreeCityBackdrop from '../components/ThreeCityBackdrop';
import { getPurpleTone } from '../utils/theme';

const fallbackCategories = [
  { id: 'asfalto', name: 'Asfalto' },
  { id: 'lixo', name: 'Lixo' },
  { id: 'vegetacao', name: 'Vegetação' },
  { id: 'iluminacao', name: 'Iluminação' },
  { id: 'sinalizacao', name: 'Sinalização' },
  { id: 'saneamento', name: 'Saneamento' },
];

const demoProblems = [
  {
    id: 'demo-1',
    title: 'Buraco no asfalto',
    description: 'Trecho com risco para motos e carros em horário de pico.',
    address: 'Av. Central, 1200',
    latitude: -15.7797,
    longitude: -47.9297,
    status: 'open',
    votes: 18,
    createdAt: new Date().toISOString(),
    category: fallbackCategories[0],
    images: [],
  },
  {
    id: 'demo-2',
    title: 'Lixeira transbordando',
    description: 'Ponto de descarte acumulando resíduos há vários dias.',
    address: 'Rua do Comércio, 48',
    latitude: -15.7868,
    longitude: -47.8841,
    status: 'in_progress',
    votes: 11,
    createdAt: new Date().toISOString(),
    category: fallbackCategories[1],
    images: [],
  },
  {
    id: 'demo-3',
    title: 'Árvore obstruindo a passagem',
    description: 'Galhos avançando sobre a calçada e a sinalização da via.',
    address: 'Rua Santa Clara, 77',
    latitude: -15.8022,
    longitude: -47.9134,
    status: 'resolved',
    votes: 7,
    createdAt: new Date().toISOString(),
    category: fallbackCategories[2],
    images: [],
  },
];

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
  const [recentProblems, setRecentProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const heroRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !heroRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from('[data-hero-badge]', {
        y: 24,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
      });

      gsap.from('[data-hero-line]', {
        y: 42,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        delay: 0.1,
        ease: 'power4.out',
      });

      gsap.from('[data-hero-copy]', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.35,
        ease: 'power2.out',
      });

      gsap.from('[data-hero-actions]', {
        y: 16,
        opacity: 0,
        duration: 0.85,
        delay: 0.55,
        ease: 'power2.out',
      });

      gsap.to('[data-hero-orb]', {
        y: 18,
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.35,
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

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

        setRecentProblems(problems.length > 0 ? problems : demoProblems);
        setSelectedProblem((currentSelected) => currentSelected || problems[0] || demoProblems[0] || null);
        setCategories(fetchedCategories.length > 0 ? fetchedCategories : fallbackCategories);
      } catch (error) {
        setRecentProblems(demoProblems);
        setSelectedProblem(demoProblems[0]);
        setCategories(fallbackCategories);
        toast.info('Modo demonstração ativado, a API não respondeu');
      } finally {
        setLoadingFeed(false);
      }
    };

    fetchLandingData();
  }, []);

  const activeCategories = categories.length > 0 ? categories : fallbackCategories;

  const stats = useMemo(() => {
    const openCount = recentProblems.filter((problem) => problem.status === 'open').length;
    const inProgressCount = recentProblems.filter((problem) => problem.status === 'in_progress').length;
    const resolvedCount = recentProblems.filter((problem) => problem.status === 'resolved').length;

    return [
      { label: 'Relatos exibidos', value: recentProblems.length || 0 },
      { label: 'Abertos', value: openCount },
      { label: 'Em andamento', value: inProgressCount },
      { label: 'Resolvidos', value: resolvedCount },
    ];
  }, [recentProblems]);

  const quickActions = [
    {
      title: 'Reportar um problema',
      description: 'Abra o formulário e envie localização, foto e descrição.',
      icon: FileText,
      href: '/report',
    },
    {
      title: 'Abrir o mapa',
      description: 'Veja os pontos já cadastrados e clique nos marcadores.',
      icon: Compass,
      href: '/map',
    },
    {
      title: 'Entrar na conta',
      description: 'Acesse o histórico, votos e perfil do usuário.',
      icon: LayoutDashboard,
      href: '/login',
    },
  ];

  const heroMetrics = [
    { label: 'Casos no feed', value: `${recentProblems.length || 0}` },
    { label: 'Cidades conectadas', value: '1' },
    { label: 'Apoio coletivo', value: `${recentProblems.filter((item) => item.status !== 'closed').length || 0}` },
  ];

  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.18)] transition-transform duration-300 group-hover:scale-105">
              <span className="text-lg font-black">V</span>
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.28em] text-white/90">Voz Urbana</div>
              <div className="text-xs text-white/50">A cidade fala, você amplifica</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 lg:flex">
            <a href="#como" className="transition-colors hover:text-white">Como funciona</a>
            <a href="#mapa" className="transition-colors hover:text-white">Mapa</a>
            <a href="#sobre" className="transition-colors hover:text-white">Sobre</a>
            <a href="#contato" className="transition-colors hover:text-white">Contato</a>
          </nav>

          <Link to="/login">
            <Button className="rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950 hover:bg-white/90">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      <section id="inicio" ref={heroRef} className="hero-grid relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.28),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.18),transparent_24%),linear-gradient(180deg,rgba(6,7,11,0.72),rgba(6,7,11,0.92))]" />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

        <div data-hero-orb className="absolute left-8 top-16 h-24 w-24 rounded-full bg-violet-500/25 blur-3xl" />
        <div data-hero-orb className="absolute right-10 top-36 h-28 w-28 rounded-full bg-violet-400/20 blur-3xl" />
        <div data-hero-orb className="absolute bottom-12 left-1/3 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-74px)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-3xl"
          >
            <motion.div
              data-hero-badge
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70 backdrop-blur-xl"
            >
              <Sparkles className="h-4 w-4 text-violet-300" />
              Mapa vivo da cidade
            </motion.div>

            <motion.h1
              className="mt-8 text-[clamp(3.8rem,11vw,8.6rem)] font-black uppercase leading-[0.86] tracking-[-0.06em] text-white"
              style={{ textShadow: '0 18px 50px rgba(0, 0, 0, 0.55)' }}
            >
              <span data-hero-line className="block">A CIDADE</span>
              <span data-hero-line className="block text-transparent bg-clip-text bg-[linear-gradient(90deg,#ffffff_0%,#c4b5fd_45%,#a855f7_100%)]">FALA</span>
              <span data-hero-line className="mt-4 block text-[clamp(1.3rem,4.4vw,3.25rem)] font-semibold uppercase tracking-[0.42em] text-white/82">
                Você amplifica
              </span>
            </motion.h1>

            <motion.p
              data-hero-copy
              className="mt-8 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl"
            >
              Reporte buracos, lixo, iluminação, árvores e outros problemas urbanos com mapa interativo, votação comunitária e acompanhamento real.
            </motion.p>

            <motion.div data-hero-actions className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/login">
                <Button className="rounded-full bg-white px-8 py-4 text-base font-black text-zinc-950 hover:bg-violet-50">
                  Entrar
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="outline" className="rounded-full border-white/18 bg-white/6 px-8 py-4 text-base font-bold text-white hover:bg-white/12">
                  Explorar mapa
                </Button>
              </Link>
            </motion.div>

            <motion.div
              data-hero-copy
              className="mt-12 grid gap-4 sm:grid-cols-3"
            >
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="glass-panel rounded-3xl p-4">
                  <div className="text-3xl font-black text-white">{metric.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/55">{metric.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            data-hero-panel
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
            className="relative z-20"
          >
            <div className="absolute -inset-4 rounded-[2.25rem] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_35%)] blur-2xl" />

            <Card className="glass-panel relative overflow-hidden rounded-[2rem] border-white/10 text-white shadow-[0_26px_80px_rgba(0,0,0,0.45)]">
              <CardContent className="p-0">
                <div className="absolute inset-0 opacity-65">
                  <ThreeCityBackdrop />
                </div>
                <div className="flex items-center justify-between border-b border-white/8 bg-white/5 px-5 py-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50">
                    <Shield className="h-4 w-4 text-violet-300" />
                    Painel ao vivo
                  </div>
                  <div className="rounded-full border border-violet-400/25 bg-violet-400/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200">
                    Online
                  </div>
                </div>

                <div className="relative z-10 space-y-5 p-5 sm:p-6">
                  <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Cidade em foco</p>
                        <h2 className="mt-2 text-2xl font-black">Ocorrências recentes</h2>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-white/80">
                        Ao vivo
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {quickActions.map(({ title, description, icon: Icon }) => (
                        <div key={title} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 backdrop-blur-sm">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-violet-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white">{title}</div>
                            <div className="mt-1 text-sm leading-6 text-white/62">{description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {stats.slice(0, 2).map((item, index) => (
                      <div
                        key={item.label}
                        className={`rounded-[1.5rem] border border-white/8 p-4 ${index === 0 ? 'bg-violet-400/12' : 'bg-violet-500/12'}`}
                      >
                        <div className="text-3xl font-black">{item.value}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/50">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.6rem] border border-dashed border-white/12 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                      <Waves className="h-4 w-4 text-violet-300" />
                      Fluxo da cidade
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-white/72">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">1</span>
                        <p>Você identifica o problema e envia o local com rapidez.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">2</span>
                        <p>O ponto entra no mapa com categoria e status visual.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">3</span>
                        <p>A comunidade vota e acompanha a resolução do caso.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <motion.section
        id="como"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Fluxo</p>
          <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">Como funciona?</h3>
          <p className="mt-4 text-white/65">
            Uma experiência simples: registrar, localizar e acompanhar a melhoria.
          </p>
        </div>

        <motion.div className="grid gap-6 md:grid-cols-3" variants={stagger}>
          {[
            {
              title: 'Tire uma foto',
              description: 'Registre o problema com contexto visual para acelerar a triagem.',
              icon: Camera,
            },
            {
              title: 'Localize o problema',
              description: 'Marque o ponto exato no mapa para facilitar a mobilização.',
              icon: MapPin,
            },
            {
              title: 'Acompanhe a resolução',
              description: 'Veja quando o caso mudar de status e avance no acompanhamento.',
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
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Feed</p>
            <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">Identificações recentes</h3>
            <p className="mt-4 max-w-2xl text-white/65">Os dados vêm da API. Quando ela não responde, a página continua viva com os registros de demonstração.</p>
          </div>
          <Link to="/map" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200 transition hover:text-white">
            Ver tudo no mapa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8">
          {loadingFeed ? (
            <div className="glass-panel rounded-[1.8rem] p-8 text-center text-white/70">Carregando problemas...</div>
          ) : recentProblems.length === 0 ? (
            <div className="glass-panel rounded-[1.8rem] p-8 text-center text-white/70">Nenhum problema encontrado no momento.</div>
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

      <section className="bg-[#0b1020] py-16">
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
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.16 }}
        variants={fadeUp}
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <Card
            className="overflow-hidden rounded-[2rem] border-white/10 bg-cover text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,0,0,.48),rgba(0,0,0,.48)),url(https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1200&auto=format&fit=crop)',
            }}
          >
            <CardContent className="p-10 sm:p-12">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">Contexto</p>
              <h3 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
                JUNTOS, PODEMOS TRANSFORMAR A NOSSA CIDADE
              </h3>
              <p className="mt-5 max-w-lg text-white/76 leading-8">
                A plataforma conecta relato, mapa e acompanhamento em um fluxo direto, sem ruído visual.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-[2rem] border-white/10 bg-white/6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
            <CardContent className="p-8 sm:p-10 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">Acesso rápido</p>
                <h3 className="mt-3 text-3xl font-black">Criar conta</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="Nome" />
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="Email" />
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="CPF" />
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="Telefone" />
                <input className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60 md:col-span-2" placeholder="Senha" />
              </div>

              <Link to="/register" className="block">
                <Button className="w-full rounded-full bg-white px-6 py-4 text-base font-black text-zinc-950 hover:bg-violet-50">
                  Criar conta
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <motion.section
        id="mapa"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Mapa</p>
          <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">Problemas no mapa</h3>
          <p className="mt-4 text-white/65">Clique em um marcador para destacar o problema abaixo do mapa.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_2fr]">
          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-6 sm:p-7 space-y-3">
              <h4 className="text-xl font-black">Categorias ativas</h4>
              <p className="text-sm text-white/55">Legenda compacta para leitura rápida.</p>
              <div className="mt-4 grid gap-3">
                {activeCategories.slice(0, 8).map((category) => (
                  <div key={category.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: getPurpleTone(category.name || category.id) }} />
                    <span className="text-sm font-semibold text-white/85">{category.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#020617] shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <CardContent className="p-4">
              <Map problems={recentProblems} onMarkerClick={setSelectedProblem} height="520px" />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-xl font-black">Problema selecionado</h4>
                {selectedProblem && (
                  <button
                    type="button"
                    onClick={() => setSelectedProblem(null)}
                    className="text-sm font-semibold text-violet-200 transition hover:text-white"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>
              <div className="mt-5">
                {selectedProblem ? (
                  <ProblemCard problem={selectedProblem} />
                ) : (
                  <p className="text-white/65">Clique em um marcador para ver os detalhes aqui.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-7 sm:p-8 space-y-4">
              <h4 className="text-xl font-black">O que você faz aqui</h4>
              <p className="leading-8 text-white/65">
                Este espaço liga o mapa ao fluxo de denúncia. A pessoa entra, identifica o ponto, envia a ocorrência e acompanha a evolução no painel.
              </p>
              <div className="grid gap-3 text-sm text-white/78">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">1</span>
                  <p>Abra o mapa ou o formulário.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">2</span>
                  <p>Veja os registros existentes e clique neles.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950">3</span>
                  <p>Acompanhe respostas, votos e resolução.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <motion.section
        id="sobre"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Sobre</p>
            <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">O que é?</h3>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">
              O Voz Urbana é uma plataforma para facilitar a comunicação entre população e órgãos públicos, permitindo denúncias práticas e acompanhamento do status de cada caso.
            </p>
          </div>

          <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
            <CardContent className="p-7 sm:p-8 space-y-4">
              <h4 className="text-2xl font-black">A plataforma em uso</h4>
              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Mapa</p>
                  <p className="mt-2 text-white/72">Marcadores reais com popups, fit bounds e visual escuro.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Relatórios</p>
                  <p className="mt-2 text-white/72">Criação de ocorrências com categoria, localização e acompanhamento.</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/map">
                    <Button className="rounded-full bg-white px-6 py-3 font-black text-zinc-950 hover:bg-violet-50">Abrir mapa</Button>
                  </Link>
                  <Link to="/report">
                    <Button variant="outline" className="rounded-full border-white/16 bg-white/6 px-6 py-3 font-black text-white hover:bg-white/12">
                      Reportar
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <motion.section
        id="contato"
        className="bg-[#090f1d] py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.18 }}
        variants={fadeUp}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Contato</p>
            <h3 className="mt-3 text-4xl font-black text-white sm:text-5xl">Fale com a Voz Urbana</h3>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="glass-panel rounded-[1.8rem] border-white/10 bg-white/6 text-white">
              <CardContent className="p-7 sm:p-8 space-y-4">
                <input className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="Nome" />
                <input className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="Email" />
                <textarea className="h-40 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-white placeholder:text-white/35 outline-none transition focus:border-violet-300/60" placeholder="Mensagem" />
                <Button className="w-full rounded-full bg-white px-6 py-4 text-base font-black text-zinc-950 hover:bg-violet-50">
                  Enviar mensagem
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="glass-panel rounded-[1.5rem] border-white/10 bg-white/6 text-white">
                <CardContent className="flex items-center gap-4 p-6">
                  <Mail className="h-6 w-6 text-violet-300" />
                  <span className="font-bold">WhatsApp</span>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-[1.5rem] border-white/10 bg-white/6 text-white">
                <CardContent className="flex items-center gap-4 p-6">
                  <Phone className="h-6 w-6 text-violet-300" />
                  <span className="font-bold">Telefone</span>
                </CardContent>
              </Card>
              <Card className="glass-panel rounded-[1.5rem] border-white/10 bg-white/6 text-white">
                <CardContent className="flex items-center gap-4 p-6">
                  <AlertTriangle className="h-6 w-6 text-violet-300" />
                  <span className="font-bold">E-mail</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </motion.section>

      <footer className="border-t border-white/10 bg-black py-8 text-center text-sm text-white/55">
        © Voz Urbana 2024 - Sua voz melhora a cidade
      </footer>
    </div>
  );
}
