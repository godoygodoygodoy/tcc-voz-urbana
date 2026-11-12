import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, Object3D } from 'three';
import { useChristmasTheme } from '../utils/christmasTheme';
import { subscribeAnimation, useMotionBudget } from '../utils/motion';

const towers = [
  { position: [-4.2,-1.1,-2.4],size:[.8,3.8,.8],color:'#2e1065' },
  { position: [-3,-1.4,-1.4],size:[.9,4.5,.9],color:'#4c1d95' },
  { position: [-1.6,-.9,-2.8],size:[.85,3.2,.85],color:'#6d28d9' },
  { position: [-.2,-1.6,-1.1],size:[1.05,5.2,1.05],color:'#7c3aed' },
  { position: [1.1,-1,-2.2],size:[.9,3.9,.9],color:'#8b5cf6' },
  { position: [2.6,-1.3,-1.2],size:[.85,4.4,.85],color:'#a855f7' },
  { position: [3.9,-.8,-2.5],size:[.95,3,.95],color:'#c084fc' },
];
const christmasPalette=['#164b35','#246347','#942b36','#ba3540','#d1a954','#e0bd72','#f1d69c'];
function Buildings({ christmas }) {
  const mesh=useRef(null),group=useRef(null);
  useLayoutEffect(()=>{
    const transform=new Object3D(),color=new Color();
    towers.forEach((tower,index)=>{transform.position.set(...tower.position);transform.scale.set(...tower.size);transform.updateMatrix();mesh.current.setMatrixAt(index,transform.matrix);mesh.current.setColorAt(index,color.set(christmas?christmasPalette[index]:tower.color));});
    mesh.current.instanceMatrix.needsUpdate=true;mesh.current.instanceColor.needsUpdate=true;
  },[christmas]);
  useFrame(({clock})=>{const time=clock.elapsedTime*1.2;group.current.position.y=Math.sin(time/4)*.056;group.current.rotation.set(Math.cos(time/4)*.0125,Math.sin(time/4)*.0125,Math.sin(time/4)*.00625);});
  return <group ref={group}><instancedMesh ref={mesh} args={[null,null,towers.length]}><boxGeometry args={[1,1,1]} /><meshStandardMaterial roughness={.35} metalness={.25} emissive={christmas?'#174c33':'#2e1065'} emissiveIntensity={.14} /></instancedMesh></group>;
}
function StarField({ count }) {
  const points=useRef(null),material=useRef(null);
  const positions=useMemo(()=>{const values=new Float32Array(count*3);let seed=43;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};for(let i=0;i<count;i++){const radius=55+24*random(),theta=random()*Math.PI*2,phi=Math.acos(2*random()-1);values.set([radius*Math.sin(phi)*Math.cos(theta),radius*Math.sin(phi)*Math.sin(theta),radius*Math.cos(phi)],i*3);}return values;},[count]);
  const uniforms=useMemo(()=>({time:{value:0}}),[]);
  useFrame(({clock})=>{points.current.rotation.z=clock.elapsedTime*.0014;material.current.uniforms.time.value=clock.elapsedTime;});
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><shaderMaterial ref={material} transparent depthWrite={false} uniforms={uniforms} vertexShader={'uniform float time; varying float alpha; void main(){vec4 p=modelViewMatrix*vec4(position,1.);alpha=.65+.2*sin(time*.35+position.x);gl_PointSize=2.5;gl_Position=projectionMatrix*p;}'} fragmentShader={'varying float alpha; void main(){float glow=max(0.,1.-length(gl_PointCoord-vec2(.5))*2.);gl_FragColor=vec4(vec3(1.),pow(glow,1.5)*alpha);}'} /></points>;
}
function SceneClock({ active, reduced, lowPower }) {
  const advance=useThree(state=>state.advance),size=useThree(state=>state.size),elapsed=useRef(0);
  useEffect(()=>{
    if(!active)return undefined;
    if(reduced){advance(elapsed.current);return undefined;}
    return subscribeAnimation((_,delta)=>{elapsed.current+=delta;advance(elapsed.current);},lowPower?30:60);
  },[active,reduced,lowPower,advance,size.width,size.height]);
  return null;
}
export function CityFallback(){return <div className="city-scene-fallback" aria-hidden="true">{towers.map((tower,index)=><i key={index} style={{height:`${tower.size[1]*13}%`,background:tower.color}} />)}</div>;}
class SceneBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  render(){return this.state.failed?<CityFallback />:this.props.children;}
}
const ThreeCityBackdrop=()=>{
  const {theme,effects}=useChristmasTheme();const {hidden,reduced,lowPower}=useMotionBudget();const ref=useRef(null),[visible,setVisible]=useState(true);const christmas=theme==='christmas';
  useEffect(()=>{if(!('IntersectionObserver'in window))return undefined;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));observer.observe(ref.current);return()=>observer.disconnect();},[]);
  const active=visible&&!hidden;
  return <div ref={ref} className="city-scene-root"><SceneBoundary><Canvas resize={{ scroll: false, debounce: 100, offsetSize: true }} frameloop="never" dpr={lowPower?1:[1,1.5]} camera={{position:[0,2.5,10],fov:36}} gl={{alpha:true,antialias:!lowPower,powerPreference:'low-power'}} fallback={<CityFallback />}>
    <color attach="background" args={[christmas?'#101b16':'#100817']} /><fog attach="fog" args={[christmas?'#101b16':'#100817',9,24]} />
    <ambientLight intensity={.55} /><directionalLight position={[6,10,6]} intensity={1.4} color="#ffffff" /><pointLight position={[-4,2,4]} intensity={1.8} color={christmas?'#c33c44':'#a855f7'} /><pointLight position={[5,1,-4]} intensity={1.3} color={christmas?'#f5cf75':'#c084fc'} />
    <Buildings christmas={christmas} />
    <mesh position={[0,-2.2,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[40,40]} /><meshStandardMaterial color={christmas?'#111d17':'#120b20'} roughness={1} /></mesh>
    <mesh position={[0,-1.7,-4]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[28,28]} /><meshBasicMaterial color={christmas?'#d1a954':'#7c3aed'} transparent opacity={.07} /></mesh>
    <StarField count={lowPower?300:800} /><SceneClock active={active} reduced={reduced||christmas&&!effects} lowPower={lowPower} />
  </Canvas></SceneBoundary></div>;
};
export default React.memo(ThreeCityBackdrop);
