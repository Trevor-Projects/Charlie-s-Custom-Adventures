import React, { useState } from 'react';
import { ChoiceOption, Character } from '../types';
import { Dices, Send, Sparkles, AlertCircle, Shield, Bot, Wand2 } from 'lucide-react';

interface ActionControlsProps {
  choices: ChoiceOption[];
  activePlayer: Character;
  activePlayerIndex: number;
  onSelectChoice: (choice: ChoiceOption) => void;
  onSubmitCustomAction: (customText: string) => void;
  isLoading: boolean;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  choices,
  activePlayer,
  activePlayerIndex,
  onSelectChoice,
  onSubmitCustomAction,
  isLoading,
}) => {
  const [customText, setCustomText] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || isLoading) return;
    onSubmitCustomAction(customText.trim());
    setCustomText('');
  };

  const handleAutoSelectAiChoice = () => {
    if (!choices || choices.length === 0) return;
    let bestChoice = choices[0];
    let bestVal = -99;
    choices.forEach((c) => {
      if (c.statReq && c.statReq !== 'none' && c.statReq !== 'combat') {
        const statVal = activePlayer?.stats?.[c.statReq] ?? 10;
        if (statVal > bestVal) {
          bestVal = statVal;
          bestChoice = c;
        }
      }
    });
    onSelectChoice(bestChoice);
  };

  return (
    <div className="bg-stone-900 border border-amber-900/50 rounded-2xl p-5 shadow-2xl mb-6">
      <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{activePlayer?.avatar || '👤'}</span>
          <div>
            <h3 className="text-sm font-serif font-bold text-amber-200">
              Player {activePlayerIndex + 1}'s Turn: <span className="text-amber-100">{activePlayer?.name}</span>
            </h3>
            <p className="text-[11px] text-stone-400">
              Select an action option below or type a custom hero action.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300">
          HP {activePlayer?.hp}/{activePlayer?.maxHp} | AC {activePlayer?.ac}
        </span>
      </div>

      {activePlayer?.isAiControlled && (
        <div className="mb-4 bg-amber-950/60 border border-amber-600/70 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="text-xs font-serif font-bold text-amber-200 block">
                🤖 AI Companion Turn ({activePlayer.name} - {activePlayer.characterClass})
              </span>
              <span className="text-[11px] text-stone-300">
                This hero is an AI companion. You can click <strong>Auto-Execute Action</strong> or manually choose their action below.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoSelectAiChoice}
            disabled={isLoading || choices.length === 0}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-serif font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5 text-stone-950" />
            <span>Auto-Execute AI Action</span>
          </button>
        </div>
      )}

      {/* Choice Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {choices.map((choice) => {
          const hasCheck = choice.statReq && choice.statReq !== 'none' && choice.dc > 0;

          return (
            <button
              key={choice.id}
              onClick={() => onSelectChoice(choice)}
              disabled={isLoading}
              className="p-4 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-600/80 hover:bg-stone-900/80 text-left transition-all cursor-pointer flex flex-col justify-between group disabled:opacity-50 shadow-md"
            >
              <p className="text-xs font-medium text-stone-100 mb-3 group-hover:text-amber-200 leading-relaxed">
                {choice.text}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-[11px]">
                {hasCheck ? (
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 font-mono font-bold border border-amber-800/50 flex items-center gap-1">
                    <Dices className="w-3 h-3 text-amber-400" />
                    {choice.skillName} DC {choice.dc}
                  </span>
                ) : (
                  <span className="text-stone-400 font-mono text-[10px]">Direct Story Action</span>
                )}

                <span className="text-amber-400 font-serif font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Choose Action →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Action Form */}
      <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-stone-800">
        <label className="block text-xs font-serif font-bold text-stone-400 mb-1">
          Or Type a Custom Creative Action:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={isLoading}
            placeholder={`What would ${activePlayer?.name || 'your hero'} like to attempt? (e.g., Cast Detect Magic, Climb the pillar...)`}
            className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!customText.trim() || isLoading}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold font-serif transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Action
          </button>
        </div>
      </form>
    </div>
  );
};
