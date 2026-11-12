import { useI18n } from '../i18n';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCompass, FiFileText, FiHome, FiInfo, FiMail, FiMenu, FiMap, FiShield, FiX } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { subscribeAnimation, useMotionBudget } from '../utils/motion';

const SiteMenu = () => {
  const { t } = useI18n(),location=useLocation(),navigate=useNavigate();
  const user=useAuthStore(state=>state.user);
  const {reduced,hidden}=useMotionBudget();
  const [open,setOpen]=useState(false),[clickedIndex,setClickedIndex]=useState(null),[clickPulse,setClickPulse]=useState(0),[pointerInside,setPointerInside]=useState(false),[pointerIndex,setPointerIndex]=useState(null);
  const pointerIndexRef=useRef(null),navRef=useRef(null),linkRefs=useRef([]),labelRefs=useRef([]),indicatorRef=useRef(null),navigationRef=useRef(null),bounds=useRef([]),physicsStop=useRef(null);
  const physicsRef=useRef({currentX:0,currentY:0,targetX:0,targetY:0,velocityX:0,velocityY:0,frame:0});
  const items=[
    {label:t('navHome'),href:'/',icon:FiHome},{label:t('navHow'),href:'/#como',icon:FiCompass},
    {label:t('navMap'),href:'/map',icon:FiMap},{label:t('navFeed'),href:'/feed',icon:FiFileText},
    {label:t('navAbout'),href:'/#sobre',icon:FiInfo},{label:t('navContact'),href:'/#contato',icon:FiMail},
    {label:t('reportProblem'),href:'/feed#create',icon:FiFileText,variant:'create'},
    ...(user?.role?.toLowerCase()==='admin'?[{label:t('adminNav'),href:'/admin',icon:FiShield,variant:'admin'}]:[]),
  ];
  const currentIndex=items.findIndex(({href})=>{const[path,hash]=href.split('#');return location.pathname===path&&(hash?location.hash==='#'+hash:!location.hash);});
  const routeIndex=location.pathname==='/report'?6:currentIndex;
  const selectedIndex=clickedIndex??(routeIndex>=0?routeIndex:null),indicatorIndex=pointerInside?null:selectedIndex;
  const writePhysics=()=>{const p=physicsRef.current;if(indicatorRef.current){indicatorRef.current.style.transform=`translate3d(${p.currentX}px,${p.currentY}px,0) translateY(-50%)`;indicatorRef.current.style.setProperty('--arrow-stretch',Math.min(1.08,1+Math.abs(p.velocityY)*.012).toFixed(3));}};
  const startPhysics=useCallback(()=>{
    if(physicsStop.current||!open||hidden||reduced)return;
    physicsStop.current=subscribeAnimation(()=>{
      const p=physicsRef.current,dx=p.targetX-p.currentX,dy=p.targetY-p.currentY;
      p.velocityX=p.velocityX*.72+dx*.18;p.velocityY=p.velocityY*.72+dy*.18;p.currentX+=p.velocityX;p.currentY+=p.velocityY;
      const settled=Math.abs(dx)+Math.abs(dy)+Math.abs(p.velocityX)+Math.abs(p.velocityY)<.12;
      if(settled){p.currentX=p.targetX;p.currentY=p.targetY;p.velocityX=0;p.velocityY=0;physicsStop.current=null;}
      writePhysics();return!settled;
    });
  },[open,hidden,reduced]);
  const targetForIndex=index=>bounds.current[index]?.target||null;
  const setIndicatorTarget=value=>{
    if(!value)return;const p=physicsRef.current;
    if(p.targetX===value.x&&p.targetY===value.y)return;
    p.targetX=value.x;p.targetY=value.y;
    if(reduced){p.currentX=value.x;p.currentY=value.y;writePhysics();}else startPhysics();
  };
  const measure=useCallback(()=>{
    if(!navRef.current)return;const nav=navRef.current.getBoundingClientRect();
    bounds.current=labelRefs.current.map(label=>{if(!label)return null;const rect=label.getBoundingClientRect();return{center:rect.top+rect.height/2,target:{x:rect.right-nav.left-.85,y:rect.top+rect.height/2-nav.top}};});
  },[]);
  useLayoutEffect(()=>{
    if(!open)return;measure();const target=targetForIndex(selectedIndex);if(target){Object.assign(physicsRef.current,{currentX:target.x,currentY:target.y,targetX:target.x,targetY:target.y});writePhysics();}
  },[open,t,selectedIndex,measure]);
  useEffect(()=>{
    if(!open)return undefined;
    let frame=0;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    window.addEventListener('resize',update);document.fonts?.addEventListener?.('loadingdone',update);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',update);document.fonts?.removeEventListener?.('loadingdone',update);};
  },[open,measure]);
  useEffect(()=>()=>{physicsStop.current?.();physicsStop.current=null;},[open,hidden,reduced]);
  const handleNavPointerMove=event=>{
    let nearest=null,distance=Infinity;
    bounds.current.forEach((item,index)=>{if(item&&Math.abs(event.clientY-item.center)<distance){nearest=index;distance=Math.abs(event.clientY-item.center);}});
    if(nearest==null)return;
    const current=pointerIndexRef.current;
    if(current!=null&&bounds.current[current]&&Math.abs(event.clientY-bounds.current[current].center)<=distance+8)nearest=current;
    if(!pointerInside)setPointerInside(true);
    if(current===nearest)return;
    pointerIndexRef.current=nearest;setPointerIndex(nearest);setIndicatorTarget(targetForIndex(nearest));
  };
  const cancelNavigation=()=>{const sequence=navigationRef.current;if(!sequence)return;sequence.cancelled=true;sequence.stop?.();sequence.timers.forEach(clearTimeout);navigationRef.current=null;};
  useEffect(()=>{
    const escape=event=>{if(event.key==='Escape'){cancelNavigation();setOpen(false);}};
    const manual=()=>cancelNavigation();
    document.addEventListener('keydown',escape);window.addEventListener('wheel',manual,{passive:true});window.addEventListener('touchstart',manual,{passive:true});
    return()=>{cancelNavigation();physicsStop.current?.();document.removeEventListener('keydown',escape);window.removeEventListener('wheel',manual);window.removeEventListener('touchstart',manual);};
  },[]);
  useEffect(()=>{setClickedIndex(null);setPointerInside(false);setPointerIndex(null);pointerIndexRef.current=null;},[location.pathname,location.hash]);
  const runNavigationSequence=(index,href)=>{cancelNavigation();setOpen(false);navigate(href);};
  const handleLinkClick=(event,index,href)=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();setClickedIndex(index);setPointerIndex(index);pointerIndexRef.current=index;setClickPulse(value=>value+1);setPointerInside(false);setIndicatorTarget(targetForIndex(index));runNavigationSequence(index,href);
  };

  return createPortal(
    <div className={`site-menu ${open ? 'is-open' : ''}`}>
      <button type="button" className="site-menu-trigger" aria-label={open ? t("Fechar menu") : t("Abrir menu")} aria-expanded={open} onClick={() => {
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
      {open && <button type="button" className="site-menu-backdrop" aria-label={t("Fechar menu")} onClick={() => setOpen(false)} />}
      <div className="site-menu-panel" aria-hidden={!open}>
        <div className="site-menu-panel-contours" aria-hidden="true" />
        <div className="site-menu-panel-head">
          <div>
            <span className="site-menu-panel-kicker">{t("NAVEGAÇÃO URBANA / 01")}</span>
            <div className="site-menu-panel-title">Voz Urbana</div>
          </div>
          <span className="site-menu-panel-live"><i /> {t("AO VIVO")}</span>
        </div>
        <nav
          ref={navRef}
          aria-label={t("Menu principal")}
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
          {items.map(({ label, href, icon: Icon, variant }, index) => (
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
              className={`site-menu-link ${variant ? `site-menu-${variant}` : ''} ${selectedIndex === index ? 'is-current' : ''} ${pointerIndex === index ? 'is-pointer-active' : ''} ${clickedIndex === index ? 'is-clicked' : ''}`}
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
        </nav>
        <div className="site-menu-panel-foot">
          <span>{t("ROXO É A NOSSA FREQUÊNCIA")}</span>
          <span>{t("SCROLL / EXPLORE")}</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SiteMenu;
