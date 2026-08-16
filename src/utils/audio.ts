// Web Audio API Synthesizer and Context-Aware Ambient Soundscape Controller for D&D

export type AmbientThemeId =
  | 'auto'
  | 'aegean-sea'
  | 'gothic-forest'
  | 'silk-desert'
  | 'steppe-winds'
  | 'sun-peaks'
  | 'dungeon-crypt'
  | 'tavern-hearth'
  | 'combat-drums';

export interface ThemeMeta {
  id: AmbientThemeId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  colorClass: string;
}

export const AMBIENT_THEMES: Record<string, ThemeMeta> = {
  'aegean-sea': {
    id: 'aegean-sea',
    name: 'Aegean Sea & Bronze Citadel',
    emoji: '🌊',
    tagline: 'Rolling ocean surf, coastal breeze, and distant bronze bells',
    description: 'Crisp Mediterranean sea swells with resonant bell chimes and coastal trade winds.',
    colorClass: 'text-cyan-400 border-cyan-700/60 bg-cyan-950/40',
  },
  'gothic-forest': {
    id: 'gothic-forest',
    name: 'Black Forest & Feudal Keep',
    emoji: '🌲',
    tagline: 'Haunted pine gusts, Gregorian sub-drones, and gothic chapel bells',
    description: 'Somber, brooding forest atmosphere with deep minor drone chords and cold medieval wind.',
    colorClass: 'text-emerald-400 border-emerald-700/60 bg-emerald-950/40',
  },
  'silk-desert': {
    id: 'silk-desert',
    name: 'Silk Road & Desert Oasis',
    emoji: '🏜️',
    tagline: 'Warm desert dunes, caravan wind, and shimmering mirage chimes',
    description: 'Swept desert wind with mystical oriental drone harmonies and delicate camel bell chimes.',
    colorClass: 'text-amber-400 border-amber-700/60 bg-amber-950/40',
  },
  'steppe-winds': {
    id: 'steppe-winds',
    name: 'Eurasian Steppes & Nomadic Sagas',
    emoji: '🐎',
    tagline: 'Howling open plains, throat-singing overtone drones, and wilderness',
    description: 'Expansive open grassland winds paired with low harmonic throat-singing overtones.',
    colorClass: 'text-yellow-400 border-yellow-700/60 bg-yellow-950/40',
  },
  'sun-peaks': {
    id: 'sun-peaks',
    name: 'Sun-Temple Citadels & Cloud Peaks',
    emoji: '🏔️',
    tagline: 'High-altitude whistling wind, Andean flute resonances, and solar chimes',
    description: 'Ethereal mountain heights, whispering thin air, and resonant golden altar tones.',
    colorClass: 'text-orange-400 border-orange-700/60 bg-orange-950/40',
  },
  'dungeon-crypt': {
    id: 'dungeon-crypt',
    name: 'Subterranean Crypt & Sunken Labyrinth',
    emoji: '🗝️',
    tagline: 'Echoing water drips, sub-bass cavern rumble, and eerie draft',
    description: 'Claustrophobic, mysterious subterranean depths with echoing water droplets and low hum.',
    colorClass: 'text-purple-400 border-purple-700/60 bg-purple-950/40',
  },
  'tavern-hearth': {
    id: 'tavern-hearth',
    name: 'Warm Hearth & Caravanserai Inn',
    emoji: '🔥',
    tagline: 'Crackling fire embers, soothing acoustic harmonies, and cozy refuge',
    description: 'Comforting crackle of a warm hearth fire accompanied by peaceful medieval chord warmth.',
    colorClass: 'text-rose-400 border-rose-700/60 bg-rose-950/40',
  },
  'combat-drums': {
    id: 'combat-drums',
    name: 'Battle Tension & War Drums',
    emoji: '⚔️',
    tagline: 'Pounding war drums, rising tension drone, and combat pulse',
    description: 'Rhythmic adrenaline-fueled war drums and dramatic discord to heighten battle encounters.',
    colorClass: 'text-red-400 border-red-700/60 bg-red-950/40',
  },
};

