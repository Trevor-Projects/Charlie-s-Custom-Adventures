import React, { useState } from 'react';
import { Character, StatusEffectType } from '../types';
import {
  formatModifier,
  getStatModifier,
  ALL_STATUS_EFFECTS,
  STATUS_EFFECTS_CONFIG,
  SPELLCASTING_CLASSES,
  getXpProgressInfo,
} from '../data/presets';
import {
  Shield,
  Heart,
  Sparkles,
  X,
  Package,
  Scroll,
  Activity,
  Wand2,
  Moon,
  Plus,
  Minus,
  Zap,
  Camera,
  ArrowUpCircle,
  Award,
  Swords,
  Flame,
} from 'lucide-react';
import { getStatusEffectIcon } from './PartyBar';
import { PortraitEditorModal } from './PortraitEditorModal';
import { LevelUpModal } from './LevelUpModal';
import { soundManager } from '../utils/audio';

interface CharacterModalProps {
  character: Character | null;
  onClose: () => void;
  onToggleStatusEffect?: (characterId: string, effect: StatusEffectType) => void;
  onUpdateSpellSlots?: (characterId: string, action: 'spend' | 'restore' | 'rest') => void;
  onUpdatePortrait?: (characterId: string, newPortraitUrl: string) => void;
  onUpdateCharacter?: (updatedCharacter: Character) => void;
  worldName?: string;
  settingName?: string;
  recentNarrative?: string;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  character,
  onClose,
  onToggleStatusEffect,
  onUpdateSpellSlots,
  onUpdatePortrait,
  onUpdateCharacter,
  worldName,
  settingName,
  recentNarrative,
}) => {
  const [isEditingPortrait, setIsEditingPortrait] = useState(false);
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [customXpInput, setCustomXpInput] = useState('');
  const [isAddingCustomXp, setIsAddingCustomXp] = useState(false);

  if (!character) return null;

  const activeEffects = character.statusEffects || [];
  const isCaster = character.maxSpellSlots > 0 || SPELLCASTING_CLASSES.includes(character.characterClass);
  const currentXp = character.xp || 0;
  const currentLevel = character.level || 1;
  const xpInfo = getXpProgressInfo(currentXp, currentLevel);

  const handleAddXp = (amount: number) => {
    if (amount <= 0) return;
    soundManager.playDiceLanding();
    const newXp = currentXp + amount;
    const updatedChar: Character = {
      ...character,
      xp: newXp,
    };
    if (onUpdateCharacter) {
      onUpdateCharacter(updatedChar);
    }
  };

  const handleCustomXpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customXpInput, 10);
    if (!isNaN(val) && val > 0) {
      handleAddXp(val);
      setCustomXpInput('');
      setIsAddingCustomXp(false);
    }
  };

  const getCasterTraditionText = (cClass: string) => {
    switch (cClass) {
      case 'Wizard':
        return 'Arcane Study & Spell Preparation (INT Spellcasting)';
      case 'Cleric':
        return 'Divine Prayers & Sacred Favor (WIS Spellcasting)';
      case 'Bard':
        return 'Song of Rest & Magical Rhymes (CHA Spellcasting)';
      case 'Sorcerer':
        return 'Innate Arcane Magic & Sorcery (CHA Spellcasting)';
      case 'Warlock':
        return 'Eldritch Pact Magic (CHA Spellcasting)';
      case 'Druid':
        return 'Nature Connection & Wild Magic (WIS Spellcasting)';
      case 'Paladin':
        return 'Sacred Oath & Divine Smite (CHA Spellcasting)';
      case 'Ranger':
        return 'Primal Wilderness Magic (WIS Spellcasting)';
      default:
        return 'Arcane Power';
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-amber-800/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-stone-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-amber-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 border-b border-stone-800 pb-4">
          <div className="relative group flex-shrink-0">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500/80 shadow-md bg-stone-950"
              />
            ) : (
              <span className="text-4xl p-2 bg-stone-950 rounded-xl border border-stone-800 shadow-inner block">
                {character.avatar}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsEditingPortrait(true)}
              className="absolute -bottom-1 -right-1 p-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full shadow cursor-pointer transition-transform hover:scale-110"
              title="Edit Hero Profile Picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                {character.playerName}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingPortrait(true)}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Edit Picture</span>
              </button>
            </div>
            <h3 className="text-2xl font-serif font-bold text-amber-100">
              {character.name}
            </h3>
            <p className="text-xs text-stone-300">
              Level {character.level} {character.race} {character.characterClass} •{' '}
              <span className="font-mono text-amber-400">
                {character.gender === 'Male'
                  ? 'he/him'
                  : character.gender === 'Female'
                  ? 'she/her'
                  : 'they/them'}
              </span>
            </p>
          </div>
        </div>

        {/* Experience (XP) & Level Progression Section */}
        <div className="bg-gradient-to-br from-amber-950/30 via-stone-950 to-stone-950 p-4 rounded-xl border border-amber-600/50 shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider">
                Experience & Level Progression
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-stone-900/90 px-2 py-0.5 rounded border border-amber-700/60">
                Level {currentLevel}
              </span>
              <button
                type="button"
                onClick={() => setIsLevelUpOpen(true)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  xpInfo.canLevelUp
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-lg shadow-amber-500/30 animate-pulse border border-amber-300'
                    : 'bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-700/60'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>{xpInfo.canLevelUp ? 'Level Up Ready!' : 'Advance Level'}</span>
              </button>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-stone-300">
                Current XP: <strong className="text-amber-300">{currentXp.toLocaleString()} XP</strong>
              </span>
              <span className="text-stone-400">
                {currentLevel < 20 ? (
                  <>
                    Next Level: <strong className="text-stone-200">{xpInfo.nextLevelTarget.toLocaleString()} XP</strong>{' '}
                    ({xpInfo.xpToNextLevel > 0 ? `${xpInfo.xpToNextLevel.toLocaleString()} to go` : 'Goal reached!'})
                  </>
                ) : (
                  <span className="text-amber-400 font-bold">Max Level 20 Legend</span>
                )}
              </span>
            </div>

            <div className="w-full bg-stone-900 h-2.5 rounded-full overflow-hidden border border-amber-900/50 p-[1px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-500 shadow-sm"
                style={{ width: `${xpInfo.percent}%` }}
              />
            </div>
          </div>

          {/* Award XP Quick Buttons */}
          <div className="pt-2 border-t border-stone-900/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Award Quest / Combat XP:
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustomXp(!isAddingCustomXp)}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
              >
                {isAddingCustomXp ? 'Cancel Custom' : 'Custom Amount'}
              </button>
            </div>

            {isAddingCustomXp ? (
              <form onSubmit={handleCustomXpSubmit} className="flex gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={customXpInput}
                  onChange={(e) => setCustomXpInput(e.target.value)}
                  placeholder="Enter XP amount..."
                  className="flex-1 bg-stone-900 border border-amber-700/60 rounded-lg px-2.5 py-1 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg cursor-pointer transition-colors"
                >
                  Grant XP
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAddXp(amt)}
                    className="px-2 py-1 rounded-md bg-stone-900 hover:bg-stone-800 border border-amber-900/50 hover:border-amber-500 text-amber-300 font-mono text-xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-amber-400" />
                    <span>{amt} XP</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsLevelUpOpen(true)}
                  className="px-2.5 py-1 rounded-md bg-amber-950/80 hover:bg-amber-900 border border-amber-600 text-amber-200 text-xs font-bold font-serif ml-auto cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Level Up Wizard</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Spell Slots Management Section */}
        <div className="bg-stone-950 p-4 rounded-xl border border-purple-900/60 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-serif font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-purple-400" /> Spell Slots & Arcane Power
            </h4>
            <span className="text-[10px] text-purple-300 font-mono font-bold">
              {isCaster ? `${character.spellSlots} / ${character.maxSpellSlots} Available` : 'Martial Class'}
            </span>
          </div>

          {isCaster && character.maxSpellSlots > 0 ? (
            <div>
              <p className="text-[11px] text-stone-400 mb-3">
                {getCasterTraditionText(character.characterClass)}
              </p>

              {/* Visual Orb Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 bg-stone-900/80 p-3 rounded-xl border border-purple-900/40 mb-3">
                {Array.from({ length: character.maxSpellSlots }).map((_, i) => {
                  const isAvailable = i < character.spellSlots;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
                        isAvailable
                          ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-md shadow-purple-900/50'
                          : 'bg-stone-950/80 border-stone-800 text-stone-600 opacity-60'
                      }`}
                    >
                      <Zap
                        className={`w-3.5 h-3.5 ${
                          isAvailable ? 'text-purple-300 animate-pulse' : 'text-stone-600'
                        }`}
                      />
                      <span>Slot {i + 1}: {isAvailable ? 'Ready' : 'Spent'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Spell Slot Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSpellSlots && onUpdateSpellSlots(character.id, 'spend')}
                  disabled={character.spellSlots <= 0}
                  className="px-2 py-1.5 rounded-lg bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Spend Slot</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSpellSlots && onUpdateSpellSlots(character.id, 'restore')}
                  disabled={character.spellSlots >= character.maxSpellSlots}
                  className="px-2 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restore 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSpellSlots && onUpdateSpellSlots(character.id, 'rest')}
                  className="px-2 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Long Rest</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">
              ⚔️ Martial Discipline: {character.characterClass} relies on physical strikes, armor, and battle tactics rather than spell slots.
            </p>
          )}
        </div>

        {/* Temporary Status Effects Section */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" /> Active Status Effects
            </h4>
            <span className="text-[10px] text-stone-400 font-mono">
              Click to toggle effect
            </span>
          </div>

          {activeEffects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {activeEffects.map((eff) => {
                const config = STATUS_EFFECTS_CONFIG[eff];
                return (
                  <div
                    key={eff}
                    className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                      config
                        ? `${config.bgClass} ${config.textClass} ${config.borderClass}`
                        : 'bg-stone-900 text-stone-200 border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusEffectIcon(eff)}
                      <div>
                        <div className="font-bold">{eff}</div>
                        <div className="text-[10px] opacity-80 leading-tight">
                          {config?.description}
                        </div>
                      </div>
                    </div>
                    {onToggleStatusEffect && (
                      <button
                        onClick={() => onToggleStatusEffect(character.id, eff)}
                        className="p-1 hover:bg-stone-800/60 rounded text-stone-400 hover:text-red-400 transition-colors cursor-pointer ml-1"
                        title={`Remove ${eff}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic mb-3">
              No active status conditions. Hero is healthy and unburdened.
            </p>
          )}

          {/* Status Effect Toggle Chips */}
          <div className="pt-2 border-t border-stone-900">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
              Grant / Inflict Status Effect:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUS_EFFECTS.map((eff) => {
                const isActive = activeEffects.includes(eff);
                return (
                  <button
                    key={eff}
                    type="button"
                    onClick={() => onToggleStatusEffect && onToggleStatusEffect(character.id, eff)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-md scale-105'
                        : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700 hover:text-white'
                    }`}
                  >
                    {getStatusEffectIcon(eff)}
                    {eff}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Combat Gauges */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              Hit Points
            </span>
            <span className="text-base font-bold font-mono text-emerald-400">
              {character.hp} / {character.maxHp}
            </span>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              Armor Class
            </span>
            <span className="text-base font-bold font-mono text-amber-400">
              {character.ac} AC
            </span>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <span className="text-[10px] text-stone-400 uppercase font-bold block">
              Spell Slots
            </span>
            <span className="text-base font-bold font-mono text-purple-400">
              {character.spellSlots} / {character.maxSpellSlots}
            </span>
          </div>
        </div>

        {/* D&D 5E Ability Scores */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider mb-3">
            Ability Scores & Modifiers
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            {Object.entries(character.stats).map(([stat, val]) => {
              const numVal = typeof val === 'number' ? val : Number(val) || 10;
              const mod = getStatModifier(numVal);
              return (
                <div key={stat} className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">
                    {stat}
                  </span>
                  <span className="text-lg font-bold font-serif text-amber-100">
                    {numVal}
                  </span>
                  <span className="text-xs font-mono text-amber-400 block font-bold">
                    {formatModifier(mod)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Class Features & Learned Skills */}
        {character.features && character.features.length > 0 && (
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
            <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-amber-400" /> Class Features & Learned Skills
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {character.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-800/60 text-amber-200 font-serif flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {feat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Equipment & Inventory */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-amber-400" /> Equipment & Inventory
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {character.inventory.map((item, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-stone-300 font-mono"
              >
                🎒 {item}
              </span>
            ))}
          </div>
        </div>

        {/* Backstory */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Scroll className="w-4 h-4 text-amber-400" /> Hero Backstory
          </h4>
          <p className="text-xs text-stone-300 leading-relaxed italic">
            "{character.backstory}"
          </p>
        </div>
      </div>

      {/* Portrait Editor Modal */}
      <PortraitEditorModal
        character={character}
        isOpen={isEditingPortrait}
        onClose={() => setIsEditingPortrait(false)}
        onSavePortrait={(id, newUrl) => {
          if (onUpdatePortrait) {
            onUpdatePortrait(id, newUrl);
          }
        }}
      />

      {/* Level Up Wizard Modal */}
      <LevelUpModal
        character={character}
        isOpen={isLevelUpOpen}
        onClose={() => setIsLevelUpOpen(false)}
        onConfirmLevelUp={(updatedChar) => {
          setIsLevelUpOpen(false);
          if (onUpdateCharacter) {
            onUpdateCharacter(updatedChar);
          }
        }}
        worldName={worldName}
        settingName={settingName}
        recentNarrative={recentNarrative}
      />
    </div>
  );
};

