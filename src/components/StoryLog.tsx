import React, { useEffect, useRef } from 'react';
import { TurnEntry, WikiCard } from '../types';
import { BookOpen, ExternalLink, Dices, Sparkles, AlertCircle, ShieldAlert, BookMarked } from 'lucide-react';

interface StoryLogProps {
  history: TurnEntry[];
  worldName: string;
  worldSummary: string;
  historicalInspirations: { topic: string; relevance: string }[];
  activeWikiCards: WikiCard[];
  isLoading: boolean;
  onOpenWikiModal: (articleTitle: string) => void;
  onOpenJournal?: () => void;
}

export const StoryLog: React.FC<StoryLogProps> = ({
  history,
  worldName,
  worldSummary,
  historicalInspirations,
  activeWikiCards,
  isLoading,
  onOpenWikiModal,
  onOpenJournal,
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  return (
    <div className="bg-stone-900/90 border border-amber-900/40 rounded-2xl p-6 shadow-2xl mb-6 backdrop-blur-sm space-y-6">
      {/* World Proclamation Header */}
      <div className="border-b border-amber-800/40 pb-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4" /> Campaign Realm
          </div>

          {onOpenJournal && (
            <button
              type="button"
              onClick={onOpenJournal}
              className="px-3 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-bold font-serif flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-400" />
              <span>Chronicle Journal</span>
            </button>
          )}
        </div>
        <h2 className="text-2xl font-serif font-bold text-amber-100 mb-2">
          {worldName || 'The Mythic Realms'}
        </h2>
        {worldSummary && (
          <p className="text-stone-300 text-sm leading-relaxed italic border-l-2 border-amber-600/60 pl-3">
            "{worldSummary}"
          </p>
        )}

        {/* Historical References (Subtle Collapsible Drawer to maintain immersion) */}
        {historicalInspirations && historicalInspirations.length > 0 && (
          <details className="mt-3 group">
            <summary className="text-[11px] font-sans text-stone-500 hover:text-amber-300 cursor-pointer flex items-center gap-1.5 transition-colors select-none">
              <BookOpen className="w-3 h-3 text-stone-500 group-hover:text-amber-400" />
              <span>Historical & Cultural Inspirations</span>
            </summary>
            <div className="mt-2 pt-2 border-t border-stone-800/60 flex flex-wrap items-center gap-2">
              {historicalInspirations.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onOpenWikiModal(item.topic)}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-950 border border-stone-800 text-stone-400 hover:text-amber-300 hover:border-amber-700/50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{item.topic}</span>
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Turn History Log */}
      <div className="space-y-6">
        {history.map((turn, index) => (
          <div key={turn.id || index} className="space-y-3 animate-fadeIn">
            {/* Player Action Header */}
            {turn.actionText && (
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-serif font-bold text-amber-300">
                    {turn.activePlayerName || 'Hero'}
                  </span>
                  <span className="text-xs text-stone-300">acted:</span>
                  <span className="text-xs font-medium text-stone-100 italic">
                    "{turn.actionText}"
                  </span>
                </div>

                {/* Dice Roll Result Badge */}
                {turn.diceRoll && (
                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-sm ${
                      turn.diceRoll.isCrit
                        ? 'bg-amber-500 text-stone-950 border border-amber-300 animate-pulse'
                        : turn.diceRoll.isSuccess
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>
                      {turn.diceRoll.skill} DC {turn.diceRoll.dc}: Rolled {turn.diceRoll.d20} + {turn.diceRoll.modifier} = {turn.diceRoll.total}
                    </span>
                    <span className="uppercase text-[10px]">
                      [{turn.diceRoll.isSuccess ? 'Success' : 'Fail'}]
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* DM Narrative Output */}
            <div className="text-stone-200 text-sm leading-relaxed space-y-3 font-serif bg-stone-950/30 p-4 rounded-xl border border-stone-800/50">
              {turn.narrative.split('\n\n').map((paragraph, pIdx) => (
                <p key={pIdx} className="first-letter:text-lg first-letter:font-bold first-letter:text-amber-300">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* HP Changes & Loot Notifications */}
            {((turn.hpChanges && turn.hpChanges.length > 0) || (turn.itemsGained && turn.itemsGained.length > 0)) && (
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {turn.hpChanges?.map((hp, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                      hp.deltaHp < 0
                        ? 'bg-red-950/80 border-red-800 text-red-300'
                        : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    P{hp.playerIndex + 1}: {hp.deltaHp > 0 ? `+${hp.deltaHp}` : hp.deltaHp} HP ({hp.reason})
                  </span>
                ))}
                {turn.itemsGained?.map((item, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300 flex items-center gap-1"
                  >
                    🎁 Gained Item: {item}
                  </span>
                ))}
              </div>
            )}

            {/* Turn Specific Historical Media (Collapsible for Immersion) */}
            {turn.wikiCards && turn.wikiCards.length > 0 && (
              <details className="pt-1 group">
                <summary className="text-[11px] font-sans text-stone-500 hover:text-amber-300 cursor-pointer flex items-center gap-1.5 transition-colors select-none">
                  <BookOpen className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400" />
                  <span>Historical References & Media ({turn.wikiCards.length})</span>
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pt-2 border-t border-stone-800/50">
                  {turn.wikiCards.map((card, cIdx) => (
                    <div
                      key={cIdx}
                      className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex gap-3 items-start hover:border-amber-700/50 transition-colors"
                    >
                      {(card.thumbnail || card.originalImage) && (
                        <img
                          src={card.thumbnail || card.originalImage || ''}
                          alt={card.title}
                          className="w-16 h-16 object-cover rounded-lg border border-stone-800 shrink-0 bg-stone-900"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h5 className="font-serif font-bold text-xs text-amber-200 truncate">
                            {card.title}
                          </h5>
                          <a
                            href={card.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-400 hover:text-amber-300 transition-colors"
                            title="Open reference source"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-stone-400 line-clamp-2 leading-tight">
                          {card.extract}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center gap-3 text-amber-200 text-sm animate-pulse">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>The AI Dungeon Master is crafting the next turn & querying Wikipedia lore...</span>
          </div>
        )}

        <div ref={logEndRef} />
      </div>
    </div>
  );
};
