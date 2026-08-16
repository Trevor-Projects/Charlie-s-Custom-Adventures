import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Volume1,
  VolumeX,
  Sliders,
  Sparkles,
  Music,
  Dices,
  Shield,
  Swords,
  X,
  Play,
  Check,
  RotateCcw,
  Zap,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { soundManager, AMBIENT_THEMES, AmbientThemeId, AudioSettingsState } from '../utils/audio';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingName?: string;
  worldName?: string;
  isCombat?: boolean;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settingName = '',
  worldName = '',
  isCombat = false,
}) => {
  if (!isOpen) return null;

  const [settings, setSettings] = useState<AudioSettingsState>(soundManager.getSettings());
  const activeMeta = soundManager.getActiveThemeMeta();
  const [activeTab, setActiveTab] = useState<'settings' | 'soundscapes'>('settings');

  // Sync state on change
  const handleUpdate = (newSettings: Partial<AudioSettingsState>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (newSettings.masterEnabled !== undefined) soundManager.setMasterEnabled(newSettings.masterEnabled);
    if (newSettings.masterVolume !== undefined) soundManager.setMasterVolume(newSettings.masterVolume);
    if (newSettings.ambientEnabled !== undefined) soundManager.setAmbientEnabled(newSettings.ambientEnabled);
    if (newSettings.ambientVolume !== undefined) soundManager.setAmbientVolume(newSettings.ambientVolume);
    if (newSettings.sfxEnabled !== undefined) soundManager.setSfxEnabled(newSettings.sfxEnabled);
    if (newSettings.sfxVolume !== undefined) soundManager.setSfxVolume(newSettings.sfxVolume);
    if (newSettings.themeOverride !== undefined) soundManager.setThemeOverride(newSettings.themeOverride);
  };

  const handleTestSfx = (type: 'dice' | 'sword' | 'spell' | 'crit' | 'critFail') => {
    switch (type) {
      case 'dice':
        soundManager.playDiceRoll();
        break;
      case 'sword':
        soundManager.playSwordClash();
        break;
      case 'spell':
        soundManager.playSpellCast();
        break;
      case 'crit':
        soundManager.playCriticalSuccess();
        break;
      case 'critFail':
        soundManager.playCriticalFailure();
        break;
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-stone-900 border border-amber-800/70 rounded-2xl max-w-xl w-full p-5 sm:p-7 shadow-2xl text-stone-100 relative max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-amber-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-amber-800/50 pb-4 mb-4 pr-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-950/80 rounded-xl border border-amber-700/60 text-amber-300 shadow-inner">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Music className="w-3 h-3 text-amber-400" /> Audio & Soundscape Engine
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-100">
                Audio Settings
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 mb-4 bg-stone-950/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold font-serif transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Volume Controls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('soundscapes')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold font-serif transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'soundscapes'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ambient Themes ({Object.keys(AMBIENT_THEMES).length})</span>
          </button>
        </div>

        {/* Tab 1: Volume Controls & Channels */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Active Theme Context Badge */}
            <div className="bg-stone-950 p-3.5 rounded-xl border border-amber-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeMeta.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-200 font-serif">
                      {activeMeta.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 font-mono">
                      {settings.themeOverride === 'auto' ? 'Context-Aware (Auto)' : 'Custom Override'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-tight mt-0.5">
                    {activeMeta.tagline}
                  </p>
                </div>
              </div>

              {settings.masterEnabled && settings.ambientEnabled && (
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-stone-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Playing</span>
                </div>
              )}
            </div>

            {/* 1. Master Channel Volume Slider & Toggle */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.masterEnabled && settings.masterVolume > 0 ? (
                    <Volume2 className="w-4 h-4 text-amber-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-stone-500" />
                  )}
                  <span className="text-sm font-bold text-stone-200 font-serif">
                    Master Volume
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {settings.masterEnabled ? `${Math.round(settings.masterVolume * 100)}%` : 'MUTED'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleUpdate({ masterEnabled: !settings.masterEnabled })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      settings.masterEnabled
                        ? 'bg-amber-600/80 hover:bg-amber-500 text-stone-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                    }`}
                  >
                    {settings.masterEnabled ? 'Enabled' : 'Muted'}
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                disabled={!settings.masterEnabled}
                onChange={(e) => handleUpdate({ masterVolume: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-stone-800 h-2 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* 2. Ambient Background Soundscape Channel */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-sm font-bold text-stone-200 font-serif block">
                      Ambient Soundscape
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Context-aware procedural atmospheric wind, sea, bells & drones
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {settings.ambientEnabled ? `${Math.round(settings.ambientVolume * 100)}%` : 'OFF'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleUpdate({ ambientEnabled: !settings.ambientEnabled })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      settings.ambientEnabled
                        ? 'bg-cyan-600/80 hover:bg-cyan-500 text-stone-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                    }`}
                  >
                    {settings.ambientEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.ambientVolume}
                disabled={!settings.ambientEnabled || !settings.masterEnabled}
                onChange={(e) => handleUpdate({ ambientVolume: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-stone-800 h-2 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* 3. Sound Effects (SFX) Channel */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dices className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-sm font-bold text-stone-200 font-serif block">
                      Sound Effects (SFX)
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Dice rolls, critical strikes, spell casts & sword clashes
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {settings.sfxEnabled ? `${Math.round(settings.sfxVolume * 100)}%` : 'OFF'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleUpdate({ sfxEnabled: !settings.sfxEnabled })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      settings.sfxEnabled
                        ? 'bg-emerald-600/80 hover:bg-emerald-500 text-stone-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                    }`}
                  >
                    {settings.sfxEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                disabled={!settings.sfxEnabled || !settings.masterEnabled}
                onChange={(e) => handleUpdate({ sfxVolume: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 bg-stone-800 h-2 rounded-lg cursor-pointer disabled:opacity-40"
              />

              {/* SFX Quick Test Buttons */}
              <div className="pt-2 border-t border-stone-900 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">
                  Test SFX:
                </span>
                <button
                  type="button"
                  onClick={() => handleTestSfx('dice')}
                  className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-3 h-3 text-amber-400" />
                  <span>Dice Roll</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSfx('sword')}
                  className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] text-red-200 flex items-center gap-1 cursor-pointer"
                >
                  <Swords className="w-3 h-3 text-red-400" />
                  <span>Sword Strike</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSfx('spell')}
                  className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] text-purple-200 flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-purple-400" />
                  <span>Spell Cast</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSfx('crit')}
                  className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-amber-600/60 text-[11px] text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Nat 20 Crit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSfx('critFail')}
                  className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 border border-red-800/60 text-[11px] text-red-300 flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  <span>Nat 1 Fumble</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ambient Soundscape Theme Selector & Overrides */}
        {activeTab === 'soundscapes' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <p className="text-xs text-stone-400 mb-1">
              Ambient audio automatically syncs with your campaign's setting (<strong className="text-amber-300">{settingName || 'Active Realm'}</strong>) and story beats. You can also pick a specific soundscape below:
            </p>

            {/* Auto (Context-Aware) Option */}
            <div
              onClick={() => handleUpdate({ themeOverride: 'auto' })}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.themeOverride === 'auto'
                  ? 'bg-amber-950/70 border-amber-500 shadow-md'
                  : 'bg-stone-950 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-amber-200 font-serif">
                      Auto (Context-Aware Campaign Sync)
                    </h4>
                    {settings.themeOverride === 'auto' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-mono">
                        Active Mode
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Automatically triggers matching audio for {settingName || 'your current realm'} & combat.
                  </p>
                </div>
              </div>
              {settings.themeOverride === 'auto' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
            </div>

            {/* Theme list */}
            {Object.values(AMBIENT_THEMES).map((theme) => {
              const isSelected = settings.themeOverride === theme.id;
              const isCurrentPlaying = activeMeta.id === theme.id && settings.ambientEnabled && settings.masterEnabled;

              return (
                <div
                  key={theme.id}
                  onClick={() => handleUpdate({ themeOverride: theme.id })}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-950/70 border-amber-500 shadow-md'
                      : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{theme.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-amber-200 font-serif">
                          {theme.name}
                        </h4>
                        {isCurrentPlaying && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                            Playing Now
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400">
                        {theme.tagline}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-amber-800/40 pt-4 mt-4 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              handleUpdate({
                masterEnabled: true,
                masterVolume: 0.8,
                ambientEnabled: true,
                ambientVolume: 0.6,
                sfxEnabled: true,
                sfxVolume: 0.85,
                themeOverride: 'auto',
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Reset to default audio settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-serif transition-colors cursor-pointer shadow-md"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