export interface AudioSettingsState {
  masterEnabled: boolean;
  masterVolume: number; // 0.0 to 1.0
  ambientEnabled: boolean;
  ambientVolume: number; // 0.0 to 1.0
  sfxEnabled: boolean;
  sfxVolume: number; // 0.0 to 1.0
  themeOverride: AmbientThemeId;
}

const STORAGE_KEY = 'dnd_audio_settings_v1';

class SoundManager {
  private ctx: AudioContext | null = null;

  // Master & Channel Gains
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Settings State
  private settings: AudioSettingsState = {
    masterEnabled: true,
    masterVolume: 0.8,
    ambientEnabled: true,
    ambientVolume: 0.6,
    sfxEnabled: true,
    sfxVolume: 0.85,
    themeOverride: 'auto',
  };

  // Active Context tracking
  private currentSettingName: string = '';
  private currentWeatherName: string = '';
  private currentIsCombat: boolean = false;
  private activeResolvedTheme: AmbientThemeId = 'gothic-forest';

  // Active ambient audio active generators
  private ambientCleanupFns: Array<() => void> = [];
  private isAmbientRunning: boolean = false;
  private bellIntervalId: any = null;
  private drumIntervalId: any = null;
  private dripIntervalId: any = null;

  constructor() {
    this.loadPersistedSettings();
  }

