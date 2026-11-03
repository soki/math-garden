import { voiceClipsFor } from './voice.ts';

// Gentle tonal cues plus pre-generated Gemini narration; never autoplay on page load.
let context: AudioContext | null = null;
export function playFeedback(correct: boolean): void {
  try {
    const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    const active = context;
    const play = () => {
      if (active.state !== 'running') return;
      const notes = correct ? [523.25, 659.25, 783.99] : [220, 185];
      const start = active.currentTime;
      notes.forEach((frequency, index) => {
        const at = start + index * .12;
        const oscillator = active.createOscillator();
        const volume = active.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        volume.gain.setValueAtTime(0, at);
        volume.gain.linearRampToValueAtTime(.075, at + .015);
        volume.gain.exponentialRampToValueAtTime(.001, at + .16);
        oscillator.connect(volume); volume.connect(active.destination);
        oscillator.start(at); oscillator.stop(at + .18);
        oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
      });
    };
    if (active.state === 'suspended') void active.resume().then(play).catch(() => {});
    else play();
  } catch { /* Sound availability must never interrupt a child's practice. */ }
}

// Decode clips lazily, then schedule them together to avoid gaps and mobile autoplay races.
const buffers = new Map<string, Promise<AudioBuffer>>();
const narration = new Set<AudioBufferSourceNode>();
let speechRequest = 0;
export function stopSpeech(): void {
  speechRequest++;
  for (const source of narration) {
    try { source.stop(); } catch { /* Already ended. */ }
    source.disconnect();
  }
  narration.clear();
}
export function speak(text: string): void {
  stopSpeech();
  const request = speechRequest;
  const clips = voiceClipsFor(text);
  if (!clips.length) return;
  try {
    const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    const active = context;
    // Resume synchronously from the click/key gesture, before loading any files.
    const resume = active.state === 'suspended' ? active.resume() : Promise.resolve();
    const decoded = clips.map(clip => {
      let buffer = buffers.get(clip);
      if (!buffer) {
        buffer = fetch(`${import.meta.env?.BASE_URL || './'}audio/gemini/${clip}.wav`)
          .then(response => { if (!response.ok) throw new Error('Voice clip unavailable'); return response.arrayBuffer(); })
          .then(data => active.decodeAudioData(data))
          .catch(error => { buffers.delete(clip); throw error; });
        buffers.set(clip, buffer);
      }
      return buffer;
    });
    void Promise.all([resume, Promise.all(decoded)]).then(([, loaded]) => {
      if (request !== speechRequest || active.state !== 'running') return;
      let at = active.currentTime + .02;
      for (const buffer of loaded) {
        const source = active.createBufferSource();
        source.buffer = buffer;
        source.connect(active.destination);
        narration.add(source);
        source.onended = () => { narration.delete(source); source.disconnect(); };
        source.start(at);
        at += buffer.duration + .035;
      }
    }).catch(() => { /* Picture feedback always works, including if audio is unavailable. */ });
  } catch { /* Older browsers can continue using the picture tools silently. */ }
}
