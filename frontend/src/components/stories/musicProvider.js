import { mediaLibraryAPI } from '../../services/api';
let loading;
function loadMusicKit() {
  if (window.MusicKit) return Promise.resolve(window.MusicKit);
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
    script.async = true;
    const ready = () => {
      cleanup();
      resolve(window.MusicKit);
    };
    const fail = () => {
      cleanup();
      script.remove();
      loading = null;
      reject(Error('mediaProviderUnavailable'));
    };
    const timer = setTimeout(fail, 15000);
    const cleanup = () => {
      clearTimeout(timer);
      document.removeEventListener('musickitloaded', ready);
      script.onerror = null;
    };
    document.addEventListener('musickitloaded', ready, {
      once: true
    });
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}
let configuredPlayer;
async function player() {
  if (configuredPlayer) return configuredPlayer;
  const [{
    data
  }, MusicKit] = await Promise.all([mediaLibraryAPI.musicToken(), loadMusicKit()]);
  await MusicKit.configure({
    developerToken: data.developerToken,
    app: {
      name: 'Voz Urbana',
      build: '1.0'
    }
  });
  configuredPlayer = MusicKit.getInstance();
  return configuredPlayer;
}
export const musicProviders = {
  apple: {
    search: (query, options) => mediaLibraryAPI.music(query, options),
    async authorize() {
      return (await player()).authorize();
    },
    async preview(id) {
      const instance = await player();
      await instance.setQueue({
        song: id
      });
      await instance.play();
      return () => instance.stop();
    },
    stop: () => { try { return configuredPlayer?.stop(); } catch { /* SDK can be loading or shutting down. */ } }
  }
};
