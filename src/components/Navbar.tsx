import React from 'react';
import { Volume2, Volume1, VolumeX, Dices, BookOpen, RotateCcw, Shield, Sparkles, BookMarked, Sliders, Compass, Map } from 'lucide-react';
import { GameState } from '../types';
import { soundManager } from '../utils/audio';

interface NavbarProps {
  gameState: GameState;
  onToggleSound: () => void;
  onOpenAudioSettings: () => void;
  onOpenDiceRoller: () => void;
  onOpenWikiCodex: () => void;
  onOpenJournal: () => void;
  onOpenWorldMap: () => void;
  onResetGame: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  gameState,
  onToggleSound,
  onOpenAudioSettings,
  onOpenDiceRoller,
  onOpenWikiCodex,
  onOpenJournal,
  onOpenWorldMap,
  onResetGame,
}) => {
  const currentMilestone = gameState.milestones[gameState.currentMilestoneIndex];
  const activePlayer = gameState.party[gameState.activePlayerIndex];
  const audioSettings = soundManager.getSettings();
  const activeMeta = soundManager.getActiveThemeMeta();
  const isAudioActive = audioSettings.masterEnabled && (audioSettings.ambientEnabled || audioSettings.sfxEnabled);

  return (
    <header className="bg-stone-900 border-b border-amber-900/40 text-stone-100 sticky top-0 z-30 shadow-xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & World Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center text-amber-100 shadow-md border border-amber-500/30">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold tracking-wide text-amber-100 flex items-center gap-2">
              Charlie's Custom Adventures
              <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50">
                1–4 Players
              </span>
            </h1>
            <p className="text-xs text-stone-400 font-sans truncate max-w-xs sm:max-w-md">
              {gameState.step === 'PLAYING' ? gameState.worldName || gameState.settingName : 'Campaign Generator'}
            </p>
          </div>
        </div>

        {/* Center Game Context Pill (Playing state) */}
        {gameState.step === 'PLAYING' && (
          <div className="hidden md:flex items-center gap-3 bg-stone-950/70 px-3 py-1.5 rounded-full border border-stone-800 text-xs">
            {currentMilestone && (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium border-r border-stone-800 pr-3">
                <Shield className="w-3.5 h-3.5" />
                <span>Chapter {currentMilestone.chapter}: {currentMilestone.title}</span>
              </div>
            )}
            {activePlayer && (
              <div className="flex items-center gap-1.5 text-stone-300">
                <span className="text-sm">{activePlayer.avatar}</span>
                <span>Turn: <strong className="text-amber-200">{activePlayer.name}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Controls / Actions */}
        <div className="flex items-center gap-2">
          {gameState.step === 'PLAYING' && (
            <>
              {/* World Map button */}
              <button
                onClick={onOpenWorldMap}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-600/60 transition-colors shadow-sm cursor-pointer"
                title="View World Map & Cartography"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">World Map</span>
              </button>

              {/* Campaign Journal Chronicle button */}
              <button
                onClick={onOpenJournal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors shadow-sm cursor-pointer"
                title="Open Campaign Journal Chronicle"
              >
                <BookMarked className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Journal</span>
              </button>

              {/* Quick d20 Roller button */}
              <button
                onClick={onOpenDiceRoller}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 transition-colors shadow-sm cursor-pointer"
                title="Open d20 Dice Roller"
              >
                <Dices className="w-4 h-4" />
                <span className="hidden sm:inline">Roll d20</span>
              </button>

              {/* Wikipedia Lore Codex button */}
              <button
                onClick={onOpenWikiCodex}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 transition-colors cursor-pointer"
                title="Wikipedia Lore Codex & Real Images"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Wiki Codex</span>
              </button>
            </>
          )}

          {/* Audio & Ambient Soundscape Settings */}
          <div className="flex items-center gap-1 bg-stone-950/70 p-1 rounded-lg border border-stone-800">
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isAudioActive
                  ? 'text-amber-300 hover:text-amber-100 hover:bg-stone-800'
                  : 'text-stone-600 hover:text-stone-400 hover:bg-stone-800'
              }`}
              title={isAudioActive ? 'Master Mute (Click to mute all)' : 'Unmute Master Audio'}
            >
              {isAudioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onOpenAudioSettings}
              className="px-2 py-1 text-[11px] font-mono text-stone-300 hover:text-amber-200 hover:bg-stone-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title={`Audio Settings (${activeMeta.name}) - Click to adjust volumes & themes`}
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">
                {audioSettings.masterEnabled ? `${Math.round(audioSettings.masterVolume * 100)}%` : 'Muted'}
              </span>
            </button>
          </div>

          {/* Reset / New Game */}
          <button
            onClick={onResetGame}
            className="p-2 text-stone-400 hover:text-amber-200 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
            title="Start New Campaign"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
