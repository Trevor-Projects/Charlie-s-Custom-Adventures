import React, { useState, useEffect } from 'react';
import { Volume2, Volume1, VolumeX, Sliders, Music, Sparkles } from 'lucide-react';
import { soundManager, AMBIENT_THEMES, AudioSettingsState } from '../utils/audio';

interface AmbientSoundControllerProps {
  settingName: string;
  worldName: string;
  isCombat?: boolean;
  onOpenAudioSettings: () => void;
}

export const AmbientSoundController: React.FC<AmbientSoundControllerProps> = ({
  settingName,
  worldName,
  isCombat = false,
  onOpenAudioSettings,
}) => {
  const [settings, setSettings] = useState<AudioSettingsState>(soundManager.getSettings());
  const activeMeta = soundManager.getActiveThemeMeta();

  // Keep ambient sound in sync with context
  useEffect(() => {
    soundManager.updateContext(settingName, worldName, isCombat);
    setSettings(soundManager.getSettings());
  }, [settingName, worldName, isCombat]);

  const isPlaying = settings.masterEnabled && settings.ambientEnabled;

  const handleToggleAmbient = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !settings.ambientEnabled;
    soundManager.setAmbientEnabled(next);
    setSettings(soundManager.getSettings());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVol = parseFloat(e.target.value);
    soundManager.setAmbientVolume(newVol);
    setSettings(soundManager.getSettings());
  };

  return (
    <div className="bg-stone-950/80 border border-amber-900/40 rounded-xl px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
      {/* Current Theme Context Info */}
      <div
        onClick={onOpenAudioSettings}
        className="flex items-center gap-2.5 cursor-pointer group"
        title="Click to configure soundscapes & audio"
      >
        <span className="text-xl group-hover:scale-110 transition-transform">
          {activeMeta.emoji}
        </span>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold font-serif text-amber-200 group-hover:text-amber-100 flex items-center gap-1">
              {activeMeta.name}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-800/60 font-mono">
              Ambient Realm
            </span>
          </div>
          <p className="text-[10px] text-stone-400 max-w-xs truncate">
            {activeMeta.tagline}
          </p>
        </div>
      </div>

      {/* Controls & Animated Equalizer */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Equalizer wave bars */}
        {isPlaying ? (
          <div className="flex items-end gap-0.5 h-3.5 px-1.5 py-0.5 bg-stone-900/80 rounded border border-emerald-800/40" title="Ambient audio active">
            <div className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-full" />
            <div className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-2.5" />
            <div className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.45s] h-3" />
            <div className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" />
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-stone-500 font-mono">
            <span>Muted</span>
          </div>
        )}

        {/* Quick Ambient Toggle */}
        <button
          type="button"
          onClick={handleToggleAmbient}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isPlaying
              ? 'text-cyan-400 hover:bg-stone-800 bg-cyan-950/40 border border-cyan-800/50'
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
          }`}
          title={isPlaying ? 'Mute Ambient Soundscape' : 'Enable Ambient Soundscape'}
        >
          {isPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Quick Ambient Volume Slider */}
        <div className="hidden sm:flex items-center gap-1.5 bg-stone-900/70 px-2.5 py-1 rounded-lg border border-stone-800">
          <Music className="w-3 h-3 text-stone-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.ambientVolume}
            disabled={!settings.ambientEnabled || !settings.masterEnabled}
            onChange={handleVolumeChange}
            className="w-16 h-1.5 accent-amber-500 bg-stone-800 rounded cursor-pointer disabled:opacity-30"
            title={`Ambient Volume: ${Math.round(settings.ambientVolume * 100)}%`}
          />
          <span className="text-[10px] font-mono text-stone-400 w-6 text-right">
            {Math.round(settings.ambientVolume * 100)}%
          </span>
        </div>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenAudioSettings}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 border border-stone-700 text-xs font-serif transition-colors cursor-pointer"
          title="Open Audio & Sound Settings"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline text-[11px]">Audio Settings</span>
        </button>
      </div>
    </div>
  );
};
