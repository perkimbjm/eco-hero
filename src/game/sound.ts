let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let musicTimer: number | null = null;
let musicPlaying = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // A context can end up closed after a page/game teardown; rebuild rather
  // than resuming it, which throws InvalidStateError.
  if (ctx && ctx.state === 'closed') {
    ctx = null;
    masterGain = null;
  }
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

interface ToneOpts {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  freqEnd?: number;
  delay?: number;
}

function playTone({ freq, duration, type = 'square', volume = 0.2, freqEnd, delay = 0 }: ToneOpts): void {
  if (muted) return;
  const c = getCtx();
  if (!c || !masterGain) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);
  }
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playNoise(duration: number, volume = 0.1, delay = 0): void {
  if (muted) return;
  const c = getCtx();
  if (!c || !masterGain) return;
  const start = c.currentTime + delay;
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(start);
  noise.stop(start + duration);
}

// ── SFX ─────────────────────────────────────────────────────

export function playJump(): void {
  playTone({ freq: 280, freqEnd: 520, duration: 0.15, type: 'square', volume: 0.12 });
}

export function playCollect(): void {
  playTone({ freq: 660, duration: 0.06, type: 'sine', volume: 0.15 });
  playTone({ freq: 880, duration: 0.08, type: 'sine', volume: 0.12, delay: 0.05 });
  playTone({ freq: 1320, duration: 0.1, type: 'sine', volume: 0.08, delay: 0.1 });
}

export function playStomp(): void {
  playTone({ freq: 180, freqEnd: 60, duration: 0.15, type: 'sawtooth', volume: 0.14 });
  playNoise(0.1, 0.06);
}

export function playHurt(): void {
  playTone({ freq: 300, freqEnd: 80, duration: 0.3, type: 'sawtooth', volume: 0.16 });
  playNoise(0.2, 0.08);
}

export function playSecret(): void {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => playTone({ freq: f, duration: 0.12, type: 'sine', volume: 0.1, delay: i * 0.06 }));
}

export function playLevelComplete(): void {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => playTone({ freq: f, duration: 0.18, type: 'square', volume: 0.1, delay: i * 0.12 }));
  playTone({ freq: 1568, duration: 0.3, type: 'square', volume: 0.1, delay: 0.6 });
}

export function playGameOver(): void {
  const notes = [392, 330, 262, 196];
  notes.forEach((f, i) => playTone({ freq: f, duration: 0.25, type: 'triangle', volume: 0.12, delay: i * 0.18 }));
}

/** Angry buzz — a giant fly is committing to a dive. */
export function playBuzz(): void {
  playTone({ freq: 90, freqEnd: 150, duration: 0.35, type: 'sawtooth', volume: 0.09 });
  playTone({ freq: 180, freqEnd: 240, duration: 0.35, type: 'square', volume: 0.05 });
}

/** Corrosive hiss for the toxic waste mounds. */
export function playToxic(): void {
  playNoise(0.35, 0.09);
  playTone({ freq: 220, freqEnd: 70, duration: 0.35, type: 'sawtooth', volume: 0.12 });
}

/** Recycling machine chewing through a piece of sorted trash. */
export function playMachine(): void {
  playTone({ freq: 140, freqEnd: 220, duration: 0.2, type: 'square', volume: 0.09 });
  playNoise(0.18, 0.05, 0.05);
  playTone({ freq: 330, duration: 0.1, type: 'triangle', volume: 0.08, delay: 0.22 });
}

/** Machine rejecting the wrong category. */
export function playReject(): void {
  playTone({ freq: 200, freqEnd: 110, duration: 0.18, type: 'square', volume: 0.12 });
  playTone({ freq: 150, freqEnd: 80, duration: 0.2, type: 'square', volume: 0.1, delay: 0.16 });
}

/** Picking up the recycled energy orb. */
export function playEnergy(): void {
  const notes = [523, 784, 1047];
  notes.forEach((f, i) => playTone({ freq: f, duration: 0.12, type: 'triangle', volume: 0.12, delay: i * 0.06 }));
}

/** Landing a charged hit on the boss. */
export function playBossHit(): void {
  playTone({ freq: 120, freqEnd: 40, duration: 0.4, type: 'sawtooth', volume: 0.18 });
  playNoise(0.3, 0.12);
  playTone({ freq: 660, freqEnd: 990, duration: 0.25, type: 'square', volume: 0.1, delay: 0.05 });
}

/** Boss roar / attack telegraph. */
export function playBossRoar(): void {
  playTone({ freq: 70, freqEnd: 45, duration: 0.6, type: 'sawtooth', volume: 0.16 });
  playNoise(0.4, 0.08, 0.1);
}

/** Boss finally collapses into a pile of recyclables. */
export function playBossDefeat(): void {
  playNoise(0.6, 0.14);
  const notes = [392, 330, 262, 196, 165];
  notes.forEach((f, i) => playTone({ freq: f, duration: 0.3, type: 'sawtooth', volume: 0.13, delay: i * 0.14 }));
  const fanfare = [523, 659, 784, 1047, 1319];
  fanfare.forEach((f, i) => playTone({ freq: f, duration: 0.2, type: 'square', volume: 0.11, delay: 0.8 + i * 0.12 }));
}

export function playVictory(): void {
  const melody = [523, 659, 784, 659, 784, 1047, 784, 1047, 1319];
  melody.forEach((f, i) => playTone({ freq: f, duration: 0.15, type: 'square', volume: 0.1, delay: i * 0.1 }));
  playTone({ freq: 1568, duration: 0.5, type: 'square', volume: 0.1, delay: melody.length * 0.1 });
}

// ── Background Music ────────────────────────────────────────

const MELODY_NOTES = [
  523, 0, 659, 0, 784, 659, 523, 0,
  587, 0, 698, 0, 880, 698, 587, 0,
  523, 0, 659, 0, 784, 659, 523, 0,
  659, 0, 523, 0, 440, 523, 659, 0,
];

const BASS_NOTES = [
  131, 131, 196, 196, 131, 131, 196, 196,
  147, 147, 220, 220, 147, 147, 220, 220,
  131, 131, 196, 196, 131, 131, 196, 196,
  165, 165, 131, 131, 196, 196, 165, 165,
];

let melodyIndex = 0;
let bassIndex = 0;

function playMusicStep(): void {
  if (muted || !musicPlaying) return;
  const c = getCtx();
  if (!c) return;

  const mNote = MELODY_NOTES[melodyIndex % MELODY_NOTES.length];
  if (mNote > 0) {
    playTone({ freq: mNote, duration: 0.15, type: 'square', volume: 0.06 });
  }
  if (melodyIndex % 2 === 0) {
    const bNote = BASS_NOTES[bassIndex % BASS_NOTES.length];
    if (bNote > 0) {
      playTone({ freq: bNote, duration: 0.25, type: 'triangle', volume: 0.05 });
    }
    bassIndex++;
  }
  melodyIndex++;
}

export function startMusic(): void {
  if (musicPlaying) return;
  const c = getCtx();
  if (!c) return;
  musicPlaying = true;
  melodyIndex = 0;
  bassIndex = 0;
  musicTimer = window.setInterval(playMusicStep, 180);
}

export function stopMusic(): void {
  musicPlaying = false;
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  if (muted) stopMusic();
}

export function isMuted(): boolean {
  return muted;
}

export function unlockAudio(): void {
  getCtx();
}
