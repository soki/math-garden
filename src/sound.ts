// Generate short, gentle cues locally; no audio downloads or autoplay on page load.
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

export function stopSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
export function speak(text: string): void {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  try {
    stopSpeech();
    const message = new SpeechSynthesisUtterance(text);
    message.lang = 'zh-CN';
    message.rate = .8;
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'));
    const voice = voices.find(v => v.localService) || voices[0];
    if (voice) message.voice = voice;
    window.speechSynthesis.speak(message);
  } catch { /* The picture tools remain usable without system speech. */ }
}
