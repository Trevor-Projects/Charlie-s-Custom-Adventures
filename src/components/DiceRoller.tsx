import React, { useState, useEffect, useMemo } from 'react';
import { Character, ChoiceOption, DiceRoll, DiceRollHistoryItem } from '../types';
import { getStatModifier, formatModifier } from '../data/presets';
import { soundManager } from '../utils/audio';
import {
  Dices,
  Sparkles,
  Check,
  X,
  ShieldAlert,
  Flame,
  Shield,
  Palette,
  RotateCcw,
  Zap,
  HelpCircle,
  Eye,
  Award,
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  ChevronRight,
  ChevronDown,
  Activity,
  Percent,
} from 'lucide-react';

interface DiceRollerProps {
  choice: ChoiceOption;
  character: Character;
  onRollComplete: (rollResult: DiceRoll) => void;
  onCancel: () => void;
}

type DiceSkin = 'obsidian' | 'dragon' | 'celestial' | 'emerald' | 'ivory';

interface SkinConfig {
  id: DiceSkin;
  name: string;
  gradient: string;
  border: string;
  textColor: string;
  glow: string;
  facetBg: string;
}

const DICE_SKINS: Record<DiceSkin, SkinConfig> = {
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian & Gold',
    gradient: 'from-stone-900 via-neutral-900 to-amber-950',
    border: 'border-amber-400',
    textColor: 'text-amber-300',
    glow: 'shadow-amber-500/30',
    facetBg: 'bg-gradient-to-br from-neutral-800 to-amber-950',
  },
  dragon: {
    id: 'dragon',
    name: 'Crimson Dragon',
    gradient: 'from-red-950 via-rose-900 to-amber-900',
    border: 'border-amber-400',
    textColor: 'text-amber-200',
    glow: 'shadow-rose-600/40',
    facetBg: 'bg-gradient-to-br from-rose-950 to-amber-950',
  },
  celestial: {
    id: 'celestial',
    name: 'Celestial Lapis',
    gradient: 'from-blue-950 via-indigo-900 to-cyan-950',
    border: 'border-cyan-300',
    textColor: 'text-cyan-200',
    glow: 'shadow-cyan-500/30',
    facetBg: 'bg-gradient-to-br from-indigo-950 to-cyan-950',
  },
  emerald: {
    id: 'emerald',
    name: 'Elfwood Jade',
    gradient: 'from-emerald-950 via-teal-900 to-green-950',
    border: 'border-emerald-300',
    textColor: 'text-emerald-200',
    glow: 'shadow-emerald-500/30',
    facetBg: 'bg-gradient-to-br from-emerald-950 to-teal-950',
  },
  ivory: {
    id: 'ivory',
    name: 'Ancient Ivory',
    gradient: 'from-amber-100 via-stone-200 to-amber-200',
    border: 'border-amber-700',
    textColor: 'text-amber-950',
    glow: 'shadow-amber-400/20',
    facetBg: 'bg-gradient-to-br from-stone-100 to-amber-200',
  },
};

const HISTORY_STORAGE_KEY = 'dnd_dice_session_history_v1';

