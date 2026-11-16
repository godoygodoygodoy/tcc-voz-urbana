export const canCreateBoomerang = () => typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
// Small browser-native capture: 24 frames at 360x640 (~22 MB of RGBA), reused in
// reverse. No ffmpeg/WASM download and no microphone/audio capture.
export async function createBoomerang(video, signal) {
  if (!canCreateBoomerang() || !video?.videoWidth) throw Error('composerRecordingUnavailable');
  const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mime) throw Error('composerRecordingUnavailable');
  const frames = [],
    canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  let stream, recorder;
  const wait = milliseconds => new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(Error('storyProcessingCancelled'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', cancel, {
      once: true
    });
    if (signal?.aborted) cancel();
  });
  try {
    for (let i = 0; i < 24; i++) {
      if (signal?.aborted || document.hidden) throw Error('storyProcessingCancelled');
      const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight),
        width = video.videoWidth * scale,
        height = video.videoHeight * scale;
      context.fillStyle = '#17111e';
      context.fillRect(0, 0, 360, 640);
      context.drawImage(video, (360 - width) / 2, (640 - height) / 2, width, height);
      frames.push(context.getImageData(0, 0, 360, 640));
      await wait(80);
    }
    stream = canvas.captureStream(12);
    const chunks = [];
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 1000000
    });
    const finished = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(Error('mediaProcessingFailed'));
    });
    recorder.start();
    const sequence = [...frames, ...frames.slice(1, -1).reverse()];
    for (let loop = 0; loop < 2; loop++) for (const frame of sequence) {
      if (signal?.aborted || document.hidden) throw Error('storyProcessingCancelled');
      context.putImageData(frame, 0, 0);
      await wait(80);
    }
    recorder.stop();
    await finished;
    const type = mime.split(';')[0];
    return new File(chunks, 'boomerang.' + (type === 'video/mp4' ? 'mp4' : 'webm'), {
      type
    });
  } finally {
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach(track => track.stop());
    frames.length = 0;
    canvas.width = 1;
    canvas.height = 1;
  }
}
