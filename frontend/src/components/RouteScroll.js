import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { subscribeAnimation, useMotionBudget } from '../utils/motion';

// Lives above route outlets so a lazy page/header swap cannot cancel an anchor scroll.
export default function RouteScroll() {
  const { pathname, hash } = useLocation(),navigationType=useNavigationType();
  const { reduced }=useMotionBudget();
  useEffect(()=>{
    if(pathname!=='/'||!hash){if(navigationType!=='POP')window.scrollTo({top:0,behavior:'instant'});return undefined;}
    let start,waiting,from,to,duration,stop;
    let targetId; try { targetId = decodeURIComponent(hash.slice(1)); } catch { return undefined; }
    const cancel=()=>stop?.();
    stop=subscribeAnimation(time=>{
      waiting??=time;
      const target=document.getElementById(targetId);
      if(!target)return time-waiting<5000;
      if(start===undefined){from=window.scrollY;to=Math.max(0,target.getBoundingClientRect().top+from-76);duration=reduced?0:Math.min(650,Math.max(250,Math.abs(to-from)*.35));start=time;}
      const progress=duration?Math.min(1,(time-start)/duration):1;
      window.scrollTo({top:from+(to-from)*(1-(1-progress)**4),behavior:'instant'});
      return progress<1;
    });
    window.addEventListener('wheel',cancel,{passive:true});window.addEventListener('touchstart',cancel,{passive:true});
    return()=>{cancel();window.removeEventListener('wheel',cancel);window.removeEventListener('touchstart',cancel);};
  },[pathname,hash,navigationType,reduced]);
  return null;
}
