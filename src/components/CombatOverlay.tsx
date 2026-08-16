import React, { useState } from 'react';
import { CombatEncounter, Character } from '../types';
import { soundManager } from '../utils/audio';
import { Swords, Shield, Heart, Sparkles, Zap, Flame, ShieldAlert, Crosshair, Bot, Wand2 } from 'lucide-react';

interface CombatOverlayProps {
  combat: CombatEncounter;
  party: Character[];
  activePlayerIndex: number;
  onAttackMonster: (damage: number, attackText: string) => void;
  onHealPlayer: (healedHp: number) => void;
  onFleeCombat: () => void;
  onConsumeSpellSlot?: (characterId: string) => void;
}

export const CombatOverlay: React.FC<CombatOverlayProps> = ({
  combat,
  party,
  activePlayerIndex,
  onAttackMonster,
  onHealPlayer,
  onFleeCombat,
  onConsumeSpellSlot,
}) => {
  const activePlayer = party[activePlayerIndex] || party[0];
  const [combatLog, setCombatLog] = useState<string[]>([
    `⚔️ Combat Engaged! ${combat.enemyName} appears!`,
    combat.description,
  ]);

  const enemyHpPercent = Math.max(0, Math.min(100, (combat.enemyHp / combat.maxEnemyHp) * 100));

  const handleWeaponAttack = () => {
    soundManager.playSwordClash();

    // Attack roll vs AC
    const d20 = Math.floor(Math.random() * 20) + 1;
    const strMod = Math.floor((activePlayer.stats.str - 10) / 2);
    const attackRoll = d20 + strMod + 2; // +2 proficiency bonus

    const isCrit = d20 === 20;
    const isCritFail = d20 === 1;

    if (isCrit || (!isCritFail && attackRoll >= combat.enemyAc)) {
      const baseDamage = Math.floor(Math.random() * 8) + 1 + Math.max(1, strMod);
      const damage = isCrit ? baseDamage * 2 : baseDamage;

      if (isCrit) {
        soundManager.playCriticalSuccess();
      } else {
        soundManager.playSuccess();
      }
      const msg = `🎯 ${activePlayer.name} attacks with weapon! Rolled ${d20} + ${strMod + 2} = ${attackRoll} vs AC ${combat.enemyAc}. ${isCrit ? 'CRITICAL HIT!' : 'HIT'} for ${damage} Slashing damage!`;
      setCombatLog((prev) => [msg, ...prev]);
      onAttackMonster(damage, msg);
    } else {
      if (isCritFail) {
        soundManager.playCriticalFailure();
      } else {
        soundManager.playFail();
      }
      const msg = `❌ ${activePlayer.name} attacks with weapon! Rolled ${d20} + ${strMod + 2} = ${attackRoll} vs AC ${combat.enemyAc}. ${isCritFail ? 'CRITICAL FUMBLE!' : 'MISSED!'}`;
      setCombatLog((prev) => [msg, ...prev]);
      onAttackMonster(0, msg);
    }
  };

  const handleCastSpell = (isCantrip: boolean = false) => {
    if (!isCantrip && activePlayer.spellSlots <= 0) {
      setCombatLog((prev) => [
        `⚠️ ${activePlayer.name} has no remaining spell slots! Cast a Cantrip instead.`,
        ...prev,
      ]);
      return;
    }

    if (!isCantrip && onConsumeSpellSlot) {
      onConsumeSpellSlot(activePlayer.id);
    }

    soundManager.playCrit();
    const spellMod = Math.floor(
      (Math.max(activePlayer.stats.int, activePlayer.stats.wis, activePlayer.stats.cha) - 10) / 2
    );

    if (isCantrip) {
      const cantripDamage = Math.floor(Math.random() * 6) + 1 + Math.max(0, spellMod);
      const msg = `✨ ${activePlayer.name} casts a Cantrip (Ray of Frost / Sacred Flame)! Deals ${cantripDamage} magic damage!`;
      setCombatLog((prev) => [msg, ...prev]);
      onAttackMonster(cantripDamage, msg);
    } else {
      const spellDamage = Math.floor(Math.random() * 10) + 4 + Math.max(1, spellMod);
      const rem = Math.max(0, activePlayer.spellSlots - 1);
      const msg = `⚡ ${activePlayer.name} expends a 1st-Level Spell Slot! Deals ${spellDamage} elemental damage on ${combat.enemyName}! (${rem} slots left)`;
      setCombatLog((prev) => [msg, ...prev]);
      onAttackMonster(spellDamage, msg);
    }
  };

  const handleUsePotion = () => {
    soundManager.playSuccess();
    const healVal = Math.floor(Math.random() * 6) + 4; // 1d6+4
    const msg = `🧪 ${activePlayer.name} drinks a Healing Potion and restores ${healVal} HP!`;
    setCombatLog((prev) => [msg, ...prev]);
    onHealPlayer(healVal);
  };

  const handleAutoAiTurn = () => {
    if (activePlayer.hp < activePlayer.maxHp * 0.35) {
      handleUsePotion();
    } else if (
      activePlayer.spellSlots > 0 &&
      ['Wizard', 'Cleric', 'Bard', 'Sorcerer', 'Druid', 'Warlock', 'Paladin', 'Ranger'].includes(activePlayer.characterClass)
    ) {
      handleCastSpell(false);
    } else if (
      ['Wizard', 'Cleric', 'Bard', 'Sorcerer', 'Druid', 'Warlock'].includes(activePlayer.characterClass)
    ) {
      handleCastSpell(true);
    } else {
      handleWeaponAttack();
    }
  };

  return (
    <div className="bg-stone-900 border-2 border-red-900/80 rounded-2xl p-6 shadow-2xl mb-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-red-900/50 pb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-6 h-6 text-red-500 animate-pulse" />
          <h3 className="text-lg font-serif font-bold text-red-200">
            Tactical Combat Encounter: {combat.enemyName}
          </h3>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-red-950 border border-red-800 text-red-300">
          D&D 5E Turn-Based Battle
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monster Card */}
        <div className="bg-stone-950 p-4 rounded-xl border border-red-900/60 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">👹</span>
            <span className="text-xs font-mono font-bold text-red-400">
              AC {combat.enemyAc} • Atk +{combat.enemyAttackBonus} ({combat.enemyDamage})
            </span>
          </div>

          <h4 className="font-serif font-bold text-amber-100 text-base mb-1">
            {combat.enemyName}
          </h4>

          {/* Enemy HP bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-stone-300 mb-1">
              <span>Enemy Health</span>
              <span>
                {combat.enemyHp} / {combat.maxEnemyHp}
              </span>
            </div>
            <div className="w-full bg-stone-900 rounded-full h-3 border border-stone-800 overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${enemyHpPercent}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-stone-400 italic line-clamp-2">{combat.description}</p>
        </div>

        {/* Combat Action Controls */}
        <div className="flex flex-col justify-between space-y-3">
          <div className="text-xs text-amber-200 font-serif font-bold flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div className="flex items-center gap-2">
              <span>{activePlayer.avatar}</span>
              <span>Active Fighter: {activePlayer.name} ({activePlayer.characterClass})</span>
            </div>
            {activePlayer.isAiControlled && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold flex items-center gap-1">
                <Bot className="w-3 h-3 text-amber-400" />
                AI COMPANION
              </span>
            )}
          </div>

          {activePlayer.isAiControlled && (
            <div className="bg-amber-950/80 border border-amber-600/70 p-3 rounded-xl flex items-center justify-between gap-2 shadow-md">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span className="text-xs text-amber-200 font-medium">
                  Auto-execute tactical turn for {activePlayer.name}?
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoAiTurn}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Take AI Turn</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleWeaponAttack}
              className="p-3 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-bold font-serif transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Swords className="w-4 h-4 text-red-400" />
              Weapon Attack
            </button>

            <button
              type="button"
              onClick={() => handleCastSpell(false)}
              disabled={activePlayer.spellSlots <= 0}
              className="p-3 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800 text-xs font-bold font-serif transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-md"
            >
              <Zap className="w-4 h-4 text-purple-400" />
              Cast 1st-Lvl Spell ({activePlayer.spellSlots}/{activePlayer.maxSpellSlots})
            </button>

            <button
              type="button"
              onClick={() => handleCastSpell(true)}
              className="p-3 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 text-xs font-bold font-serif transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Cast Cantrip (Free)
            </button>

            <button
              type="button"
              onClick={handleUsePotion}
              className="p-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 text-xs font-bold font-serif transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Heart className="w-4 h-4 text-emerald-400" />
              Use Potion
            </button>
          </div>

          <button
            type="button"
            onClick={onFleeCombat}
            className="w-full p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs font-bold font-serif transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            Attempt Flee
          </button>
        </div>
      </div>

      {/* Combat Log */}
      <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 max-h-32 overflow-y-auto font-mono text-xs text-stone-300 space-y-1">
        {combatLog.map((log, idx) => (
          <div key={idx}>{log}</div>
        ))}
      </div>
    </div>
  );
};
