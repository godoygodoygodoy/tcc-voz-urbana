import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCompass, FiFileText, FiHome, FiInfo, FiMail, FiMenu, FiMap, FiX } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';

const SiteMenu = () => {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clickedIndex, setClickedIndex] = useState(null);
  const [clickPulse, setClickPulse] = useState(0);
  const [pointerInside, setPointerInside] = useState(false);
  const [pointerIndex, setPointerIndex] = useState(null);
  const pointerIndexRef = useRef(null);
  const navRef = useRef(null);
  const linkRefs = useRef([]);
  const labelRefs = useRef([]);
  const indicatorRef = useRef(null);
  const physicsRef = useRef({ currentX: 0, currentY: 0, targetX: 0, targetY: 0, velocityX: 0, velocityY: 0, frame: 0 });
  const navigationRef = useRef(null);

  const items = [
    { label: t('navHome'), href: '/', icon: FiHome },
    { label: t('navHow'), href: '/#como', icon: FiCompass },
    { label: t('navMap'), href: '/map', icon: FiMap },
    { label: t('navFeed'), href: '/feed', icon: FiFileText },
    { label: t('navAbout'), href: '/#sobre', icon: FiInfo },
    { label: t('navContact'), href: '/#contato', icon: FiMail },
  ];

  const currentIndex = items.findIndex(({ href }) => {
    const [path, hash] = href.split('#');
    if (location.pathname !== path) return false;
    return hash ? location.hash === `#${hash}` : !location.hash;
  });
  const routeIndex = location.pathname === '/report' ? items.length : currentIndex;
  const selectedIndex = clickedIndex ?? (routeIndex >= 0 ? routeIndex : null);
  const indicatorIndex = pointerInside ? null : selectedIndex;

  useEffect(() => {
    setClickedIndex(null);
    setPointerInside(false);
    setPointerIndex(null);
    pointerIndexRef.current = null;
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && navigationRef.current) {
        navigationRef.current.cancelled = true;
        navigationRef.current = null;
        setOpen(false);
      }
    };
    const handleManualScroll = () => {
      if (navigationRef.current && !navigationRef.current.programmatic) {
        navigationRef.current.cancelled = true;
        navigationRef.current = null;
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleManualScroll, { passive: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleManualScroll);
    };
  }, []);

  useEffect(() => () => {
    if (navigationRef.current) navigationRef.current.cancelled = true;
  }, []);

  const targetForIndex = (index) => {
    const label = labelRefs.current[index];
    const nav = navRef.current;
    if (!label || !nav) return null;
    const labelRect = label.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const rail = indicatorRef.current;
    const svg = rail?.querySelector('.site-menu-arrow-svg');
    const railRect = rail?.getBoundingClientRect();
    const svgRect = svg?.getBoundingClientRect();
    const tipInset = railRect && svgRect
      ? svgRect.left - railRect.left + (svgRect.width * (3 / 34))
      : 4.85;
    return {
      x: labelRect.right - navRect.left + 4 - tipInset,
      y: labelRect.top + labelRect.height / 2 - navRect.top,
    };
  };

  const setIndicatorTarget = (value) => {
    if (value == null) return;
    physicsRef.current.targetX = value.x;
    physicsRef.current.targetY = value.y;
  };

  useLayoutEffect(() => {
    const initial = selectedIndex == null ? null : targetForIndex(selectedIndex);
    if (initial == null) return undefined;
    physicsRef.current.currentX = initial.x;
    physicsRef.current.currentY = initial.y;
    physicsRef.current.targetX = initial.x;
    physicsRef.current.targetY = initial.y;
    if (indicatorRef.current) indicatorRef.current.style.transform = `translate3d(${initial.x}px, ${initial.y}px, 0) translateY(-50%)`;
    return undefined;
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const physics = physicsRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const distanceX = physics.targetX - physics.currentX;
      const distanceY = physics.targetY - physics.currentY;
      physics.velocityX = physics.velocityX * 0.72 + distanceX * 0.18;
      physics.velocityY = physics.velocityY * 0.72 + distanceY * 0.18;
      physics.currentX += physics.velocityX;
      physics.currentY += physics.velocityY;
      if (indicatorRef.current) {
        const stretch = Math.min(1.08, 1 + Math.min(0.08, Math.abs(physics.velocityY) * 0.012));
        indicatorRef.current.style.transform = `translate3d(${physics.currentX}px, ${physics.currentY}px, 0) translateY(-50%)`;
        indicatorRef.current.style.setProperty('--arrow-stretch', stretch.toFixed(3));
      }
      physics.frame = requestAnimationFrame(tick);
    };
    if (!reducedMotion) physics.frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(physics.frame);
  }, [open]);

  useEffect(() => {
    const update = () => {
      if (pointerInside && pointerIndexRef.current != null) {
        setIndicatorTarget(targetForIndex(pointerIndexRef.current));
      } else if (selectedIndex != null) {
        setIndicatorTarget(targetForIndex(selectedIndex));
      }
    };
    window.addEventListener('resize', update);
    document.fonts?.addEventListener?.('loadingdone', update);
    update();
    return () => {
      window.removeEventListener('resize', update);
      document.fonts?.removeEventListener?.('loadingdone', update);
    };
  }, [open, pointerInside, pointerIndex, selectedIndex, items.length]);

  const handleNavPointerMove = (event) => {
    const nav = navRef.current;
    if (!nav) return;
    const targets = labelRefs.current.map((label) => {
      if (!label) return null;
      const rect = label.getBoundingClientRect();
      return { x: rect.right, y: rect.top + rect.height / 2 };
    }).filter((target) => target != null);
    if (!targets.length) return;
    setPointerInside(true);
    const distances = targets.map((target) => Math.abs(event.clientY - target.y));
    const nearestIndex = distances.indexOf(Math.min(...distances));
    const currentIndex = pointerIndexRef.current;
    const hysteresis = 8;
    const nextIndex = currentIndex != null
      && distances[currentIndex] <= distances[nearestIndex] + hysteresis
      ? currentIndex
      : nearestIndex;
    pointerIndexRef.current = nextIndex;
    setPointerIndex(nextIndex);
    setIndicatorTarget(targetForIndex(nextIndex));
  };

  const waitForSequence = (sequence, duration) => new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      sequence.timers.delete(timeout);
      resolve(!sequence.cancelled);
    }, duration);
    sequence.timers.add(timeout);
  });

  const animateDocumentScroll = (sequence, target) => new Promise((resolve) => {
    const start = window.scrollY;
    const distance = target - start;
    const duration = Math.min(1600, Math.max(900, Math.abs(distance) * 0.55));
    const startedAt = performance.now();
    sequence.programmatic = true;
    const frame = (now) => {
      if (sequence.cancelled) {
        sequence.programmatic = false;
        resolve(false);
        return;
      }
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - ((1 - progress) ** 4);
      window.scrollTo({ top: start + distance * eased, behavior: 'auto' });
      if (progress < 1) {
        sequence.frame = requestAnimationFrame(frame);
      } else {
        sequence.programmatic = false;
        resolve(true);
      }
    };
    sequence.frame = requestAnimationFrame(frame);
  });

  const runNavigationSequence = async (index, href) => {
    if (navigationRef.current) {
      navigationRef.current.cancelled = true;
      navigationRef.current.timers.forEach((timer) => window.clearTimeout(timer));
      if (navigationRef.current.frame) cancelAnimationFrame(navigationRef.current.frame);
    }
    const sequence = { cancelled: false, programmatic: false, timers: new Set(), frame: 0 };
    navigationRef.current = sequence;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const [path, hash] = href.split('#');

    if (!reducedMotion) {
      const completed = await waitForSequence(sequence, 520);
      if (!completed) return;
    }

    if (sequence.cancelled) return;
    if (hash) {
      navigate({ pathname: path || '/', hash: `#${hash}` });
      await waitForSequence(sequence, reducedMotion ? 0 : 40);
      if (sequence.cancelled) return;
      const targetElement = document.getElementById(hash);
      if (targetElement) {
        const headerOffset = 76;
        const target = Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - headerOffset);
        if (reducedMotion) {
          window.scrollTo({ top: target, behavior: 'auto' });
          setOpen(false);
          if (navigationRef.current === sequence) navigationRef.current = null;
          return;
        }
        const scrollPromise = animateDocumentScroll(sequence, target);
        await waitForSequence(sequence, reducedMotion ? 0 : 300);
        if (sequence.cancelled) return;
        setOpen(false);
        await scrollPromise;
      } else {
        setOpen(false);
      }
    } else {
      navigate(href);
      await waitForSequence(sequence, reducedMotion ? 0 : 40);
      if (sequence.cancelled) return;
      if (href === '/') {
        if (reducedMotion) {
          window.scrollTo(0, 0);
        } else {
          const scrollPromise = animateDocumentScroll(sequence, 0);
          await waitForSequence(sequence, 300);
          if (sequence.cancelled) return;
          setOpen(false);
          await scrollPromise;
        }
      } else {
        if (!reducedMotion) await waitForSequence(sequence, 300);
        if (!sequence.cancelled) setOpen(false);
      }
    }
    if (navigationRef.current === sequence) navigationRef.current = null;
  };

  const handleLinkClick = (event, index, href) => {
    event.preventDefault();
    setClickedIndex(index);
    setPointerIndex(index);
    pointerIndexRef.current = index;
    setClickPulse((value) => value + 1);
    setPointerInside(false);
    setIndicatorTarget(targetForIndex(index));
    runNavigationSequence(index, href);
  };

  return createPortal(
    <div className={`site-menu ${open ? 'is-open' : ''}`}>
      <button type="button" className="site-menu-trigger" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => {
        if (navigationRef.current) {
          navigationRef.current.cancelled = true;
          navigationRef.current.timers.forEach((timer) => window.clearTimeout(timer));
          if (navigationRef.current.frame) cancelAnimationFrame(navigationRef.current.frame);
          navigationRef.current = null;
        }
        setOpen((value) => !value);
      }}>
        <FiMenu className="site-menu-open-icon" />
        <FiX className="site-menu-close-icon" />
      </button>
      {open && <button type="button" className="site-menu-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <div className="site-menu-panel" aria-hidden={!open}>
        <div className="site-menu-panel-contours" aria-hidden="true" />
        <div className="site-menu-panel-head">
          <div>
            <span className="site-menu-panel-kicker">NAVEGAÇÃO URBANA / 01</span>
            <div className="site-menu-panel-title">Voz Urbana</div>
          </div>
          <span className="site-menu-panel-live"><i /> AO VIVO</span>
        </div>
        <nav
          ref={navRef}
          aria-label="Menu principal"
          className="site-menu-links"
          onMouseMove={handleNavPointerMove}
          onMouseLeave={() => {
            setPointerInside(false);
            setPointerIndex(null);
            pointerIndexRef.current = null;
            setIndicatorTarget(selectedIndex == null ? null : targetForIndex(selectedIndex));
          }}
          onTouchStart={() => setPointerInside(false)}
        >
          {indicatorIndex != null || pointerInside ? (
            <span
              ref={indicatorRef}
              key={clickPulse}
              className={`site-menu-arrow-rail ${clickPulse ? 'is-clicked' : ''}`}
              aria-hidden="true"
            >
              <svg className="site-menu-arrow-svg" viewBox="0 0 34 24" focusable="false">
                <path d="M31 9.5H11.5L17 3.8 14.4 1 3 12l11.4 11 2.6-2.8-5.5-5.7H31a2.5 2.5 0 1 0 0-5Z" />
              </svg>
            </span>
          ) : null}
          {items.map(({ label, href, icon: Icon }, index) => (
            <Link
              key={label}
              to={href}
              onClick={(event) => handleLinkClick(event, index, href)}
              onFocus={() => {
                setPointerInside(true);
                pointerIndexRef.current = index;
                setPointerIndex(index);
                setIndicatorTarget(targetForIndex(index));
              }}
              ref={(element) => { linkRefs.current[index] = element; }}
              className={`site-menu-link ${selectedIndex === index ? 'is-current' : ''} ${pointerIndex === index ? 'is-pointer-active' : ''} ${clickedIndex === index ? 'is-clicked' : ''}`}
              style={{ '--menu-index': index }}
            >
              <span className="site-menu-link-index">0{index + 1}</span>
              <Icon />
              <span
                ref={(element) => { labelRefs.current[index] = element; }}
                className="site-menu-link-label"
              >
                {label}
              </span>
              <span className="site-menu-link-arrow" aria-hidden="true" />
            </Link>
          ))}
          <Link
            to="/report"
            onClick={(event) => handleLinkClick(event, items.length, '/report')}
            onFocus={() => {
              setPointerInside(true);
              pointerIndexRef.current = items.length;
              setPointerIndex(items.length);
              setIndicatorTarget(targetForIndex(items.length));
            }}
            ref={(element) => { linkRefs.current[items.length] = element; }}
            className={`site-menu-link site-menu-create ${selectedIndex === items.length ? 'is-current' : ''} ${pointerIndex === items.length ? 'is-pointer-active' : ''} ${clickedIndex === items.length ? 'is-clicked' : ''}`}
            style={{ '--menu-index': items.length }}
          >
            <span className="site-menu-link-index">07</span>
            <FiFileText />
            <span
              ref={(element) => { labelRefs.current[items.length] = element; }}
              className="site-menu-link-label"
            >
              {t('reportProblem')}
            </span>
            <span className="site-menu-link-arrow" aria-hidden="true" />
          </Link>
        </nav>
        <div className="site-menu-panel-foot">
          <span>ROXO É A NOSSA FREQUÊNCIA</span>
          <span>SCROLL / EXPLORE</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SiteMenu;
