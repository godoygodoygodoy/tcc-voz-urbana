import React from 'react';
import { ArrowDownRight, ArrowUpRight, MapPinned, Megaphone, Radio, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from './ui/card';
import ThreeCityBackdrop from './ThreeCityBackdrop';

const LandingHero = ({
  user,
  t,
  heroMetrics,
  quickActions,
  stats,
  recentProblems,
}) => {
  const marqueeText = `${t('citySpeaks')} ${t('speaks')} / VOZ URBANA / `;

  return (
    <section id="inicio" className="urban-hero" aria-labelledby="urban-hero-title">
      <div className="urban-hero__wash" aria-hidden="true" />
      <div className="urban-hero__grid" aria-hidden="true" />

      <div className="urban-hero__topline">
        <span>PLATAFORMA CÍVICA DIGITAL</span>
        <span className="urban-hero__topline-status"><i /> SISTEMA ONLINE</span>
      </div>

      <div className="urban-hero__layout">
        <aside className="urban-hero__rail" aria-label="Atalhos da página">
          <span className="urban-hero__rail-line" />
          <span className="urban-hero__rail-label">DESLIZE PARA EXPLORAR</span>
          <ArrowDownRight size={18} />
        </aside>

        <div className="urban-hero__copy">
          <motion.div
            className="urban-hero__eyebrow"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="urban-hero__eyebrow-mark"><Radio size={13} /></span>
            {t('liveMap')}
          </motion.div>

          <motion.h1
            id="urban-hero-title"
            className="urban-hero__title"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>{t('citySpeaks')}</span>
            <span className="urban-hero__title-accent">{t('speaks')}<span className="urban-hero__title-dot">.</span></span>
            <em>{t('amplify')}</em>
          </motion.h1>

          <motion.p
            className="urban-hero__description"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.45 }}
          >
            {t('heroCopy')}
          </motion.p>

          <motion.div
            className="urban-hero__actions"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <Link to={user ? '/map' : '/login'} className="urban-hero__primary">
              {user ? t('openMap') : t('login')}
              <ArrowUpRight size={18} />
            </Link>
            <Link to="/map" className="urban-hero__secondary">{t('exploreMap')}</Link>
          </motion.div>

          <div className="urban-hero__metrics">
            {heroMetrics.map((metric, index) => (
              <div key={metric.label} className="urban-hero__metric">
                <strong>{metric.value}</strong>
                <span>0{index + 1} / {metric.label}</span>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          className="urban-hero__artifact"
          initial={{ opacity: 0, scale: 0.86, rotate: 5 }}
          animate={{ opacity: 1, scale: 1, rotate: 2 }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="urban-hero__artifact-glow" aria-hidden="true" />
          <Card className="urban-hero__panel">
            <CardContent className="p-0">
              <div className="urban-hero__panel-scene" aria-hidden="true">
                <ThreeCityBackdrop />
                <div className="urban-hero__panel-crosshair" />
              </div>
              <div className="urban-hero__panel-head">
                <span><ShieldCheck size={15} /> {t('livePanel')}</span>
                <span className="urban-hero__live-pill"><i /> {t('online')}</span>
              </div>
              <div className="urban-hero__panel-content">
                <div className="urban-hero__panel-kicker">{t('cityFocus')}</div>
                <h2>{t('recentCases')}</h2>
                <div className="urban-hero__case-list">
                  {quickActions.map(({ title, description, icon: Icon }, index) => (
                    <Link to={index === 0 ? '/report' : index === 1 ? '/map' : '/login'} key={title} className="urban-hero__case">
                      <span className="urban-hero__case-icon"><Icon size={16} /></span>
                      <span><strong>{title}</strong><small>{description}</small></span>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </div>
                <div className="urban-hero__panel-foot">
                  <span><MapPinned size={14} /> {recentProblems.length} {t('feedCases')}</span>
                  <span>{stats[0]?.value || 0} {t('collectiveSupport')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="urban-hero__marquee" aria-hidden="true">
        <div>{marqueeText}{marqueeText}</div>
      </div>

      <div className="urban-hero__bottomline">
        <span>REGISTRE · LOCALIZE · TRANSFORME</span>
        <span>SCROLL <ArrowDownRight size={15} /></span>
      </div>
    </section>
  );
};

export default LandingHero;
