import { drawStoryBase } from './stories/StoryCanvas';
import { createBoomerang, canCreateBoomerang } from './stories/MediaProcessor';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Undo2, Type, Pen, ImagePlus, Trash2, Square, Video, Settings, Flashlight } from 'lucide-react';
import SiteDialog from './SiteDialog';
import { FloatingSelect } from './FloatingFields';
import StoryElements from './stories/StoryElements';
import MediaLibrary from './stories/MediaLibrary';
import useStoryHistory from './stories/useStoryHistory';
import { newElement, toComposition, storyFonts, storyEffects, mediaEffect } from './stories/storyDocument';
import { useI18n } from '../i18n';
import { toast } from './LocalizedToast';
const W = 1080,
  H = 1920,
  fonts = storyFonts, effects = storyEffects;
export default function StoryComposer({
  onClose,
  onPublish,
  busy
}) {
  const {
    t
  } = useI18n();
  const canvas = useRef(null),
    camera = useRef(null),
    clip = useRef(null),
    stream = useRef(null),
    recorder = useRef(null),
    recordTimer = useRef(null),
    gesture = useRef(null),
    urls = useRef([]),
    mounted = useRef(true),
    stage = useRef(null),
    publicationKey = useRef(crypto.randomUUID()),
    processor = useRef(null),
    captureTimer = useRef(null),
    drawing = useRef(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [media, setMedia] = useState([]),
    [layers, setLayers] = useState([]),
    [strokes, setStrokes] = useState([]),
    [selected, setSelected] = useState(null),
    [tool, setTool] = useState('move'),
    [color, setColor] = useState('#ffffff'),
    [size, setSize] = useState(64),
    [font, setFont] = useState('Modern'),
    [text, setText] = useState(''),
    [background, setBackground] = useState('#17111e'),
    [effect, setEffect] = useState('normal'),
    [layout, setLayout] = useState('single'),
    [zoom, setZoom] = useState(1),
    [audience, setAudience] = useState('SEGUIDORES'),
    [cameraOpen, setCameraOpen] = useState(false),
    [facing, setFacing] = useState('user'),
    [recording, setRecording] = useState(false),
    [exporting, setExporting] = useState(false),
    [cameraError, setCameraError] = useState(false);
  const [captureDelay, setCaptureDelay] = useState(0),
    [countdown, setCountdown] = useState(0),
    [processing, setProcessing] = useState(false),
    [library, setLibrary] = useState(false),
    [intensity, setIntensity] = useState(1),
    [drawKind, setDrawKind] = useState('pen'),
    [drawOpacity, setDrawOpacity] = useState(1);
  const {
    history,
    remember,
    undo,
    redo,
    canRedo,
    clear: clearHistory
  } = useStoryHistory(layers, strokes, setLayers, setStrokes);
  const isVideo = media[0]?.kind === 'video',
    animated = Boolean(media[0]?.animated),
    restrictedMedia = isVideo || animated,
    locked = busy || exporting || processing || loadingMedia || countdown > 0;
  const cameraGeneration = useRef(0),
    selectionGeneration = useRef(0),
    decoded = useRef([]);
  const [cameraSettings, setCameraSettings] = useState(false),
    [audio, setAudio] = useState(false),
    [torch, setTorch] = useState(false),
    [torchSupported, setTorchSupported] = useState(false);
  const stopCamera = () => {
    ++cameraGeneration.current;
    clearTimeout(captureTimer.current);
    setCountdown(0);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setCameraOpen(false);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      processor.current?.abort();
      clearTimeout(captureTimer.current);
      clearTimeout(recordTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      urls.current.forEach(url => URL.revokeObjectURL(url));
      decoded.current.forEach(image => image.close?.());
    };
  }, []);
  const loadFiles = async files => {
    const generation = ++selectionGeneration.current,
      created = [],
      next = [];
    const chosen = [...files].slice(0, 4);
    if (!chosen.length) return;
    if (chosen.some(file => !/^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm)$/.test(file.type) || file.size > (file.type.startsWith('video/') ? 20 : 5) * 1024 * 1024)) {
      toast.error(t('mediaInvalid'));
      return;
    }
    if (chosen.some(file => file.type.startsWith('video/')) && chosen.length > 1) {
      toast.error(t('composerOneVideo'));
      return;
    }
    setLoadingMedia(true);
    try {
      for (const file of chosen) {
        const item = await (async () => {
          const url = URL.createObjectURL(file);
          created.push(url);
          if (file.type.startsWith('video/')) return {
            url,
            file,
            kind: 'video'
          };
          const image = new Image();
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
            image.src = url;
          });
          const ratio = Math.min(1, 1080 / image.naturalWidth, 1920 / image.naturalHeight);
          const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(image, {
            resizeWidth: Math.max(1, Math.round(image.naturalWidth * ratio)),
            resizeHeight: Math.max(1, Math.round(image.naturalHeight * ratio)),
            resizeQuality: 'high'
          }) : image;
          const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer());
          const animated = file.type === 'image/gif' || file.type === 'image/webp' && bytes[12] === 86 && bytes[13] === 80 && bytes[14] === 56 && bytes[15] === 88 && Boolean(bytes[20] & 2);
          return {
            url,
            file,
            image: bitmap,
            kind: 'image',
            animated
          };
        })();
        next.push(item);
      }
      if(next.length>1&&next.some(item=>item.animated))throw Error('mediaInvalid');
      if (!mounted.current || generation !== selectionGeneration.current) {
        created.forEach(url => URL.revokeObjectURL(url));
        next.forEach(item => item.image?.close?.());
        return;
      }
      urls.current.forEach(url => URL.revokeObjectURL(url));
      urls.current = created;
      decoded.current.forEach(image => image.close?.());
      decoded.current = next.map(item => item.image).filter(Boolean);
      stopCamera();
      setMedia(next);
      setLayout(next.length > 1 ? 'grid' : 'single');
      setLayers([]);
      setStrokes([]);
      clearHistory();
      setSelected(null);
      setTool('move');
      setZoom(1);
    } catch {
      next.forEach(item => item.image?.close?.());
      created.forEach(url => URL.revokeObjectURL(url));
      if (mounted.current) toast.error(t('mediaInvalid'));
    } finally {if(mounted.current&&generation===selectionGeneration.current)setLoadingMedia(false);}
  };
  const draw = () => drawStoryBase({
    canvas: canvas.current,
    drawing,
    media,
    video: isVideo ? clip.current : null,
    layout,
    zoom,
    background,
    strokes
  });
  useEffect(() => {
    draw();
  }, [media, strokes, background, layout, zoom]);
  useEffect(() => {
    const element = clip.current;
    if (!isVideo || !element) return;
    const hide = () => {
      if (document.hidden) element.pause();
    };
    document.addEventListener('visibilitychange', hide);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      if (entries.some(entry => !entry.isIntersecting)) element.pause();
    }) : null;
    observer?.observe(element);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      observer?.disconnect();
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, [isVideo, media[0]?.url, cameraOpen]);
  const openCamera = async (nextFacing = facing, withAudio = audio) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      return;
    }
    stopCamera();
    const generation = cameraGeneration.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: nextFacing
          },
          aspectRatio: {
            ideal: 9 / 16
          },
          width: {
            ideal: 720,
            max: 1920
          },
          height: {
            ideal: 1280,
            max: 1920
          }
        },
        audio: withAudio
      });
      if (!mounted.current || generation !== cameraGeneration.current) {
        next.getTracks().forEach(track => track.stop());
        return;
      }
      stream.current = next;
      if (camera.current) {
        camera.current.srcObject = next;
        camera.current.play().catch(() => {});
      }
      setTorchSupported(Boolean(next.getVideoTracks()[0]?.getCapabilities?.().torch));
      setTorch(false);
      setAudio(withAudio);
      setCameraError(false);
      setFacing(nextFacing);
      setCameraOpen(true);
    } catch {
      if (mounted.current && generation === cameraGeneration.current) setCameraError(true);
    }
  };
  useEffect(() => {
    if (cameraOpen && camera.current) {
      camera.current.srcObject = stream.current;
      camera.current.play().catch(() => setCameraError(true));
    }
  }, [cameraOpen, facing]);
  useEffect(() => {
    const hide = () => {
      if (!document.hidden) return;
      processor.current?.abort();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stopCamera();
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  const capture = () => {
    const video = camera.current;
    if (!video?.videoWidth) return;
    const target = document.createElement('canvas');
    target.width = video.videoWidth;
    target.height = video.videoHeight;
    target.getContext('2d').drawImage(video, 0, 0);
    target.toBlob(blob => blob && loadFiles([new File([blob], 'capture.webp', {
      type: blob.type
    })]), 'image/webp', .9);
  };
  const delayedCapture = () => {
    let remaining = Number(captureDelay);
    if (!remaining) {
      capture();
      return;
    }
    setCountdown(remaining);
    const tick = () => {
      remaining--;
      if (!mounted.current) return;
      setCountdown(remaining);
      if (remaining > 0) captureTimer.current = setTimeout(tick, 1000);else capture();
    };
    captureTimer.current = setTimeout(tick, 1000);
  };
  const boomerang = async () => {
    if (locked || recording) return;
    processor.current = new AbortController();
    setProcessing(true);
    try {
      const file = await createBoomerang(camera.current, processor.current.signal);
      if (mounted.current) await loadFiles([file]);
    } catch (error) {
      if (mounted.current && error.message !== 'storyProcessingCancelled') toast.error(t(error.message || 'mediaProcessingFailed'));
    } finally {
      if (mounted.current) setProcessing(false);
    }
  };
  const record = () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (!stream.current || typeof MediaRecorder === 'undefined') {
      toast.error(t('composerRecordingUnavailable'));
      return;
    }
    const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mime) {
      toast.error(t('composerRecordingUnavailable'));
      return;
    }
    try {
      const chunks = [],
        r = new MediaRecorder(stream.current, {
          mimeType: mime,
          videoBitsPerSecond: 1500000
        });
      recorder.current = r;
      r.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        clearTimeout(recordTimer.current);
        if (!mounted.current) return;
        setRecording(false);
        const type = mime.split(';')[0];
        loadFiles([new File(chunks, 'recording.' + (type === 'video/mp4' ? 'mp4' : 'webm'), {
          type
        })]);
      };
      r.start();
      setRecording(true);
      recordTimer.current = setTimeout(() => {
        if (r.state === 'recording') r.stop();
      }, 59000);
    } catch {
      toast.error(t('composerRecordingUnavailable'));
    }
  };
  const addText = () => {
    if (!text.trim()) return;
    remember();
    if (selected && layers.find(layer => layer.id === selected)?.type === 'text') {
      setLayers(current => current.map(layer => layer.id === selected ? {
        ...layer,
        text: text.slice(0, 500),
        size,
        color,
        font
      } : layer));
    } else {
      const id = crypto.randomUUID();
      setLayers(current => [...current, newElement('text', {
        id,
        text: text.slice(0, 500),
        size,
        color,
        font
      })]);
      setSelected(id);
    }
    setTool('move');
  };
  useEffect(() => {
    const layer = layers.find(layer => layer.id === selected);
    if (layer) {
      setText(layer.text);
      setSize(layer.size);
      setColor(layer.color);
      setFont(layer.font);
    }
  }, [selected]);
  const changeLayer = patch => {
    if (!selected) return;
    remember();
    setLayers(current => current.map(layer => layer.id === selected ? {
      ...layer,
      ...patch
    } : layer));
  };
  const point = e => {
    const box = stage.current.getBoundingClientRect();
    return [(e.clientX - box.left) * W / box.width, (e.clientY - box.top) * H / box.height];
  };
  const pointerDown = e => {
    if (locked) return;
    const [x, y] = point(e);
    if (tool === 'draw') {
      e.currentTarget.setPointerCapture(e.pointerId);
      remember();
      gesture.current = {
        kind: 'draw'
      };
      setStrokes(current => [...current.slice(-99), {
        color,
        kind: drawKind,
        opacity: drawOpacity,
        size: Math.max(3, size / (drawKind === 'marker' ? 2 : 5)),
        points: [[x, y]]
      }]);
    } else {
      const layer = [...layers].reverse().find(layer => Math.abs(x - layer.x) < layer.width * W / 2 && Math.abs(y - layer.y) < Math.max(layer.size * 2, 80));
      if (layer) { e.currentTarget.setPointerCapture(e.pointerId); remember(); }
      setSelected(layer?.id || null);
      gesture.current = layer ? {
        kind: 'move',
        id: layer.id,
        dx: x - layer.x,
        dy: y - layer.y
      } : null;
    }
  };
  const pointerMove = e => {
    if (!gesture.current || locked) return;
    const [x, y] = point(e);
    if (gesture.current.kind === 'draw') setStrokes(current => current.map((stroke, i) => i === current.length - 1 && stroke.points.length < 2000 ? {
      ...stroke,
      points: [...stroke.points, [x, y]]
    } : stroke));else {
      const g = gesture.current;
      setLayers(current => current.map(layer => layer.id === g.id ? {
        ...layer,
        x: Math.max(0, Math.min(W, x - g.dx)),
        y: Math.max(0, Math.min(H, y - g.dy))
      } : layer));
    }
  };
  const publish = async () => {
    if (locked) return;
    setExporting(true);
    try {
      if (restrictedMedia) {
        if (strokes.length || zoom !== 1) {
          toast.error(t('composerVideoEditingUnavailable'));
          return;
        }
        await onPublish(media[0].file, audience, {
          composition: toComposition(layers, effect, intensity),
          publicationKey: publicationKey.current
        });
        return;
      }
      draw();
      const blob = await new Promise(resolve => canvas.current.toBlob(resolve, 'image/webp', .9));
      if (!blob) throw Error();
      await onPublish(new File([blob], 'story.webp', {
        type: 'image/webp'
      }), audience, {
        composition: toComposition(layers, effect, intensity),
        original: media.length === 1 ? media[0].file : null,
        publicationKey: publicationKey.current
      });
    } catch {
      toast.error(t('storySaveError'));
    } finally {
      if (mounted.current) setExporting(false);
    }
  };
  return <SiteDialog title={t('storyCreate')} onClose={onClose} busy={locked}>
  <div className="story-composer">
   <div className="story-composer-tools">
    <label className="profile-action"><ImagePlus size={16} />{t('storyChooseMedia')}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple disabled={locked || recording} onChange={e => loadFiles(e.target.files)} /></label>
    <button type="button" className="profile-action" disabled={locked || recording} onClick={() => openCamera()}><Camera size={16} />{t('composerCamera')}</button>
    <button type="button" className="profile-action" disabled={locked || recording} onClick={() => {
          urls.current.forEach(url => URL.revokeObjectURL(url));
          urls.current = [];
          decoded.current.forEach(image => image.close?.());
          decoded.current = [];
          setMedia([]);
          setStrokes([]);
          setLayers([]);
          clearHistory();
          setSelected(null);
          stopCamera();
        }}>{t('composerCreate')}</button>
    <button type="button" className="profile-action" disabled={!history.current.length || locked} onClick={undo}><Undo2 size={16} />{t('composerUndo')}</button>
   </div>
   <div className="flex flex-wrap gap-2"><button type="button" className="profile-action" disabled={!canRedo || locked} onClick={redo}>{t('storyRedo')}</button><button type="button" className="profile-action" disabled={locked} onClick={() => setLibrary(value => !value)}>{t('storyMediaLibrary')}</button></div>
   {library && <MediaLibrary onClose={() => setLibrary(false)} onAdd={element => {
        if (layers.length >= 30) {
          toast.error(t('storyCompositionInvalid'));
          return;
        }
        remember();
        setLayers(current => [...current, element]);
        setSelected(element.id);
        setTool('move');
      }} />}
   {cameraOpen && <div className="flex flex-wrap gap-2"><button type="button" className="profile-action" disabled={!torchSupported || recording} aria-label={t('composerFlash')} title={t(torchSupported ? 'composerFlash' : 'composerFlashUnavailable')} onClick={async () => {
          try {
            await stream.current.getVideoTracks()[0].applyConstraints({
              advanced: [{
                torch: !torch
              }]
            });
            setTorch(value => !value);
          } catch {
            toast.error(t('composerFlashUnavailable'));
          }
        }}><Flashlight size={16} /></button><button type="button" className="profile-action" aria-expanded={cameraSettings} onClick={() => setCameraSettings(value => !value)} aria-label={t('storyCameraSettings')}><Settings size={16} /></button>{cameraSettings && <><label>{t('storyCameraTimer')}<FloatingSelect value={String(captureDelay)} onChange={value => setCaptureDelay(Number(value))} options={[0, 3, 10].map(value => ({
              value: String(value),
              label: String(value)
            }))} /></label><label><input type="checkbox" checked={audio} disabled={recording || locked} onChange={e => openCamera(facing, e.target.checked)} />{t('composerMicrophone')}</label></>}</div>}
   {cameraError && <p role="alert">{t('composerCameraUnavailable')}</p>}
   {(processing || countdown > 0) && <p role="status">{processing ? t('storyProcessing') : countdown}</p>}
   <div className={'story-composer-stage'+(tool==='draw'&&!cameraOpen?' is-drawing':'')} ref={stage} onPointerMove={pointerMove} onPointerUp={() => gesture.current = null} onPointerCancel={() => gesture.current = null}>
    {cameraOpen ? <video ref={camera} autoPlay muted playsInline className="story-camera-preview" /> : isVideo ? <video ref={clip} className="story-camera-preview" controls playsInline preload="metadata" style={mediaEffect(effect, intensity)} src={media[0].url} /> : animated ? <img style={mediaEffect(effect, intensity)} className="story-camera-preview" src={media[0].url} alt={t('storyMediaAlt')} /> : <canvas style={mediaEffect(effect, intensity)} ref={canvas} width={W} height={H} aria-label={t('composerPreview')} onPointerDown={pointerDown} onPointerUp={() => gesture.current = null} onPointerCancel={() => gesture.current = null} />}
    {!cameraOpen && <StoryElements onKeyboard={(event, layer) => {
          const delta = event.shiftKey ? 50 : 10;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            remember();
            setSelected(layer.id);
            if (event.key === 'Delete') setLayers(current => current.filter(item => item.id !== layer.id));else setLayers(current => current.map(item => item.id === layer.id ? {
              ...item,
              x: Math.max(0, Math.min(W, item.x + (event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0))),
              y: Math.max(0, Math.min(H, item.y + (event.key === 'ArrowDown' ? delta : event.key === 'ArrowUp' ? -delta : 0)))
            } : item));
          }
        }} elements={layers} selected={selected} onPointerDown={(event, id) => {
          if (locked) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          remember();
          setSelected(id);
          const [x, y] = point(event),
            layer = layers.find(item => item.id === id);
          gesture.current = {
            kind: 'move',
            id,
            dx: x - layer.x,
            dy: y - layer.y
          };
        }} />}
    {cameraOpen && <div className="story-camera-controls"><button type="button" className="profile-action" disabled={recording || locked} onClick={() => openCamera(facing === 'user' ? 'environment' : 'user')} aria-label={t('composerSwitchCamera')}><RotateCcw /></button><button type="button" className="profile-action" disabled={recording || locked} onClick={delayedCapture} aria-label={t('composerCapture')}><Camera /></button><button type="button" className="profile-action" disabled={locked} onClick={record} aria-label={t(recording ? 'composerStopRecording' : 'composerRecord')}>{recording ? <Square /> : <Video />}</button><button type="button" className="profile-action" disabled={locked || recording || !canCreateBoomerang()} onClick={boomerang}>{t('storyBoomerang')}</button></div>}
   </div>
   {!cameraOpen && <fieldset disabled={locked} className="story-composer-fields">
    <label>{t('composerText')}<textarea maxLength={500} value={text} onChange={e => setText(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2"><button type="button" className="profile-action" disabled={!text.trim()} onClick={addText}><Type size={16} />{t('composerAddText')}</button><button type="button" className="profile-action" disabled={restrictedMedia} aria-pressed={tool === 'draw'} onClick={() => setTool(tool === 'draw' ? 'move' : 'draw')}><Pen size={16} />{t('composerDraw')}</button><button type="button" className="profile-action" disabled={!selected} onClick={() => {
            remember();
            setLayers(current => current.filter(layer => layer.id !== selected));
            setSelected(null);
          }}><Trash2 size={16} />{t('composerRemove')}</button></div>
    <label>{t('composerColor')}<input type="color" value={color} onChange={e => {
            setColor(e.target.value);
            changeLayer({
              color: e.target.value
            });
          }} /></label>
    <label>{t('composerSize')}<input type="range" min="20" max="160" value={size} onChange={e => {
            setSize(Number(e.target.value));
            changeLayer({
              size: Number(e.target.value)
            });
          }} /></label>
    <label>{t('composerFont')}<FloatingSelect value={font} onChange={value => {
            setFont(value);
            changeLayer({
              font: value
            });
          }} options={Object.keys(fonts).map(value => ({
            value,
            label: value
          }))} /></label>
    <label>{t('composerRotation')}<input type="range" min="-180" max="180" value={layers.find(layer => layer.id === selected)?.rotation || 0} disabled={!selected} onChange={e => changeLayer({
            rotation: Number(e.target.value)
          })} /></label>
    <label>{t('storyElementOpacity')}<input type="range" min="0.1" max="1" step="0.05" disabled={!selected} value={layers.find(layer => layer.id === selected)?.opacity ?? 1} onChange={event => changeLayer({
            opacity: Number(event.target.value)
          })} /></label>
    <label>{t('storyElementWidth')}<input type="range" min="0.1" max="1" step="0.05" disabled={!selected} value={layers.find(layer => layer.id === selected)?.width ?? .65} onChange={event => changeLayer({
            width: Number(event.target.value)
          })} /></label>
    <label>{t('storyTextAlign')}<FloatingSelect value={layers.find(layer => layer.id === selected)?.align || 'center'} onChange={align => {
            remember();
            changeLayer({
              align
            });
          }} options={['left', 'center', 'right'].map(value => ({
            value,
            label: t('storyAlign' + value)
          }))} /></label>
    <label>{t('storyTextFill')}<input type="color" disabled={!selected} value={layers.find(layer => layer.id === selected)?.fill || '#281334'} onChange={event => {
            remember();
            changeLayer({
              fill: event.target.value
            });
          }} /></label>
    <button type="button" className="profile-action" disabled={!selected} onClick={() => {
          remember();
          changeLayer({
            fill: null
          });
        }}>{t('storyTextFillRemove')}</button>
    <div className="flex flex-wrap gap-2">{['duplicate', 'front', 'back', 'center'].map(action => <button type="button" key={action} className="profile-action" disabled={!selected} onClick={() => {
            const layer = layers.find(item => item.id === selected);
            if (!layer) return;
            remember();
            if (action === 'duplicate') {
              if (layers.length >= 30) return;
              const copy = {
                ...layer,
                id: crypto.randomUUID(),
                y: Math.min(H * .9, layer.y + 80)
              };
              setLayers(current => [...current, copy]);
              setSelected(copy.id);
            } else if (action === 'center') changeLayer({
              x: W / 2,
              y: H / 2
            });else setLayers(current => action === 'front' ? [...current.filter(item => item.id !== selected), layer] : [layer, ...current.filter(item => item.id !== selected)]);
          }}>{t('storyElement' + action)}</button>)}</div>
    <label>{t('storyDrawingTool')}<FloatingSelect value={drawKind} onChange={setDrawKind} options={['pen', 'marker', 'eraser'].map(value => ({
            value,
            label: t('storyDrawing' + value)
          }))} /></label>
    <label>{t('storyDrawingOpacity')}<input type="range" min="0.1" max="1" step="0.1" value={drawOpacity} onChange={event => setDrawOpacity(Number(event.target.value))} /></label>
    <label>{t('composerBackground')}<input type="color" value={background} onChange={e => setBackground(e.target.value)} /></label>
    <label>{t('composerZoom')}<input type="range" min="1" max="3" step="0.05" value={zoom} disabled={isVideo} onChange={e => setZoom(Number(e.target.value))} /></label>
    <label>{t('composerLayout')}<FloatingSelect value={layout} onChange={setLayout} options={['single', 'grid', 'strip'].map(value => ({
            value,
            label: t('composerLayout' + value)
          }))} /></label>
    <label>{t('composerEffects')}<FloatingSelect value={effect} onChange={setEffect} options={Object.keys(effects).map(value => ({
            value,
            label: t('composerEffect' + value)
          }))} /></label>
    <label>{t('storyEffectIntensity')}<input type="range" min="0" max="1" step="0.1" value={intensity} onChange={event => setIntensity(Number(event.target.value))} /></label>
    <label data-story-audience>{t('storyAudience')}<FloatingSelect value={audience} onChange={setAudience} options={['PUBLICO', 'SEGUIDORES', 'AMIGOS', 'SO_EU', 'PROXIMOS'].map(value => ({
            value,
            label: t('storyAudience' + value)
          }))} /></label>
    {restrictedMedia && <p role="status">{t('composerVideoEditingUnavailable')}</p>}
    <button type="button" className="profile-action profile-action--primary" onClick={publish} disabled={locked}>{t(locked ? 'saving' : 'storyPublish')}</button>
   </fieldset>}
  </div>
 </SiteDialog>;
}