  private loadPersistedSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {
      console.warn('Could not load audio settings from localStorage', e);
    }
  }

  private persistSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not persist audio settings', e);
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Build master chain
        this.masterGain = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.ambientGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.updateGainValues();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private updateGainValues() {
    if (!this.ctx || !this.masterGain || !this.ambientGain || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const masterTarget = this.settings.masterEnabled ? this.settings.masterVolume : 0;
    const ambientTarget = this.settings.ambientEnabled ? this.settings.ambientVolume : 0;
    const sfxTarget = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;

    this.masterGain.gain.setValueAtTime(masterTarget, now);
    this.ambientGain.gain.setValueAtTime(ambientTarget, now);
    this.sfxGain.gain.setValueAtTime(sfxTarget, now);
  }

  // Determine theme from context
  public resolveTheme(settingName: string, worldName: string, isCombat: boolean): AmbientThemeId {
    if (this.settings.themeOverride !== 'auto') {
      return this.settings.themeOverride;
    }

    if (isCombat) {
      return 'combat-drums';
    }

    const combined = `${settingName} ${worldName}`.toLowerCase();

    if (
      combined.includes('aegean') ||
      combined.includes('minoan') ||
      combined.includes('sea') ||
      combined.includes('ocean') ||
      combined.includes('coastal') ||
      combined.includes('sunken') ||
      combined.includes('tide') ||
      combined.includes('water') ||
      combined.includes('island') ||
      combined.includes('mediterranean') ||
      combined.includes('ship')
    ) {
      return 'aegean-sea';
    }

    if (
      combined.includes('silk') ||
      combined.includes('oasis') ||
      combined.includes('desert') ||
      combined.includes('sand') ||
      combined.includes('caravan') ||
      combined.includes('sogdia') ||
      combined.includes('dunhuang') ||
      combined.includes('bazaar')
    ) {
      return 'silk-desert';
    }

    if (
      combined.includes('steppe') ||
      combined.includes('nomad') ||
      combined.includes('scythian') ||
      combined.includes('plains') ||
      combined.includes('horse') ||
      combined.includes('grassland') ||
      combined.includes('kurgan') ||
      combined.includes('tengri')
    ) {
      return 'steppe-winds';
    }

    if (
      combined.includes('sun') ||
      combined.includes('inca') ||
      combined.includes('machu') ||
      combined.includes('peak') ||
      combined.includes('mountain') ||
      combined.includes('andes') ||
      combined.includes('cloud') ||
      combined.includes('mesoamerica') ||
      combined.includes('solar')
    ) {
      return 'sun-peaks';
    }

    if (
      combined.includes('crypt') ||
      combined.includes('dungeon') ||
      combined.includes('cavern') ||
      combined.includes('underground') ||
      combined.includes('subterranean') ||
      combined.includes('cave') ||
      combined.includes('vault') ||
      combined.includes('labyrinth')
    ) {
      return 'dungeon-crypt';
    }

    if (
      combined.includes('gothic') ||
      combined.includes('teutonic') ||
      combined.includes('forest') ||
      combined.includes('keep') ||
      combined.includes('pine') ||
      combined.includes('black forest') ||
      combined.includes('knight') ||
      combined.includes('feudal')
    ) {
      return 'gothic-forest';
    }

    return 'gothic-forest';
  }

  // Update game context and smoothly shift ambient soundscape
  public updateContext(settingName: string, worldName: string, isCombat: boolean = false) {
    this.currentSettingName = settingName;
    this.currentWeatherName = worldName;
    this.currentIsCombat = isCombat;

    const newResolvedTheme = this.resolveTheme(settingName, worldName, isCombat);

    if (newResolvedTheme !== this.activeResolvedTheme || !this.isAmbientRunning) {
      this.activeResolvedTheme = newResolvedTheme;
      if (this.settings.masterEnabled && this.settings.ambientEnabled) {
        this.restartAmbientSoundscape();
      }
    }
  }

  // Start / Restart ambient audio loop
  public startAmbientSoundscape() {
    this.initCtx();
    if (!this.ctx || !this.ambientGain) return;

    this.stopAmbientSoundscape();
    this.isAmbientRunning = true;

    const theme = this.activeResolvedTheme;
    this.buildThemeSoundscape(theme);
  }

  public stopAmbientSoundscape() {
    this.ambientCleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    this.ambientCleanupFns = [];

    if (this.bellIntervalId) {
      clearInterval(this.bellIntervalId);
      this.bellIntervalId = null;
    }
    if (this.drumIntervalId) {
      clearInterval(this.drumIntervalId);
      this.drumIntervalId = null;
    }
    if (this.dripIntervalId) {
      clearInterval(this.dripIntervalId);
      this.dripIntervalId = null;
    }

    this.isAmbientRunning = false;
  }

  public restartAmbientSoundscape() {
    this.stopAmbientSoundscape();
    if (this.settings.masterEnabled && this.settings.ambientEnabled) {
      this.startAmbientSoundscape();
    }
  }

  // --- Procedural Web Audio Generators for Themes ---

  private buildThemeSoundscape(theme: AmbientThemeId) {
    if (!this.ctx || !this.ambientGain) return;

    switch (theme) {
      case 'aegean-sea':
        this.buildAegeanSeaSoundscape();
        break;
      case 'gothic-forest':
        this.buildGothicForestSoundscape();
        break;
      case 'silk-desert':
        this.buildSilkDesertSoundscape();
        break;
      case 'steppe-winds':
        this.buildSteppeWindsSoundscape();
        break;
      case 'sun-peaks':
        this.buildSunPeaksSoundscape();
        break;
      case 'dungeon-crypt':
        this.buildDungeonCryptSoundscape();
        break;
      case 'tavern-hearth':
        this.buildTavernHearthSoundscape();
        break;
      case 'combat-drums':
        this.buildCombatDrumsSoundscape();
        break;
      default:
        this.buildGothicForestSoundscape();
        break;
    }
  }

  // 1. Aegean Sea & Bronze Citadel (Waves + Wind + Resonant Bells)
  private buildAegeanSeaSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Ocean Swell (Pink/Brown noise with low-frequency LFO sweeping filter and gain)
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    const swellGain = this.ctx.createGain();
    swellGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    // LFO for surf wave cycle (~7s wave period)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.14, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(450, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(swellGain);
    swellGain.connect(this.ambientGain);

    noise.start();
    lfo.start();

    this.ambientCleanupFns.push(() => {
      try {
        noise.stop();
        lfo.stop();
        noise.disconnect();
        filter.disconnect();
        swellGain.disconnect();
      } catch (e) {}
    });

    // Bronze Bell Chimes triggered every ~9-14 seconds
    const playBronzeChime = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const freqs = [330, 440, 550, 660, 880];
      const freq = freqs[Math.floor(Math.random() * freqs.length)];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      bellGain.gain.setValueAtTime(0.08, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc.connect(bellGain);
      bellGain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 3.6);
    };

    playBronzeChime();
    this.bellIntervalId = setInterval(playBronzeChime, 11000);
  }

  // 2. Black Forest & Gothic Keep (Pine Winds + Minor Saw Drone + Church Chime)
  private buildGothicForestSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Wind through pines (Bandpass noise with slow frequency modulation)
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.14, this.ctx.currentTime);

    const windLfo = this.ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);

    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

    windLfo.connect(windLfoGain);
    windLfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.ambientGain);

    noise.start();
    windLfo.start();

    // Dark Sub Drone (Detuned saw oscillators in A minor: 55Hz & 82.4Hz)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const droneFilter = this.ctx.createBiquadFilter();
    const droneGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(82.41, this.ctx.currentTime); // E2

    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

    droneGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.ambientGain);

    osc1.start();
    osc2.start();

    this.ambientCleanupFns.push(() => {
      try {
        noise.stop();
        windLfo.stop();
        osc1.stop();
        osc2.stop();
        noise.disconnect();
        droneGain.disconnect();
      } catch (e) {}
    });

    // Periodic Deep Bell Toll
    const playGothicBell = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);

      bellGain.gain.setValueAtTime(0.1, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);

      osc.connect(bellGain);
      bellGain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 4.1);
    };

    playGothicBell();
    this.bellIntervalId = setInterval(playGothicBell, 14000);
  }

  // 3. Silk Road & Desert Oasis (Desert Wind + Oriental Fifth Drone + Camel Chimes)
  private buildSilkDesertSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Warm high desert wind
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.ambientGain);
    noise.start();

    // Oriental D-A fifth chord drone
    const drone1 = this.ctx.createOscillator();
    const drone2 = this.ctx.createOscillator();
    const dGain = this.ctx.createGain();
    const dFilter = this.ctx.createBiquadFilter();

    drone1.type = 'triangle';
    drone1.frequency.setValueAtTime(146.83, this.ctx.currentTime); // D3
    drone2.type = 'sine';
    drone2.frequency.setValueAtTime(220.0, this.ctx.currentTime); // A3

    dFilter.type = 'lowpass';
    dFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    dGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

    drone1.connect(dFilter);
    drone2.connect(dFilter);
    dFilter.connect(dGain);
    dGain.connect(this.ambientGain);

    drone1.start();
    drone2.start();

    this.ambientCleanupFns.push(() => {
      try {
        noise.stop();
        drone1.stop();
        drone2.stop();
        noise.disconnect();
        dGain.disconnect();
      } catch (e) {}
    });

    // Shimmering desert chimes
    const playDesertChimes = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const notes = [587.33, 659.25, 783.99, 880.0, 1046.5]; // D5, E5, G5, A5, C6
      const note = notes[Math.floor(Math.random() * notes.length)];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 2.6);
    };

    this.bellIntervalId = setInterval(playDesertChimes, 8000);
  }

  // 4. Eurasian Steppes (Howling Plains Winds + Throat-Singing Resonant Drone)
  private buildSteppeWindsSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Howling steppe wind
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, this.ctx.currentTime);
    filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    const windLfo = this.ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);

    const windLfoGain = this.ctx.createGain();
    windLfoGain.gain.setValueAtTime(220, this.ctx.currentTime);

    windLfo.connect(windLfoGain);
    windLfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.ambientGain);

    noise.start();
    windLfo.start();

    // Throat singing overtone drone (65.4Hz C2 fundamental + formant resonance)
    const throatOsc = this.ctx.createOscillator();
    const throatFilter = this.ctx.createBiquadFilter();
    const throatGain = this.ctx.createGain();

    throatOsc.type = 'sawtooth';
    throatOsc.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2

    throatFilter.type = 'bandpass';
    throatFilter.frequency.setValueAtTime(520, this.ctx.currentTime);
    throatFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    throatGain.gain.setValueAtTime(0.1, this.ctx.currentTime);

    throatOsc.connect(throatFilter);
    throatFilter.connect(throatGain);
    throatGain.connect(this.ambientGain);

    throatOsc.start();

    this.ambientCleanupFns.push(() => {
      try {
        noise.stop();
        windLfo.stop();
        throatOsc.stop();
        noise.disconnect();
        throatGain.disconnect();
      } catch (e) {}
    });
  }

  // 5. Sun-Temple Peaks (High Mountain Air + Ethereal Wind-Flute)
  private buildSunPeaksSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Mountain peak thin whistling air
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.ambientGain);
    noise.start();

    // Ethereal Solar Drone
    const drone1 = this.ctx.createOscillator();
    const drone2 = this.ctx.createOscillator();
    const dGain = this.ctx.createGain();

    drone1.type = 'sine';
    drone1.frequency.setValueAtTime(220, this.ctx.currentTime); // A3
    drone2.type = 'sine';
    drone2.frequency.setValueAtTime(329.63, this.ctx.currentTime); // E4

    dGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    drone1.connect(dGain);
    drone2.connect(dGain);
    dGain.connect(this.ambientGain);

    drone1.start();
    drone2.start();

    this.ambientCleanupFns.push(() => {
      try {
        noise.stop();
        drone1.stop();
        drone2.stop();
        noise.disconnect();
        dGain.disconnect();
      } catch (e) {}
    });

    // Andean Wind-Flute breath note
    const playFluteTone = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const pitches = [440, 493.88, 554.37, 659.25, 739.99]; // A4, B4, C#5, E5, F#5
      const pitch = pitches[Math.floor(Math.random() * pitches.length)];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 3.3);
    };

    this.bellIntervalId = setInterval(playFluteTone, 10000);
  }

  // 6. Subterranean Crypt & Cave (Cavern Sub Rumble + Water Drips)
  private buildDungeonCryptSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Low sub-bass cave hum (42Hz)
    const subOsc = this.ctx.createOscillator();
    const subFilter = this.ctx.createBiquadFilter();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(42, this.ctx.currentTime);

    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(80, this.ctx.currentTime);

    subGain.gain.setValueAtTime(0.16, this.ctx.currentTime);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.ambientGain);

    subOsc.start();

    // Cavern breeze
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const draftGain = this.ctx.createGain();
    draftGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(draftGain);
    draftGain.connect(this.ambientGain);
    noise.start();

    this.ambientCleanupFns.push(() => {
      try {
        subOsc.stop();
        noise.stop();
        subGain.disconnect();
        draftGain.disconnect();
      } catch (e) {}
    });

    // Periodic Cavern Water Drop
    const playWaterDrip = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const now = this.ctx.currentTime;
      const startFreq = 1400 + Math.random() * 600;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 0.36);
    };

    this.dripIntervalId = setInterval(playWaterDrip, 4500);
  }

  // 7. Warm Hearth & Campfire (Fire Crackle + Cozy Lute Drone)
  private buildTavernHearthSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Fire roar (low filtered noise)
    const noise = this.createNoiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);

    const fireGain = this.ctx.createGain();
    fireGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(fireGain);
    fireGain.connect(this.ambientGain);
    noise.start();

    // Warm Major Harmony Drone (C - G - E)
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const hGain = this.ctx.createGain();

    o1.type = 'triangle';
    o1.frequency.setValueAtTime(130.81, this.ctx.currentTime); // C3
    o2.type = 'sine';
    o2.frequency.setValueAtTime(196.0, this.ctx.currentTime); // G3

    hGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    o1.connect(hGain);
    o2.connect(hGain);
    hGain.connect(this.ambientGain);

    o1.start();
    o2.start();

    this.ambientCleanupFns.push(() => {
      try {
        noise.stop();
        o1.stop();
        o2.stop();
        fireGain.disconnect();
        hGain.disconnect();
      } catch (e) {}
    });

    // Fire crackle pops
    const playCrackle = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + Math.random() * 1200, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 0.05);
    };

    this.bellIntervalId = setInterval(playCrackle, 800);
  }

  // 8. Battle Tension & War Drums (Rhythmic War Drums + Rising Tension Chord)
  private buildCombatDrumsSoundscape() {
    if (!this.ctx || !this.ambientGain) return;

    // Tension Drone (Dissonant minor second / tritone)
    const t1 = this.ctx.createOscillator();
    const t2 = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    const tFilter = this.ctx.createBiquadFilter();

    t1.type = 'sawtooth';
    t1.frequency.setValueAtTime(73.42, this.ctx.currentTime); // D2
    t2.type = 'sawtooth';
    t2.frequency.setValueAtTime(103.83, this.ctx.currentTime); // G#2 (Tritone)

    tFilter.type = 'lowpass';
    tFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

    tGain.gain.setValueAtTime(0.14, this.ctx.currentTime);

    t1.connect(tFilter);
    t2.connect(tFilter);
    tFilter.connect(tGain);
    tGain.connect(this.ambientGain);

    t1.start();
    t2.start();

    this.ambientCleanupFns.push(() => {
      try {
        t1.stop();
        t2.stop();
        tGain.disconnect();
      } catch (e) {}
    });

    // Pounding War Drum Rhythm (Every 1.2s)
    const playWarDrum = () => {
      if (!this.ctx || !this.ambientGain || !this.isAmbientRunning) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ambientGain);

      osc.start(now);
      osc.stop(now + 0.42);
    };

    playWarDrum();
    this.drumIntervalId = setInterval(playWarDrum, 1250);
  }

  // White noise buffer generator for wind, sea, breath, and metal
  private createNoiseSource(): AudioBufferSourceNode {
    const bufferSize = this.ctx!.sampleRate * 2;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  }

  // --- Public Settings API ---

  public getSettings(): AudioSettingsState {
    return { ...this.settings };
  }

  public getActiveThemeMeta(): ThemeMeta {
    return (
      AMBIENT_THEMES[this.activeResolvedTheme] || {
        id: this.activeResolvedTheme,
        name: 'The Realm Atmosphere',
        emoji: '✨',
        tagline: 'Dynamic ambient soundscape',
        description: 'Atmospheric immersion.',
        colorClass: 'text-amber-400 border-amber-700/60 bg-amber-950/40',
      }
    );
  }

  public setMasterEnabled(enabled: boolean) {
    this.settings.masterEnabled = enabled;
    this.updateGainValues();
    if (enabled && this.settings.ambientEnabled && !this.isAmbientRunning) {
      this.startAmbientSoundscape();
    } else if (!enabled) {
      this.stopAmbientSoundscape();
    }
    this.persistSettings();
  }

  public setMasterVolume(vol: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateGainValues();
    this.persistSettings();
  }

  public setAmbientEnabled(enabled: boolean) {
    this.settings.ambientEnabled = enabled;
    this.updateGainValues();
    if (enabled && this.settings.masterEnabled && !this.isAmbientRunning) {
      this.startAmbientSoundscape();
    } else if (!enabled) {
      this.stopAmbientSoundscape();
    }
    this.persistSettings();
  }

  public setAmbientVolume(vol: number) {
    this.settings.ambientVolume = Math.max(0, Math.min(1, vol));
    this.updateGainValues();
    this.persistSettings();
  }

  public setSfxEnabled(enabled: boolean) {
    this.settings.sfxEnabled = enabled;
    this.updateGainValues();
    this.persistSettings();
  }

  public setSfxVolume(vol: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, vol));
    this.updateGainValues();
    this.persistSettings();
  }

  public setThemeOverride(override: AmbientThemeId) {
    this.settings.themeOverride = override;
    this.persistSettings();
    this.updateContext(this.currentSettingName, this.currentWeatherName, this.currentIsCombat);
  }

  // Legacy boolean toggle support for simple Navbar click
  public setEnabled(enabled: boolean) {
    this.setMasterEnabled(enabled);
  }

  public isEnabled(): boolean {
    return this.settings.masterEnabled;
  }

  // --- Sound Effects (SFX) Methods ---

  public playDiceRoll() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const rollsCount = 8;
    for (let i = 0; i < rollsCount; i++) {
      const time = now + i * 0.09 + Math.random() * 0.03;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 480, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.05);

      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(time);
      osc.stop(time + 0.06);
    }
  }

  public playDiceLanding() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Felt Tray Thud & Click
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSuccess() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);

      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  }

  public playFail() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const failNotes = [392.0, 311.13, 261.63]; // G4 -> Eb4 -> C4 (Minor descent)
    failNotes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.1);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + idx * 0.1 + 0.28);

      gain.gain.setValueAtTime(0.22, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.36);
    });
  }

  /**
   * Radiant, heroic triumphant fanfare for a Natural 20 Critical Success.
   * Multi-layered harmonic brass arpeggio + high crystal chime shimmer.
   */
  public playCriticalSuccess() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Layer 1: Radiant golden fanfare notes [C5, E5, G5, C6, E6, G6, C7]
    const fanfareNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
    fanfareNotes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx >= fanfareNotes.length - 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);

      const dur = idx === fanfareNotes.length - 1 ? 1.4 : 0.7;
      const vol = idx === fanfareNotes.length - 1 ? 0.38 : 0.26;

      gain.gain.setValueAtTime(vol, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + dur + 0.05);
    });

    // Layer 2: Resonant Sub-Bass Root Punch (C3: 130.81Hz)
    const rootOsc = this.ctx.createOscillator();
    const rootGain = this.ctx.createGain();
    rootOsc.type = 'triangle';
    rootOsc.frequency.setValueAtTime(130.81, now);
    rootOsc.frequency.exponentialRampToValueAtTime(65.41, now + 0.8);
    rootGain.gain.setValueAtTime(0.3, now);
    rootGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    rootOsc.connect(rootGain);
    rootGain.connect(this.sfxGain);
    rootOsc.start(now);
    rootOsc.stop(now + 0.95);

    // Layer 3: Celestial Shimmer Bell High-Chime
    const shimmerOsc = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(2637.02, now + 0.3); // E7
    shimmerGain.gain.setValueAtTime(0.18, now + 0.3);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmerOsc.start(now + 0.3);
    shimmerOsc.stop(now + 1.25);
  }

  /**
   * Alias for Critical Success
   */
  public playCrit() {
    this.playCriticalSuccess();
  }

  /**
   * Ominous, dramatic, detuned descending doom buzzer for a Natural 1 Critical Failure / Fumble.
   * Dissonant tritone slides + low-end rumble thud.
   */
  public playCriticalFailure() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Layer 1: Dissonant Tritone Saw Oscillators (F#3 @ 185Hz & C3 @ 130.8Hz sliding down)
    const tritoneFreqs = [185.0, 130.81];
    tritoneFreqs.forEach((startFreq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      // Descend sharply to an abyssal low pitch
      osc.frequency.exponentialRampToValueAtTime(32.0, now + 0.75);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.75);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.85);
    });

    // Layer 2: Staggered second "Wah-wah" dissonant drop at now + 0.18s
    const wahOsc = this.ctx.createOscillator();
    const wahGain = this.ctx.createGain();
    wahOsc.type = 'sawtooth';
    wahOsc.frequency.setValueAtTime(116.54, now + 0.18); // Bb2
    wahOsc.frequency.exponentialRampToValueAtTime(28.0, now + 0.85);

    wahGain.gain.setValueAtTime(0.28, now + 0.18);
    wahGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    wahOsc.connect(wahGain);
    wahGain.connect(this.sfxGain);

    wahOsc.start(now + 0.18);
    wahOsc.stop(now + 0.9);

    // Layer 3: Fumble Impact Clatter / Thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'square';
    thudOsc.frequency.setValueAtTime(85, now);
    thudOsc.frequency.exponentialRampToValueAtTime(25, now + 0.25);

    thudGain.gain.setValueAtTime(0.25, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    thudOsc.connect(thudGain);
    thudGain.connect(this.sfxGain);

    thudOsc.start(now);
    thudOsc.stop(now + 0.28);
  }

  /**
   * Alias for Critical Failure
   */
  public playCritFail() {
    this.playCriticalFailure();
  }

  /**
   * Alias for Fumble
   */
  public playFumble() {
    this.playCriticalFailure();
  }

  public playLevelUp() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Radiant Brass/Synth Arpeggio: C4 -> E4 -> G4 -> C5 -> E5 -> G5 -> C6 fanfare
    const fanfareNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    fanfareNotes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === fanfareNotes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);

      gain.gain.setValueAtTime(0.32, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + (idx === fanfareNotes.length - 1 ? 1.2 : 0.5));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + (idx === fanfareNotes.length - 1 ? 1.3 : 0.6));
    });
  }

  public playSwordClash() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  public playPageTurn() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSpellCast() {
    if (!this.settings.masterEnabled || !this.settings.sfxEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}

export const soundManager = new SoundManager();