export const DiceRoller: React.FC<DiceRollerProps> = ({
  choice,
  character,
  onRollComplete,
  onCancel,
}) => {
  const [advantage, setAdvantage] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');
  const [isRolling, setIsRolling] = useState(false);
  const [rollStage, setRollStage] = useState<'IDLE' | 'ROLLING' | 'LANDED' | 'REVEALED'>('IDLE');
  const [selectedSkin, setSelectedSkin] = useState<DiceSkin>('obsidian');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(true);

  // Roll History State
  const [rollHistory, setRollHistory] = useState<DiceRollHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse roll history from storage', e);
      }
    }
    return [];
  });

  // Single or dual dice values
  const [displayValue1, setDisplayValue1] = useState<number>(20);
  const [displayValue2, setDisplayValue2] = useState<number>(15);
  const [finalD20_1, setFinalD20_1] = useState<number | null>(null);
  const [finalD20_2, setFinalD20_2] = useState<number | null>(null);
  const [selectedDieIndex, setSelectedDieIndex] = useState<1 | 2>(1);

  // Impact shockwave state
  const [showImpactRipple, setShowImpactRipple] = useState<boolean>(false);
  const [finalResult, setFinalResult] = useState<DiceRoll | null>(null);

  // Persist history changes
  const saveHistoryToStorage = (updatedHistory: DiceRollHistoryItem[]) => {
    setRollHistory(updatedHistory);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn('Could not save roll history', e);
    }
  };

  const handleClearHistory = () => {
    soundManager.playPageTurn();
    saveHistoryToStorage([]);
  };

  // Determine applicable stat value
  const statKey = (choice.statReq || 'str') as keyof typeof character.stats;
  const statVal = character.stats[statKey] || 10;
  const modifier = getStatModifier(statVal);

  const skin = DICE_SKINS[selectedSkin];

  // Calculate Luck Trend Analytics
  const trendStats = useMemo(() => {
    if (rollHistory.length === 0) return null;

    const totalCount = rollHistory.length;
    const sumD20 = rollHistory.reduce((acc, curr) => acc + curr.d20, 0);
    const avgD20 = (sumD20 / totalCount).toFixed(1);
    const successes = rollHistory.filter((r) => r.isSuccess).length;
    const successRate = Math.round((successes / totalCount) * 100);
    const crits = rollHistory.filter((r) => r.isCrit).length;
    const fumbles = rollHistory.filter((r) => r.isFail).length;

    // Calculate current streak (from latest item backward)
    let currentStreak = 0;
    let isStreakWin = rollHistory[0]?.isSuccess ?? false;
    for (const roll of rollHistory) {
      if (roll.isSuccess === isStreakWin) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalCount,
      avgD20: Number(avgD20),
      successRate,
      crits,
      fumbles,
      currentStreak,
      isStreakWin,
    };
  }, [rollHistory]);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setRollStage('ROLLING');
    setShowImpactRipple(false);
    setFinalResult(null);
    setFinalD20_1(null);
    setFinalD20_2(null);

    soundManager.playDiceRoll();

    // Prepare true values
    const d20_1 = Math.floor(Math.random() * 20) + 1;
    const d20_2 = Math.floor(Math.random() * 20) + 1;

    let chosenD20 = d20_1;
    let chosenIndex: 1 | 2 = 1;

    if (advantage === 'advantage') {
      if (d20_2 > d20_1) {
        chosenD20 = d20_2;
        chosenIndex = 2;
      } else {
        chosenD20 = d20_1;
        chosenIndex = 1;
      }
    } else if (advantage === 'disadvantage') {
      if (d20_2 < d20_1) {
        chosenD20 = d20_2;
        chosenIndex = 2;
      } else {
        chosenD20 = d20_1;
        chosenIndex = 1;
      }
    }

    // High speed number flashing while 3D tumbling in mid-air
    const interval = setInterval(() => {
      setDisplayValue1(Math.floor(Math.random() * 20) + 1);
      setDisplayValue2(Math.floor(Math.random() * 20) + 1);
    }, 65);

    // Landing sequence timing (1.35s matches 3D tumble keyframe apex & impact)
    setTimeout(() => {
      clearInterval(interval);
      setDisplayValue1(d20_1);
      setDisplayValue2(d20_2);
      setFinalD20_1(d20_1);
      setFinalD20_2(d20_2);
      setSelectedDieIndex(chosenIndex);
      setRollStage('LANDED');
      setShowImpactRipple(true);

      // Play impact felt landing audio
      soundManager.playDiceLanding();

      // Reveal resolution and victory/fail sounds
      setTimeout(() => {
        setRollStage('REVEALED');
        setIsRolling(false);

        const total = chosenD20 + modifier;
        const isSuccess = total >= choice.dc || chosenD20 === 20;
        const isCrit = chosenD20 === 20;
        const isFail = chosenD20 === 1;

        if (isCrit) {
          soundManager.playCriticalSuccess();
        } else if (isFail) {
          soundManager.playCriticalFailure();
        } else if (isSuccess) {
          soundManager.playSuccess();
        } else {
          soundManager.playFail();
        }

        const timestampStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        const result: DiceRoll = {
          stat: choice.statReq || 'str',
          skill: choice.skillName || 'Ability Check',
          d20: chosenD20,
          modifier,
          total,
          dc: choice.dc,
          isSuccess,
          isCrit,
          isFail,
          timestamp: timestampStr,
          characterName: character.name,
          advantageMode: advantage,
          rawRolls: advantage !== 'normal' ? [d20_1, d20_2] : [chosenD20],
          id: `roll-${Date.now()}`,
        };

        setFinalResult(result);

        // Append to History Log (most recent first, up to 40 entries)
        const historyEntry: DiceRollHistoryItem = {
          ...result,
          id: `roll-${Date.now()}`,
          timestamp: timestampStr,
          characterName: character.name,
        };

        saveHistoryToStorage([historyEntry, ...rollHistory.slice(0, 39)]);
      }, 350);
    }, 1350);
  };

  const handleConfirm = () => {
    if (finalResult) {
      onRollComplete(finalResult);
    }
  };

  // Render a 3D Faceted D20 Die Component
  const render3DDie = (
    dieNumber: number,
    value: number,
    isSecondary: boolean = false,
    isSelected: boolean = true
  ) => {
    const isThisChosen = isSecondary ? selectedDieIndex === 2 : selectedDieIndex === 1;
    const isDropped = rollStage === 'REVEALED' && advantage !== 'normal' && !isThisChosen;
    const isCrit = rollStage === 'REVEALED' && isThisChosen && value === 20;
    const isFumble = rollStage === 'REVEALED' && isThisChosen && value === 1;

    return (
      <div className="flex flex-col items-center relative preserve-3d">
        {/* Die Header Label for Dual Rolls */}
        {advantage !== 'normal' && (
          <div className="mb-2 text-center">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isDropped
                  ? 'bg-stone-900/60 text-stone-500 border-stone-800 line-through'
                  : isThisChosen && rollStage === 'REVEALED'
                  ? advantage === 'advantage'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-red-950 text-red-300 border-red-500'
                  : 'bg-stone-950 text-stone-300 border-stone-800'
              }`}
            >
              Die #{dieNumber} {rollStage === 'REVEALED' && (isThisChosen ? '★ Chosen' : '✕ Dropped')}
            </span>
          </div>
        )}

        {/* 3D Rolling Polyhedral Body Container */}
        <div
          onClick={!finalResult && !isRolling ? handleRoll : undefined}
          className={`relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center cursor-pointer preserve-3d select-none transition-all duration-300 ${
            isRolling
              ? isSecondary
                ? 'animate-dice-roll-secondary'
                : 'animate-dice-roll'
              : 'hover:scale-105'
          } ${isDropped ? 'opacity-40 grayscale scale-90' : 'opacity-100'} ${
            isCrit ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-stone-950' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Outer Ambient Glow Aura */}
          <div
            className={`absolute inset-0 rounded-full blur-xl opacity-60 transition-opacity ${
              isCrit
                ? 'bg-amber-400 opacity-90 animate-pulse'
                : isFumble
                ? 'bg-red-600 opacity-75'
                : skin.glow
            }`}
          />

          {/* Polyhedral 20-Sided Icosahedron Die Shell */}
          <div
            className={`w-full h-full rounded-2xl bg-gradient-to-br ${skin.gradient} border-2 ${
              isCrit
                ? 'border-amber-300 shadow-amber-400/80 shadow-2xl'
                : isFumble
                ? 'border-red-500 shadow-red-600/60'
                : skin.border
            } shadow-2xl flex items-center justify-center relative overflow-hidden preserve-3d`}
            style={{
              clipPath:
                'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
            }}
          >
            {/* Triangular & Hexagonal Facet Bevel Highlights */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/25 pointer-events-none" />

            {/* Specular Facet Shimmer Sweep */}
            <div className="absolute inset-0 sheen-glow bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none opacity-40" />

            {/* Facet Geometry Inscribed Lines */}
            <div
              className="absolute inset-2 border border-amber-400/30 pointer-events-none"
              style={{
                clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
              }}
            />
            <div className="absolute w-full h-[1px] bg-amber-400/25 top-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-amber-400/25 left-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Die Value Centerpiece */}
            <div className="text-center relative z-10">
              <span
                className={`text-3xl sm:text-4xl font-serif font-black tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
                  isCrit
                    ? 'text-amber-200 animate-bounce'
                    : isFumble
                    ? 'text-red-400 animate-pulse'
                    : skin.textColor
                }`}
              >
                {value}
              </span>
              <span className="block text-[8px] sm:text-[9px] font-mono uppercase tracking-widest text-amber-400/80 mt-0.5">
                {value === 20 ? 'NAT 20' : value === 1 ? 'NAT 1' : 'd20'}
              </span>
            </div>

            {/* Critical Radiance Sparks */}
            {isCrit && (
              <div className="absolute inset-0 animate-crit-radiance flex items-center justify-center pointer-events-none">
                <Sparkles className="w-14 h-14 text-amber-300/40" />
              </div>
            )}
          </div>

          {/* Tray Ground Contact Shadow & 3D Depth */}
          <div
            className={`absolute -bottom-4 w-16 sm:w-20 h-4 bg-black/60 rounded-full blur-md transition-all ${
              isRolling ? 'scale-50 opacity-20' : 'scale-100 opacity-80'
            }`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-amber-800/80 rounded-2xl max-w-4xl w-full shadow-2xl text-stone-100 relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Ribbon */}
        <div className="bg-stone-950 border-b border-amber-800/60 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-950 rounded-lg border border-amber-700/60 text-amber-300">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                D&D 5E Skill Check
              </span>
              <h3 className="text-sm sm:text-base font-serif font-bold text-amber-100">
                {choice.skillName} Check
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target DC and Character Pill */}
            <div className="text-right hidden sm:block">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-stone-900 border border-amber-600/60 text-amber-300 shadow-inner">
                DC {choice.dc}
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {character.name} ({choice.statReq.toUpperCase()} {formatModifier(modifier)})
              </p>
            </div>

            {/* Toggle History Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playPageTurn();
                setIsHistoryOpen(!isHistoryOpen);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-serif font-semibold transition-colors cursor-pointer ${
                isHistoryOpen
                  ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                  : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-amber-700/40'
              }`}
              title="Toggle Roll History & Luck Trends"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">History</span>
              {rollHistory.length > 0 && (
                <span className="bg-amber-600 text-stone-950 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                  {rollHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Dual-Pane Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-stone-800">
          {/* Main 3D Dice Stage (Left Column) */}
          <div className="flex-1 p-4 sm:p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Advantage / Disadvantage Mode Selector */}
              {!finalResult && (
                <div className="flex items-center justify-between gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setAdvantage('normal')}
                    disabled={isRolling}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      advantage === 'normal'
                        ? 'bg-amber-600 text-stone-950 font-bold shadow-md'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Normal (1d20)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvantage('advantage')}
                    disabled={isRolling}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      advantage === 'advantage'
                        ? 'bg-emerald-600 text-stone-950 font-bold shadow-md'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Advantage (2d20 High)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvantage('disadvantage')}
                    disabled={isRolling}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      advantage === 'disadvantage'
                        ? 'bg-rose-600 text-stone-950 font-bold shadow-md'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Disadvantage (2d20 Low)
                  </button>
                </div>
              )}

              {/* 3D Polyhedral Velvet Dice Tray */}
              <div className="relative rounded-2xl bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border-2 border-amber-900/80 p-5 sm:p-6 min-h-48 sm:min-h-52 flex flex-col items-center justify-center overflow-hidden shadow-inner perspective-1200">
                {/* Felt Tray Inset Texture & Corner Accents */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-stone-950/60 to-stone-950 pointer-events-none" />
                <div className="absolute top-2 left-2 text-amber-500/20 font-serif text-lg font-black select-none pointer-events-none">
                  ❖
                </div>
                <div className="absolute top-2 right-2 text-amber-500/20 font-serif text-lg font-black select-none pointer-events-none">
                  ❖
                </div>
                <div className="absolute bottom-2 left-2 text-amber-500/20 font-serif text-lg font-black select-none pointer-events-none">
                  ❖
                </div>
                <div className="absolute bottom-2 right-2 text-amber-500/20 font-serif text-lg font-black select-none pointer-events-none">
                  ❖
                </div>

                {/* Impact Shockwave Ring */}
                {showImpactRipple && (
                  <div className="absolute w-40 h-40 rounded-full border-2 border-amber-400/80 animate-shockwave pointer-events-none" />
                )}

                {/* 3D Dice Display Container */}
                <div className="relative z-10 flex items-center justify-center gap-6 sm:gap-8 w-full">
                  {render3DDie(1, displayValue1, false, selectedDieIndex === 1)}
                  {advantage !== 'normal' &&
                    render3DDie(2, displayValue2, true, selectedDieIndex === 2)}
                </div>

                {/* Interactive Status Cue */}
                {!finalResult && !isRolling && (
                  <p className="text-xs text-amber-400/90 font-serif italic mt-4 animate-pulse relative z-10 text-center">
                    Click dice or press "Toss 3D Die" below to roll!
                  </p>
                )}

                {isRolling && (
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300 mt-4 relative z-10">
                    <Dices className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Rolling fate on the altar...</span>
                  </div>
                )}
              </div>

              {/* Dice Skin Selector Pills */}
              {!finalResult && !isRolling && (
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-amber-400" /> Material:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(Object.keys(DICE_SKINS) as DiceSkin[]).map((skinKey) => (
                      <button
                        key={skinKey}
                        type="button"
                        onClick={() => {
                          setSelectedSkin(skinKey);
                          soundManager.playPageTurn();
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                          selectedSkin === skinKey
                            ? 'bg-amber-600 text-stone-950 font-bold shadow'
                            : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                        }`}
                      >
                        {DICE_SKINS[skinKey].name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Roll Resolution & Breakdown Card */}
              {finalResult && (
                <div
                  className={`p-3.5 rounded-xl border text-center space-y-2 animate-fadeIn shadow-2xl transition-all ${
                    finalResult.isCrit
                      ? 'bg-amber-950/90 border-amber-400 text-amber-100 ring-2 ring-amber-400/50'
                      : finalResult.isSuccess
                      ? 'bg-emerald-950/90 border-emerald-600 text-emerald-100 shadow-emerald-950/50'
                      : 'bg-rose-950/90 border-rose-700 text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 font-serif font-bold text-base sm:text-lg">
                    {finalResult.isCrit ? (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-300 animate-spin [animation-duration:8s]" />
                        <span>CRITICAL SUCCESS! (Natural 20)</span>
                      </>
                    ) : finalResult.isFail ? (
                      <>
                        <Flame className="w-5 h-5 text-rose-400 animate-pulse" />
                        <span>CRITICAL FUMBLE! (Natural 1)</span>
                      </>
                    ) : finalResult.isSuccess ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span>CHECK SUCCEEDED!</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-rose-400" />
                        <span>CHECK FAILED!</span>
                      </>
                    )}
                  </div>

                  {/* Math Breakdown formula pills */}
                  <div className="flex items-center justify-center flex-wrap gap-2 text-xs font-mono">
                    <span className="px-2.5 py-0.5 rounded bg-stone-950/80 border border-amber-800/60 text-amber-200">
                      d20 ({finalResult.d20})
                    </span>
                    <span>+</span>
                    <span className="px-2.5 py-0.5 rounded bg-stone-950/80 border border-amber-800/60 text-amber-200">
                      {choice.statReq.toUpperCase()} ({formatModifier(finalResult.modifier)})
                    </span>
                    <span>=</span>
                    <span className="px-3 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-sm shadow-md">
                      {finalResult.total}
                    </span>
                    <span className="text-stone-300">vs DC {finalResult.dc}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-stone-800/80">
              {!finalResult ? (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={isRolling}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleRoll}
                    disabled={isRolling}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 text-xs font-bold font-serif shadow-lg shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Dices className="w-4 h-4" />
                    <span>{isRolling ? 'Tumbling 3D Dice...' : 'Toss 3D Die'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 text-xs font-bold font-serif transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-600/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Result & Resolve Turn</span>
                </button>
              )}
            </div>
          </div>

          {/* Vertical History & Recent Luck Trends Log (Right Column / Collapsible) */}
          {isHistoryOpen && (
            <div className="w-full md:w-80 bg-stone-950/90 flex flex-col shrink-0 border-t md:border-t-0 md:border-l border-stone-800">
              {/* History Header & Trend Stats Summary */}
              <div className="p-3.5 border-b border-stone-800 bg-stone-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <h4 className="font-serif font-bold text-xs text-amber-200">
                      Recent Luck Trends
                    </h4>
                  </div>
                  {rollHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-[10px] text-stone-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Clear session roll history"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Trend Analytics Badges */}
                {trendStats ? (
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {/* Average d20 Roll */}
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-center">
                      <span className="block text-[9px] font-mono uppercase text-stone-400">
                        Avg d20
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          trendStats.avgD20 >= 11.5
                            ? 'text-emerald-400'
                            : trendStats.avgD20 <= 8.5
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {trendStats.avgD20}
                      </span>
                    </div>

                    {/* Success Rate */}
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-center">
                      <span className="block text-[9px] font-mono uppercase text-stone-400">
                        Win Rate
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          trendStats.successRate >= 60
                            ? 'text-emerald-400'
                            : trendStats.successRate <= 40
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {trendStats.successRate}%
                      </span>
                    </div>

                    {/* Streak / Fortune */}
                    <div className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-center">
                      <span className="block text-[9px] font-mono uppercase text-stone-400">
                        Streak
                      </span>
                      <span
                        className={`text-xs font-mono font-bold flex items-center justify-center gap-0.5 ${
                          trendStats.isStreakWin ? 'text-amber-400' : 'text-rose-400'
                        }`}
                      >
                        {trendStats.isStreakWin ? (
                          <>
                            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {trendStats.currentStreak}W
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                            {trendStats.currentStreak}L
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 font-sans italic text-center py-0.5">
                    Toss the dice to start recording your luck trend ledger.
                  </p>
                )}
              </div>

              {/* Vertical Scrollable Roll History Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-60 sm:max-h-72 md:max-h-[380px]">
                {rollHistory.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 space-y-2">
                    <History className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
                    <p className="text-xs font-serif">No dice rolls logged yet.</p>
                    <p className="text-[10px] font-mono text-stone-600">
                      Recent d20 checks will be tracked here.
                    </p>
                  </div>
                ) : (
                  rollHistory.map((item, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={item.id || `roll-${idx}`}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isLatest
                            ? 'bg-amber-950/40 border-amber-700/60 shadow-md'
                            : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* D20 Badge */}
                            <div
                              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-serif font-black text-xs border ${
                                item.isCrit
                                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md shadow-amber-400/30'
                                  : item.isFail
                                  ? 'bg-rose-950 text-rose-300 border-rose-600'
                                  : item.isSuccess
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                  : 'bg-stone-950 text-stone-400 border-stone-800'
                              }`}
                            >
                              {item.d20}
                            </div>

                            {/* Roll Info */}
                            <div className="min-w-0">
                              <h5 className="font-serif font-bold text-xs text-stone-200 truncate">
                                {item.skill}
                              </h5>
                              <p className="text-[10px] font-mono text-stone-400 truncate">
                                {item.characterName || 'Player'} • {item.stat.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          {/* Outcome Pill */}
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase block ${
                                item.isCrit
                                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                                  : item.isFail
                                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                                  : item.isSuccess
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                  : 'bg-stone-950 text-stone-400 border-stone-800'
                              }`}
                            >
                              {item.isCrit
                                ? 'Nat 20'
                                : item.isFail
                                ? 'Nat 1'
                                : item.isSuccess
                                ? 'Pass'
                                : 'Fail'}
                            </span>
                            <span className="text-[9px] font-mono text-stone-500 mt-0.5 block">
                              {item.timestamp || 'Recent'}
                            </span>
                          </div>
                        </div>

                        {/* Calculation Formula Line */}
                        <div className="mt-1.5 pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[10px] font-mono text-stone-400">
                          <span>
                            {item.d20} + ({formatModifier(item.modifier)}) ={' '}
                            <strong className={item.isSuccess ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.total}
                            </strong>
                          </span>
                          <span className="text-stone-500">Target DC {item.dc}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* History Footer Counter */}
              {rollHistory.length > 0 && (
                <div className="p-2 border-t border-stone-800 bg-stone-950 text-center text-[10px] font-mono text-stone-500">
                  Total Session Rolls: <strong className="text-amber-400">{rollHistory.length}</strong> • Crits: <strong className="text-amber-300">{trendStats?.crits || 0}</strong> • Fumbles: <strong className="text-rose-400">{trendStats?.fumbles || 0}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
