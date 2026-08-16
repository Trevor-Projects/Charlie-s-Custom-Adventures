import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Sparkles,
  Info,
  Bot,
  Biohazard,
  Zap,
  Sun,
  EyeOff,
  AlertTriangle,
  Lock,
  Gauge,
  ShieldCheck,
  Activity,
  Flame,
  HelpCircle,
  Award,
} from 'lucide-react';
import { Character, StatusEffectType } from '../types';
import { formatModifier, getStatModifier, STATUS_EFFECTS_CONFIG, getXpProgressInfo } from '../data/presets';

interface PartyBarProps {
  party: Character[];
  activePlayerIndex: number;
  onSelectCharacter: (character: Character) => void;
}

export const getStatusEffectIcon = (effect: string, className = "w-3 h-3") => {
  switch (effect) {
    case 'Poisoned':
      return <Biohazard className={`${className} text-emerald-400`} />;
    case 'Stunned':
      return <Zap className={`${className} text-yellow-400`} />;
    case 'Inspired':
      return <Sparkles className={`${className} text-amber-300`} />;
    case 'Blessed':
      return <Sun className={`${className} text-cyan-300`} />;
    case 'Charmed':
      return <Heart className={`${className} text-rose-400`} />;
    case 'Blinded':
      return <EyeOff className={`${className} text-purple-400`} />;
    case 'Frightened':
      return <AlertTriangle className={`${className} text-violet-400`} />;
    case 'Restrained':
      return <Lock className={`${className} text-orange-400`} />;
    case 'Hasted':
      return <Gauge className={`${className} text-teal-300`} />;
    case 'Shielded':
      return <ShieldCheck className={`${className} text-blue-400`} />;
    default:
      return <Activity className={`${className} text-amber-400`} />;
  }
};

export const getStatusBadgeStyle = (effect: string) => {
  switch (effect) {
    case 'Poisoned':
      return {
        bg: 'bg-emerald-950/90',
        text: 'text-emerald-300',
        border: 'border-emerald-600/90',
        glow: 'shadow-emerald-950/60 shadow-md',
        dot: 'bg-emerald-400',
        tag: 'DEBUFF',
      };
    case 'Restrained':
      return {
        bg: 'bg-orange-950/90',
        text: 'text-orange-300',
        border: 'border-orange-600/90',
        glow: 'shadow-orange-950/60 shadow-md',
        dot: 'bg-orange-400',
        tag: 'DEBUFF',
      };
    case 'Stunned':
      return {
        bg: 'bg-yellow-950/90',
        text: 'text-yellow-300',
        border: 'border-yellow-600/90',
        glow: 'shadow-yellow-950/60 shadow-md',
        dot: 'bg-yellow-400',
        tag: 'DEBUFF',
      };
    case 'Blinded':
      return {
        bg: 'bg-stone-900',
        text: 'text-purple-300',
        border: 'border-purple-600/90',
        glow: 'shadow-purple-950/60 shadow-md',
        dot: 'bg-purple-400',
        tag: 'DEBUFF',
      };
    case 'Frightened':
      return {
        bg: 'bg-violet-950/90',
        text: 'text-violet-300',
        border: 'border-violet-600/90',
        glow: 'shadow-violet-950/60 shadow-md',
        dot: 'bg-violet-400',
        tag: 'DEBUFF',
      };
    case 'Charmed':
      return {
        bg: 'bg-rose-950/90',
        text: 'text-rose-300',
        border: 'border-rose-600/90',
        glow: 'shadow-rose-950/60 shadow-md',
        dot: 'bg-rose-400',
        tag: 'DEBUFF',
      };
    case 'Inspired':
      return {
        bg: 'bg-amber-950/90',
        text: 'text-amber-200',
        border: 'border-amber-500/90',
        glow: 'shadow-amber-950/60 shadow-md',
        dot: 'bg-amber-400',
        tag: 'BUFF',
      };
    case 'Blessed':
      return {
        bg: 'bg-cyan-950/90',
        text: 'text-cyan-200',
        border: 'border-cyan-500/90',
        glow: 'shadow-cyan-950/60 shadow-md',
        dot: 'bg-cyan-400',
        tag: 'BUFF',
      };
    case 'Hasted':
      return {
        bg: 'bg-teal-950/90',
        text: 'text-teal-200',
        border: 'border-teal-500/90',
        glow: 'shadow-teal-950/60 shadow-md',
        dot: 'bg-teal-400',
        tag: 'BUFF',
      };
    case 'Shielded':
      return {
        bg: 'bg-blue-950/90',
        text: 'text-blue-200',
        border: 'border-blue-500/90',
        glow: 'shadow-blue-950/60 shadow-md',
        dot: 'bg-blue-400',
        tag: 'BUFF',
      };
    default:
      return {
        bg: 'bg-stone-900',
        text: 'text-stone-300',
        border: 'border-stone-700',
        glow: '',
        dot: 'bg-stone-400',
        tag: 'STATUS',
      };
  }
};

