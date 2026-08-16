import React, { useState, useEffect } from 'react';
import { Character, Stats, LevelUpSuggestionsData, LevelUpFeatureSuggestion, LevelUpAsiSuggestion } from '../types';
import {
  HIT_DICE_BY_CLASS,
  getSpellSlotsForClass,
  getStatModifier,
  formatModifier,
  SPELLCASTING_CLASSES,
} from '../data/presets';
import { soundManager } from '../utils/audio';
import {
  Sparkles,
  Shield,
  Heart,
  Wand2,
  Zap,
  ArrowUpCircle,
  CheckCircle2,
  Dice5,
  X,
  ChevronRight,
  Plus,
  Minus,
  BookOpen,
  Award,
  Swords,
  Flame,
  Check,
} from 'lucide-react';

interface LevelUpModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmLevelUp: (updatedCharacter: Character) => void;
  worldName?: string;
  settingName?: string;
  recentNarrative?: string;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  character,
  isOpen,
  onClose,
  onConfirmLevelUp,
  worldName,
  settingName,
  recentNarrative,
}) => {
  if (!isOpen || !character) return null;

  const currentLevel = character.level || 1;
  const targetLevel = currentLevel + 1;
  const hitDieInfo = HIT_DICE_BY_CLASS[character.characterClass] || { die: 'd8', dieValue: 8, avgRoll: 5 };
  const conMod = getStatModifier(character.stats?.con || 10);

  // States for Level-Up decisions
  const [hpMethod, setHpMethod] = useState<'average' | 'roll'>('average');
  const [rolledHp, setRolledHp] = useState<number | null>(null);
  const [isRollingDie, setIsRollingDie] = useState(false);

  // Stat increases
  const [statPointsRemaining, setStatPointsRemaining] = useState<number>(2);
  const [allocatedStats, setAllocatedStats] = useState<Partial<Record<keyof Stats, number>>>({});

  // Selected new features/skills
  const [selectedFeatures, setSelectedFeatures] = useState<LevelUpFeatureSuggestion[]>([]);
  const [customFeatureInput, setCustomFeatureInput] = useState('');

  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<LevelUpSuggestionsData | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Calculate HP gain
  const averageHpGain = Math.max(1, hitDieInfo.avgRoll + conMod);
  const hpGain = hpMethod === 'average' ? averageHpGain : Math.max(1, (rolledHp || hitDieInfo.avgRoll) + conMod);
  const newMaxHp = character.maxHp + hpGain;
  const newCurrentHp = character.hp + hpGain;

  // Calculate new spell slots
  const isCaster = character.maxSpellSlots > 0 || SPELLCASTING_CLASSES.includes(character.characterClass);
  const newMaxSpellSlots = isCaster
    ? getSpellSlotsForClass(character.characterClass, targetLevel)
    : 0;

  // Fetch AI suggestions on open if not already fetched
  useEffect(() => {
    if (isOpen && !aiSuggestions && !isLoadingAi) {
      fetchAiSuggestions();
    }
  }, [isOpen]);

  const fetchAiSuggestions = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const response = await fetch('/api/gemini/level-up-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character,
          nextLevel: targetLevel,
          worldName: worldName || 'The Realm',
          settingName: settingName || 'High Fantasy',
          recentNarrative,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate level-up recommendations from Gemini.');
      }

      const data: LevelUpSuggestionsData = await response.json();
      setAiSuggestions(data);

      // Pre-select first 2 suggested features if available
      if (data.newFeatures && data.newFeatures.length > 0) {
        setSelectedFeatures([data.newFeatures[0]]);
      }
    } catch (err: any) {
      console.warn('AI suggestions error:', err);
      setAiError(err.message || 'Could not contact AI DM for advice.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleRollHitDie = () => {
    setIsRollingDie(true);
    soundManager.playDiceRoll();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * hitDieInfo.dieValue) + 1;
      setRolledHp(roll);
      setIsRollingDie(false);
      soundManager.playDiceLanding();
    }, 600);
  };

  const handleAdjustStat = (statKey: keyof Stats, delta: number) => {
    const currentAlloc = allocatedStats[statKey] || 0;
    const newAlloc = currentAlloc + delta;

    if (delta > 0 && statPointsRemaining <= 0) return;
    if (delta < 0 && currentAlloc <= 0) return;

    soundManager.playDiceRoll();
    setAllocatedStats((prev) => ({
      ...prev,
      [statKey]: newAlloc,
    }));
    setStatPointsRemaining((prev) => prev - delta);
  };

  const handleApplyAsiPreset = (asi: LevelUpAsiSuggestion) => {
    soundManager.playSuccess();
    const newAlloc: Partial<Record<keyof Stats, number>> = {};
    let totalPointsUsed = 0;

    Object.entries(asi.statIncreases).forEach(([st, inc]) => {
      if (inc && inc > 0) {
        newAlloc[st as keyof Stats] = inc;
        totalPointsUsed += inc;
      }
    });

    setAllocatedStats(newAlloc);
    setStatPointsRemaining(Math.max(0, 2 - totalPointsUsed));
  };

  const handleToggleFeature = (feat: LevelUpFeatureSuggestion) => {
    soundManager.playPageTurn();
    if (selectedFeatures.some((f) => f.name === feat.name)) {
      setSelectedFeatures(selectedFeatures.filter((f) => f.name !== feat.name));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  const handleAddCustomFeature = () => {
    if (!customFeatureInput.trim()) return;
    soundManager.playPageTurn();
    const newFeat: LevelUpFeatureSuggestion = {
      name: customFeatureInput.trim(),
      type: 'Feature',
      description: 'Custom martial or arcane prowess acquired through adventure.',
      mechanicalEffect: 'Granted by the Dungeon Master.',
    };
    setSelectedFeatures([...selectedFeatures, newFeat]);
    setCustomFeatureInput('');
  };

  const handleCompleteLevelUp = () => {
    soundManager.playLevelUp();

    // Compute updated stats
    const updatedStats: Stats = { ...character.stats };
    (Object.entries(allocatedStats) as [keyof Stats, number][]).forEach(([key, inc]) => {
      if (inc > 0) {
        const cur = Number(updatedStats[key]) || 10;
        updatedStats[key] = cur + inc;
      }
    });

    // Compile new feature names
    const existingFeatures = character.features || [`${character.characterClass} Training`];
    const newFeatureNames = selectedFeatures.map((f) => `${f.name} (${f.type})`);
    const mergedFeatures = Array.from(new Set([...existingFeatures, ...newFeatureNames]));

    const updatedChar: Character = {
      ...character,
      level: targetLevel,
      hp: newCurrentHp,
      maxHp: newMaxHp,
      stats: updatedStats,
      features: mergedFeatures,
      spellSlots: isCaster ? Math.max(character.spellSlots, newMaxSpellSlots) : character.spellSlots,
      maxSpellSlots: isCaster ? newMaxSpellSlots : character.maxSpellSlots,
      status: 'Healthy & Empowered',
    };

    onConfirmLevelUp(updatedChar);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border-2 border-amber-600/70 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-stone-100 space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-amber-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Level-Up Fanfare Banner */}
        <div className="flex items-center gap-4 border-b border-amber-900/60 pb-4">
          <div className="relative">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400 shadow-lg bg-stone-950"
              />
            ) : (
              <span className="text-4xl p-2 bg-stone-950 rounded-xl border border-stone-800 shadow-inner block">
                {character.avatar}
              </span>
            )}
            <span className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-mono font-bold text-xs rounded-full shadow-md border border-amber-300">
              Lv {targetLevel}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400 animate-bounce" /> Level Advancement
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600 text-amber-300 font-serif">
                D&D 5th Edition
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-amber-100 flex items-center gap-2">
              Level Up: {character.name}
            </h2>
            <p className="text-xs text-stone-300">
              Advancing from <span className="text-amber-400 font-bold">Level {currentLevel}</span> ➔{' '}
              <span className="text-emerald-400 font-bold">Level {targetLevel}</span> ({character.race}{' '}
              {character.characterClass})
            </p>
          </div>
        </div>

        {/* AI Level-Up Advisor Section */}
        <div className="bg-gradient-to-br from-amber-950/40 via-stone-950 to-stone-950 p-4 rounded-xl border border-amber-500/50 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 className="text-sm font-serif font-bold text-amber-200 uppercase tracking-wider">
                Gemini AI Dungeon Master Advisor
              </h3>
            </div>
            <button
              type="button"
              onClick={fetchAiSuggestions}
              disabled={isLoadingAi}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isLoadingAi ? 'Consulting DM...' : 'Regenerate Build Ideas'}</span>
            </button>
          </div>

          {isLoadingAi ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-amber-300/90 font-mono animate-pulse">
                Consulting the ancient scrolls & analyzing {character.name}'s martial feats...
              </p>
            </div>
          ) : aiError ? (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center justify-between">
              <span>{aiError}</span>
              <button
                onClick={fetchAiSuggestions}
                className="underline hover:text-red-100 ml-2 font-mono"
              >
                Retry
              </button>
            </div>
          ) : aiSuggestions ? (
            <div className="space-y-2.5">
              <p className="text-xs text-amber-100/90 italic leading-relaxed bg-stone-900/80 p-2.5 rounded-lg border border-amber-900/40">
                "{aiSuggestions.flavorNarrative}"
              </p>
              {aiSuggestions.nextMilestoneSummary && (
                <div className="text-[11px] text-stone-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong className="text-amber-300">Campaign Directive:</strong>{' '}
                    {aiSuggestions.nextMilestoneSummary}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-center">
              <button
                type="button"
                onClick={fetchAiSuggestions}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center gap-1.5 mx-auto cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Level-Up Build Suggestions</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 1: Hit Points Increase */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-400" /> Step 1: Hit Points Increase
            </h4>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              +{hpGain} HP ➔ {newMaxHp} Max HP
            </span>
          </div>

          <p className="text-xs text-stone-400">
            {character.characterClass} Hit Die:{' '}
            <strong className="text-stone-200">1{hitDieInfo.die}</strong> + CON Modifier (
            <strong className="text-amber-300">{formatModifier(conMod)}</strong>).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Average option */}
            <button
              type="button"
              onClick={() => {
                soundManager.playDiceLanding();
                setHpMethod('average');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                hpMethod === 'average'
                  ? 'bg-amber-950/60 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/50'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-serif">Take Fixed Average</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  +{averageHpGain} HP
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Safe & reliable standard progression ({hitDieInfo.avgRoll} avg + {conMod} CON).
              </p>
            </button>

            {/* Roll option */}
            <div
              className={`p-3 rounded-xl border text-left transition-all ${
                hpMethod === 'roll'
                  ? 'bg-amber-950/60 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/50'
                  : 'bg-stone-900 border-stone-800 text-stone-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-serif">Roll 1{hitDieInfo.die}</span>
                <button
                  type="button"
                  onClick={() => {
                    setHpMethod('roll');
                    handleRollHitDie();
                  }}
                  disabled={isRollingDie}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                >
                  <Dice5 className={`w-3.5 h-3.5 ${isRollingDie ? 'animate-spin' : ''}`} />
                  <span>{rolledHp ? `Rolled: ${rolledHp}` : 'Roll Die'}</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-400">
                {rolledHp !== null
                  ? `Roll (${rolledHp}) + CON (${conMod}) = +${Math.max(1, rolledHp + conMod)} HP gained.`
                  : 'Test your fate by rolling your hit die for maximum potential.'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Ability Score Improvements (ASI) */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" /> Step 2: Ability Score Improvements (ASI)
            </h4>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                statPointsRemaining === 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
              }`}
            >
              {statPointsRemaining} Stat Point{statPointsRemaining === 1 ? '' : 's'} Remaining
            </span>
          </div>

          {/* AI Recommended ASI Presets */}
          {aiSuggestions?.asiRecommendations && aiSuggestions.asiRecommendations.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                ✨ AI Recommended Stat Builds (1-Click Apply):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiSuggestions.asiRecommendations.map((asi, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyAsiPreset(asi)}
                    className="p-2.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-amber-900/40 hover:border-amber-500 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100">
                        {asi.name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 uppercase">Apply</span>
                    </div>
                    <p className="text-[10px] text-stone-400 leading-tight">{asi.reasoning}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Stat Allocator Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
            {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as (keyof Stats)[]).map((statKey) => {
              const baseVal = character.stats?.[statKey] || 10;
              const added = allocatedStats[statKey] || 0;
              const totalVal = baseVal + added;
              const mod = getStatModifier(totalVal);

              return (
                <div
                  key={statKey}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between ${
                    added > 0
                      ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500/40'
                      : 'bg-stone-900 border-stone-800'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-stone-400">{statKey}</span>
                  <div className="my-1">
                    <span className="text-base font-serif font-bold text-amber-100">{totalVal}</span>
                    <span className="text-[10px] font-mono text-amber-400 block font-bold">
                      {formatModifier(mod)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustStat(statKey, -1)}
                      disabled={added <= 0}
                      className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30 text-xs flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono font-bold w-4 text-center text-amber-300">
                      {added > 0 ? `+${added}` : '-'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustStat(statKey, 1)}
                      disabled={statPointsRemaining <= 0}
                      className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 disabled:opacity-30 text-xs flex items-center justify-center font-bold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: New Class Features, Spells & Feats */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-amber-400" /> Step 3: Class Features, Spells & Skills
            </h4>
            <span className="text-[10px] text-stone-400 font-mono">
              {selectedFeatures.length} Feature{selectedFeatures.length === 1 ? '' : 's'} Selected
            </span>
          </div>

          {/* AI Feature Suggestions List */}
          {aiSuggestions?.newFeatures && aiSuggestions.newFeatures.length > 0 ? (
            <div className="space-y-2">
              {aiSuggestions.newFeatures.map((feat, idx) => {
                const isSelected = selectedFeatures.some((f) => f.name === feat.name);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleFeature(feat)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-amber-950/50 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'border-stone-700 bg-stone-950'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold font-serif text-amber-200">{feat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 font-mono">
                          {feat.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-300 mb-1">{feat.description}</p>
                      <div className="text-[10px] text-amber-300/80 font-mono bg-stone-950/60 px-2 py-1 rounded border border-amber-950/40">
                        ⚡ <strong>Rule:</strong> {feat.mechanicalEffect}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">
              Loading tailored class features and signature skill options...
            </p>
          )}

          {/* Add Custom Skill / Feature input */}
          <div className="pt-2 border-t border-stone-900 flex gap-2">
            <input
              type="text"
              value={customFeatureInput}
              onChange={(e) => setCustomFeatureInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomFeature()}
              placeholder="Add custom skill, spell, or perk (e.g. Shield Master)..."
              className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCustomFeature}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Caster Spell Slots Preview */}
        {isCaster && (
          <div className="bg-stone-950 p-3 rounded-xl border border-purple-900/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-serif">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <span>Arcane Slot Pool Advancement</span>
            </div>
            <span className="font-mono font-bold text-purple-200">
              {character.maxSpellSlots} ➔ {newMaxSpellSlots} Maximum Spell Slots
            </span>
          </div>
        )}

        {/* Confirmation & Completion Footer */}
        <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCompleteLevelUp}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-serif font-bold text-sm shadow-xl shadow-amber-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm & Complete Level Up to Level {targetLevel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