export const PartyBar: React.FC<PartyBarProps> = ({
  party,
  activePlayerIndex,
  onSelectCharacter,
}) => {
  const [hoveredEffect, setHoveredEffect] = useState<{
    charId: string;
    effect: string;
  } | null>(null);

  return (
    <div className="bg-stone-900/90 border border-amber-900/40 rounded-2xl p-4 shadow-xl mb-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2">
        <h2 className="text-xs font-serif font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          Active Adventuring Party ({party.length} {party.length === 1 ? 'Player' : 'Players'})
        </h2>
        <span className="text-[11px] text-stone-400">
          Turn Order: <strong className="text-amber-300">{party[activePlayerIndex]?.name}'s Turn</strong>
        </span>
      </div>

      <div
        className={`grid gap-3 ${
          party.length === 1
            ? 'grid-cols-1 max-w-md mx-auto'
            : party.length === 2
            ? 'grid-cols-1 sm:grid-cols-2'
            : party.length === 3
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {party.map((char, index) => {
          const isActive = index === activePlayerIndex;
          const hpPercentage = Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100));
          const hasStatusEffects = char.statusEffects && char.statusEffects.length > 0;

          let hpColor = 'bg-emerald-500';
          if (hpPercentage < 30) hpColor = 'bg-red-500 animate-pulse';
          else if (hpPercentage < 60) hpColor = 'bg-amber-500';

          return (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char)}
              className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                isActive
                  ? 'bg-amber-950/60 border-amber-500 shadow-lg ring-2 ring-amber-500/30'
                  : hasStatusEffects
                  ? 'bg-stone-950/80 border-stone-700/80 hover:border-amber-700/60 hover:bg-stone-950'
                  : 'bg-stone-950/70 border-stone-800 hover:border-stone-700 hover:bg-stone-950'
              }`}
            >
              {/* Active Turn Ribbon */}
              {isActive && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm z-10">
                  <Sparkles className="w-3 h-3" />
                  ACTIVE TURN
                </div>
              )}

              <div>
                {/* Character Header: Avatar with Floating Condition Icons & Name */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  {/* Portrait Avatar Container with Condition Badges Overlay */}
                  <div className="relative shrink-0">
                    {char.portraitUrl ? (
                      <img
                        src={char.portraitUrl}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-lg object-cover border border-amber-500/70 shadow-sm bg-stone-900"
                      />
                    ) : (
                      <span className="text-2xl w-11 h-11 flex items-center justify-center bg-stone-900 rounded-lg border border-stone-800 shadow-inner">
                        {char.avatar}
                      </span>
                    )}

                    {/* Floating Status Condition Icons on Portrait Corner */}
                    {hasStatusEffects && (
                      <div className="absolute -bottom-1.5 -right-1.5 flex items-center -space-x-1">
                        {char.statusEffects!.slice(0, 2).map((eff) => {
                          const style = getStatusBadgeStyle(eff);
                          return (
                            <div
                              key={`mini-${eff}`}
                              title={eff}
                              className={`w-5 h-5 rounded-full ${style.bg} ${style.border} border flex items-center justify-center shadow-md ring-1 ring-stone-950`}
                            >
                              {getStatusEffectIcon(eff, 'w-3 h-3')}
                            </div>
                          );
                        })}
                        {char.statusEffects!.length > 2 && (
                          <div className="w-4 h-4 rounded-full bg-stone-900 border border-stone-700 text-[8px] font-mono text-amber-300 font-bold flex items-center justify-center shadow">
                            +{char.statusEffects!.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Character Meta Details */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold font-serif text-stone-100 flex items-center gap-1.5 truncate">
                      <span className="truncate">{char.name}</span>
                      {char.isAiControlled ? (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono font-bold rounded flex items-center gap-0.5 shrink-0">
                          <Bot className="w-2.5 h-2.5 text-amber-400" />
                          AI
                        </span>
                      ) : null}
                      <Info className="w-3 h-3 text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    <div className="text-[11px] text-stone-400 truncate">
                      {char.race} {char.characterClass} • Lvl {char.level}{' '}
                      <span className="text-[10px] text-amber-400/90 font-mono">
                        ({char.gender === 'Male' ? 'he/him' : char.gender === 'Female' ? 'she/her' : 'they/them'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* HP Health Gauge */}
                <div className="mb-1.5">
                  <div className="flex justify-between text-[10px] font-semibold text-stone-300 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" />
                      Hit Points
                    </span>
                    <span>
                      {char.hp} / {char.maxHp}
                    </span>
                  </div>
                  <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden border border-stone-800">
                    <div
                      className={`h-full ${hpColor} transition-all duration-300`}
                      style={{ width: `${hpPercentage}%` }}
                    />
                  </div>
                </div>

                {/* XP Progress Mini-Gauge */}
                {(() => {
                  const charXp = char.xp || 0;
                  const xpInfo = getXpProgressInfo(charXp, char.level);
                  return (
                    <div className="mb-2">
                      <div className="flex justify-between text-[9px] font-mono text-stone-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Award className="w-2.5 h-2.5 text-amber-400" />
                          <span>EXP</span>
                        </span>
                        <span className="text-amber-300/90 font-bold">
                          {charXp.toLocaleString()} / {xpInfo.nextLevelTarget.toLocaleString()}
                          {xpInfo.canLevelUp && (
                            <span className="text-emerald-400 ml-1 font-bold animate-pulse">★ LVL UP!</span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-stone-900 rounded-full h-1 overflow-hidden border border-amber-950/60">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                          style={{ width: `${xpInfo.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Prominent Color-Coded Status Effect Condition Badges */}
                {hasStatusEffects && (
                  <div className="mb-2 space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-stone-400 uppercase tracking-wider px-0.5">
                      <span className="flex items-center gap-1 text-amber-400/90 font-bold">
                        <Activity className="w-2.5 h-2.5" />
                        Conditions ({char.statusEffects!.length})
                      </span>
                      <span className="text-stone-500 text-[8px]">Tap card to edit</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {char.statusEffects!.map((eff) => {
                        const config = STATUS_EFFECTS_CONFIG[eff as StatusEffectType];
                        const style = getStatusBadgeStyle(eff);
                        const isHovered =
                          hoveredEffect?.charId === char.id && hoveredEffect?.effect === eff;

                        return (
                          <div
                            key={eff}
                            onMouseEnter={() => setHoveredEffect({ charId: char.id, effect: eff })}
                            onMouseLeave={() => setHoveredEffect(null)}
                            className={`group/badge text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1.5 border transition-all ${style.bg} ${style.text} ${style.border} ${style.glow} ${
                              eff === 'Poisoned' || eff === 'Restrained' || eff === 'Stunned'
                                ? 'animate-subtle-pulse'
                                : ''
                            }`}
                            title={config ? `${config.label}: ${config.description}` : eff}
                          >
                            <span className="shrink-0 flex items-center">
                              {getStatusEffectIcon(eff, 'w-3.5 h-3.5')}
                            </span>
                            <span className="font-medium tracking-tight">{eff}</span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0 opacity-80`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Combat Stats Badges */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-800/80 text-stone-300">
                <span className="flex items-center gap-1 font-mono font-medium">
                  <Shield className="w-3 h-3 text-amber-400" /> AC {char.ac}
                </span>

                {char.maxSpellSlots > 0 ? (
                  <span
                    className="text-purple-300 font-mono font-bold flex items-center gap-1"
                    title={`${char.spellSlots} of ${char.maxSpellSlots} spell slots available`}
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>{char.spellSlots}/{char.maxSpellSlots}</span>
                    <span className="flex gap-0.5">
                      {Array.from({ length: char.maxSpellSlots }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full inline-block ${
                            i < char.spellSlots ? 'bg-purple-400 ring-1 ring-purple-300' : 'bg-stone-800'
                          }`}
                        />
                      ))}
                    </span>
                  </span>
                ) : (
                  <span className="text-stone-500 font-mono text-[10px]">Martial</span>
                )}

                <span className="text-stone-400 font-mono">
                  STR {formatModifier(getStatModifier(char.stats.str))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
