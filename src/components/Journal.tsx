import React, { useState, useEffect } from 'react';
import { GameState, TurnEntry, Character, Milestone } from '../types';
import {
  BookMarked,
  X,
  Sparkles,
  RefreshCw,
  Scroll,
  Shield,
  Trophy,
  Dices,
  Copy,
  Check,
  Award,
  ChevronRight,
  BookOpen,
  Feather,
  Heart,
  Wand2,
  Compass,
  Flame,
  Clock,
  Target,
  FileText,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface JournalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

interface ChapterSummaryData {
  chapterHeadline: string;
  condensedParagraph: string;
  keyAchievements: string[];
  currentThreatLevel: string;
  nextObjective: string;
}

interface StoryBeat {
  beatNumber: number;
  chapterTitle: string;
  summary: string;
  keyHighlights: string[];
  heroicQuote?: string;
}

interface JournalSummary {
  title: string;
  overallChronicle: string;
  storyBeats: StoryBeat[];
  partyLegacy: string;
}

export const Journal: React.FC<JournalProps> = ({ isOpen, onClose, gameState }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'chapter_summary' | 'chronicle' | 'timeline' | 'roster'>('chapter_summary');
  
  // Chapter Summary states
  const [isSummarizingChapter, setIsSummarizingChapter] = useState(false);
  const [chapterSummaryData, setChapterSummaryData] = useState<ChapterSummaryData | null>(null);
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<number | 'all'>('all');
  const [copiedChapterSummary, setCopiedChapterSummary] = useState(false);

  // Grand Chronicle states
  const [isSummarizingFull, setIsSummarizingFull] = useState(false);
  const [aiSummary, setAiSummary] = useState<JournalSummary | null>(null);
  const [copiedFull, setCopiedFull] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const { history, party, worldName, worldSummary, milestones, currentMilestoneIndex } = gameState;
  const currentMilestone = milestones[currentMilestoneIndex] || {
    chapter: 1,
    title: 'The Unfolding Journey',
    description: 'Venturing into the unknown.',
  };

  // Local fallback chapter summary generator if AI isn't called or fails
  const generateLocalChapterSummary = (targetCh: number | 'all'): ChapterSummaryData => {
    const totalTurns = history.length;
    const heroNames = party.map((p) => p.name).join(', ') || 'The adventuring party';
    const itemsGained = history.flatMap((t) => t.itemsGained || []);
    const recentActions = history
      .slice(-4)
      .filter((t) => t.actionText)
      .map((t) => t.actionText);

    let headline = `Chapter ${currentMilestone.chapter}: ${currentMilestone.title}`;
    let condensed = '';

    if (totalTurns === 0) {
      condensed = `In the mythical realm of ${worldName || 'the realm'}, the valiant company of ${heroNames} gathers at the threshold of destiny. Standing prepared to undertake Chapter ${currentMilestone.chapter} ("${currentMilestone.title}"), the heroes inspect their armaments and resolve to confront the perils that lie ahead.`;
    } else {
      const narrativeSnippets = history.slice(-3).map((t) => t.narrative).join(' ');
      const actionHighlights = recentActions.length > 0 ? `Having recently undertaken critical efforts—such as ${recentActions.slice(0, 2).join(' and ')}—` : '';
      
      condensed = `Across ${totalTurns} perilous turns in ${worldName || 'the realm'}, ${heroNames} have pressed relentlessly through Chapter ${currentMilestone.chapter}: ${currentMilestone.title}. ${actionHighlights}the party has navigated dangerous encounters and unraveled ancient secrets. With ${party.filter((p) => p.hp > 0).length} of ${party.length} heroes actively standing firm, the company now prepares to fulfill their immediate decree: ${currentMilestone.description}`;
    }

    const achievements: string[] = [];
    if (itemsGained.length > 0) {
      achievements.push(`Recovered relics: ${itemsGained.slice(0, 2).join(', ')}`);
    }
    achievements.push(`Advanced into Chapter ${currentMilestone.chapter}: ${currentMilestone.title}`);
    if (totalTurns > 0) {
      achievements.push(`Resolved ${totalTurns} tactical encounters and decision points`);
    }

    return {
      chapterHeadline: headline,
      condensedParagraph: condensed,
      keyAchievements: achievements,
      currentThreatLevel: gameState.combatEncounter ? 'High Alert - Active Hostile Encounter' : 'Moderate - Exploring Contested Territory',
      nextObjective: currentMilestone.description || `Complete the objectives of Chapter ${currentMilestone.chapter}`,
    };
  };

  // Local fallback chronicle generator
  const generateLocalChronicle = (): JournalSummary => {
    const totalTurns = history.length;
    const itemsFound = history.flatMap((t) => t.itemsGained || []);

    const beats: StoryBeat[] = milestones.map((m, idx) => {
      const isPastOrCurrent = idx <= currentMilestoneIndex;
      const matchingTurns = history.filter((_, tIdx) => Math.floor(tIdx / Math.max(1, Math.ceil(totalTurns / Math.max(1, milestones.length)))) === idx);

      let beatSummary = matchingTurns.map((t) => t.narrative).join(' ') || `The heroes embark on Chapter ${m.chapter}: ${m.title}. ${m.description}`;
      if (beatSummary.length > 500) {
        beatSummary = beatSummary.slice(0, 500) + '...';
      }

      const highlights = matchingTurns
        .filter((t) => t.actionText)
        .map((t) => `${t.activePlayerName || 'Hero'} ${t.actionText}`)
        .slice(0, 3);

      if (highlights.length === 0) {
        highlights.push(`Objective: ${m.title}`);
      }

      return {
        beatNumber: idx + 1,
        chapterTitle: `Chapter ${m.chapter}: ${m.title}`,
        summary: isPastOrCurrent ? beatSummary : `(Future Chapter) ${m.description}`,
        keyHighlights: highlights,
        heroicQuote: matchingTurns[0]?.actionText ? `"${matchingTurns[0].actionText}"` : undefined,
      };
    });

    return {
      title: `The Chronicles of ${worldName || 'The Mythic Realm'}`,
      overallChronicle: `In the realm of ${worldName || 'the realm'}, the brave company consisting of ${party.map((p) => p.name).join(', ')} answered the call of destiny. Across ${totalTurns} recorded turns and ${milestones.length} major chapters, they forged their legacy through peril, courage, and cunning.`,
      storyBeats: beats.length > 0 ? beats : [
        {
          beatNumber: 1,
          chapterTitle: 'Chapter 1: The Inciting Incident',
          summary: history[0]?.narrative || 'The journey begins in mystery and danger.',
          keyHighlights: ['Campaign Commenced', ...itemsFound],
        },
      ],
      partyLegacy: `${party.length} heroes stand united, ready to confront whatever dark powers threaten the land.`,
    };
  };

  const activeChapterSummary = chapterSummaryData || generateLocalChapterSummary(selectedChapterFilter);
  const currentChronicle = aiSummary || generateLocalChronicle();

  // Fetch concise chapter summary from Gemini
  const handleCondenseWithGemini = async (chapterTarget?: number | 'all') => {
    setIsSummarizingChapter(true);
    setSummaryError(null);
    soundManager.playDiceRoll();

    const target = chapterTarget !== undefined ? chapterTarget : selectedChapterFilter;

    try {
      const res = await fetch('/api/gemini/chapter-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName,
          worldSummary,
          party,
          history,
          milestones,
          currentMilestoneIndex,
          targetChapter: target === 'all' ? undefined : target,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to condense chapter summary.');
      }

      const data: ChapterSummaryData = await res.json();
      setChapterSummaryData(data);
      soundManager.playSuccess();
    } catch (err: any) {
      console.error('Chapter summary AI error:', err);
      setSummaryError('Could not connect to Gemini AI. Displaying compiled chapter overview.');
    } finally {
      setIsSummarizingChapter(false);
    }
  };

  // Fetch full multi-beat saga chronicle
  const handleFetchFullAiSummary = async () => {
    setIsSummarizingFull(true);
    setSummaryError(null);
    soundManager.playDiceRoll();

    try {
      const res = await fetch('/api/summarize-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName,
          worldSummary,
          party,
          history,
          milestones,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to weave AI chronicle.');
      }

      const data: JournalSummary = await res.json();
      setAiSummary(data);
      soundManager.playSuccess();
    } catch (err: any) {
      console.error('Journal AI summary error:', err);
      setSummaryError('Could not connect to AI Bard. Displaying compiled history log.');
    } finally {
      setIsSummarizingFull(false);
    }
  };

  // Copy concise chapter summary paragraph
  const handleCopyChapterSummary = () => {
    soundManager.playPageTurn();
    const formatted = `=== CHAPTER SUMMARY: ${activeChapterSummary.chapterHeadline} ===\n\n${activeChapterSummary.condensedParagraph}\n\nKey Achievements:\n${activeChapterSummary.keyAchievements.map((a) => `• ${a}`).join('\n')}\n\nCurrent Threat Level: ${activeChapterSummary.currentThreatLevel}\nNext Objective: ${activeChapterSummary.nextObjective}`;

    navigator.clipboard.writeText(formatted);
    setCopiedChapterSummary(true);
    setTimeout(() => setCopiedChapterSummary(false), 2000);
  };

  // Copy grand chronicle
  const handleCopyFullChronicle = () => {
    soundManager.playPageTurn();
    const formatted = `=== ${currentChronicle.title} ===\n\n${currentChronicle.overallChronicle}\n\n` +
      currentChronicle.storyBeats
        .map((b) => `${b.chapterTitle}\n${b.summary}\nHighlights: ${b.keyHighlights.join(' • ')}`)
        .join('\n\n') +
      `\n\nLegacy: ${currentChronicle.partyLegacy}`;

    navigator.clipboard.writeText(formatted);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-stone-900 border border-amber-800/70 rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl text-stone-100 relative max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-amber-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b border-amber-800/50 pb-4 mb-4 flex items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-950/80 rounded-xl border border-amber-700/60 text-amber-300 shadow-inner">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Feather className="w-3 h-3 text-amber-400" /> Campaign Chronicle & Lore Journal
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-100">
                {worldName || 'The Heroic Annals'}
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {activeTab === 'chapter_summary' ? (
              <button
                type="button"
                onClick={handleCopyChapterSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
                title="Copy condensed chapter summary to clipboard"
              >
                {copiedChapterSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedChapterSummary ? 'Copied!' : 'Copy Summary'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopyFullChronicle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
                title="Copy formatted journal chronicle to clipboard"
              >
                {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedFull ? 'Copied!' : 'Copy Chronicle'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800 mb-4 bg-stone-950/60 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playPageTurn();
              setActiveTab('chapter_summary');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold font-serif transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'chapter_summary'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Chapter Summary</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPageTurn();
              setActiveTab('chronicle');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold font-serif transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'chronicle'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>Story Saga</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPageTurn();
              setActiveTab('timeline');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold font-serif transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Turn Log ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playPageTurn();
              setActiveTab('roster');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold font-serif transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Party ({party.length})</span>
          </button>
        </div>

        {/* Tab 1: Chapter Summary View (High-Level Condensed Paragraph via Gemini AI) */}
        {activeTab === 'chapter_summary' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* AI Summarize Action Banner */}
            <div className="bg-stone-950 p-4 rounded-xl border border-amber-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-xs font-serif font-bold text-amber-200 flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Gemini AI Chapter Summarizer
                </h4>
                <p className="text-[11px] text-stone-400 leading-tight">
                  Condenses the active story log into a single cohesive, high-level campaign summary paragraph.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCondenseWithGemini()}
                disabled={isSummarizingChapter}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold font-serif transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-lg shadow-amber-600/20"
              >
                {isSummarizingChapter ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Condensing Story...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{chapterSummaryData ? 'Re-Condense with Gemini' : 'Condense with Gemini AI'}</span>
                  </>
                )}
              </button>
            </div>

            {summaryError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs">
                {summaryError}
              </div>
            )}

            {/* Campaign Progress Gauge */}
            <div className="bg-stone-950/80 p-3.5 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="font-serif font-bold text-stone-200">
                  Chapter {currentMilestone.chapter} of {milestones.length}:
                </span>
                <span className="text-amber-300 font-serif font-semibold">
                  {currentMilestone.title}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px] text-stone-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Clock className="w-3.5 h-3.5" /> {history.length} Turns Logged
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
                  {Math.round(((currentMilestoneIndex + 1) / Math.max(1, milestones.length)) * 100)}% Campaign Progress
                </span>
              </div>
            </div>

            {/* Main Highlight: Condensed Paragraph View */}
            <div className="bg-gradient-to-br from-amber-950/30 via-stone-950 to-stone-950 border border-amber-800/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-amber-800/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-serif font-bold text-base sm:text-lg text-amber-100">
                    {activeChapterSummary.chapterHeadline}
                  </h3>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-amber-700/50 text-amber-300">
                  High-Level Executive Overview
                </span>
              </div>

              {/* The Condensed Paragraph */}
              <div className="relative pl-4 border-l-2 border-amber-500/80 my-2">
                <p className="text-stone-200 text-sm sm:text-base leading-relaxed font-serif tracking-wide">
                  {activeChapterSummary.condensedParagraph}
                </p>
              </div>

              {/* Strategic Insights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-stone-800/80 text-xs">
                {/* Threat Level */}
                <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 flex items-start gap-2.5">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider block font-bold">
                      Current Threat Level
                    </span>
                    <span className="text-stone-200 font-serif font-semibold">
                      {activeChapterSummary.currentThreatLevel}
                    </span>
                  </div>
                </div>

                {/* Immediate Next Horizon / Objective */}
                <div className="bg-stone-900/80 p-3 rounded-xl border border-stone-800 flex items-start gap-2.5">
                  <Target className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider block font-bold">
                      Next Objective Horizon
                    </span>
                    <span className="text-cyan-200 font-serif font-semibold">
                      {activeChapterSummary.nextObjective}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Achievements & Triumphs */}
              {activeChapterSummary.keyAchievements && activeChapterSummary.keyAchievements.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                    Key Chapter Achievements & Milestones:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeChapterSummary.keyAchievements.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-900/60 p-2.5 rounded-lg border border-stone-800/80 flex items-center gap-2 text-xs text-amber-200/90 font-serif"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="line-clamp-2">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Chapter Selector Filters */}
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mr-1">
                Filter Chapter:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedChapterFilter('all');
                  handleCondenseWithGemini('all');
                }}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs font-serif ${
                  selectedChapterFilter === 'all'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                }`}
              >
                All Campaign Turns
              </button>

              {milestones.map((m, idx) => (
                <button
                  key={m.chapter}
                  type="button"
                  onClick={() => {
                    setSelectedChapterFilter(m.chapter);
                    handleCondenseWithGemini(m.chapter);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs font-serif ${
                    selectedChapterFilter === m.chapter
                      ? 'bg-amber-600 text-stone-950 font-bold shadow'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  Ch. {m.chapter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Full Story Saga (Structured Multi-Beat Chronicle) */}
        {activeTab === 'chronicle' && (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {/* AI Summarize Action Banner */}
            <div className="bg-stone-950 p-4 rounded-xl border border-amber-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-xs font-serif font-bold text-amber-200 flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  AI Bard Chronicle Synthesizer
                </h4>
                <p className="text-[11px] text-stone-400 leading-tight">
                  Automatically synthesize all turns & major narrative arcs into an epic multi-beat prose saga.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFetchFullAiSummary}
                disabled={isSummarizingFull}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold font-serif transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-lg shadow-amber-600/20"
              >
                {isSummarizingFull ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Weaving Saga...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>{aiSummary ? 'Re-Weave AI Saga' : 'Weave Epic Saga'}</span>
                  </>
                )}
              </button>
            </div>

            {summaryError && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs">
                {summaryError}
              </div>
            )}

            {/* Overall Saga Summary */}
            <div className="bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl space-y-3 font-serif">
              <h3 className="text-xl font-bold text-amber-100 flex items-center gap-2 border-b border-amber-800/30 pb-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                {currentChronicle.title}
              </h3>
              <p className="text-stone-200 text-sm leading-relaxed italic">
                "{currentChronicle.overallChronicle}"
              </p>
            </div>

            {/* Story Beats / Narrative Arcs */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" /> Major Narrative Beats & Chapters
              </h4>

              {currentChronicle.storyBeats.map((beat) => (
                <div
                  key={beat.beatNumber}
                  className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                    <h5 className="font-serif font-bold text-base text-amber-200 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-xs flex items-center justify-center font-mono font-bold">
                        {beat.beatNumber}
                      </span>
                      {beat.chapterTitle}
                    </h5>
                  </div>

                  <p className="text-stone-300 text-xs sm:text-sm leading-relaxed font-serif">
                    {beat.summary}
                  </p>

                  {beat.heroicQuote && (
                    <blockquote className="border-l-2 border-amber-500 pl-3 italic text-xs text-amber-200 font-serif">
                      {beat.heroicQuote}
                    </blockquote>
                  )}

                  {beat.keyHighlights && beat.keyHighlights.length > 0 && (
                    <div className="pt-2 border-t border-stone-900 flex flex-wrap gap-1.5">
                      {beat.keyHighlights.map((hl, hIdx) => (
                        <span
                          key={hIdx}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-amber-300/90 font-mono"
                        >
                          ✨ {hl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Party Legacy Statement */}
            <div className="bg-stone-950 p-4 rounded-xl border border-amber-800/50 text-center space-y-1">
              <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-widest">
                Party Standing & Reputation
              </span>
              <p className="text-xs text-stone-200 italic font-serif">
                "{currentChronicle.partyLegacy}"
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Turn Timeline Log */}
        {activeTab === 'timeline' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <p className="text-xs text-stone-400 mb-2">
              Chronological turn-by-turn history log of party actions and outcomes:
            </p>

            {history.map((turn, index) => (
              <div
                key={turn.id || index}
                className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono border-b border-stone-900 pb-1.5">
                  <span className="font-bold text-amber-400">
                    Turn {index + 1} • {turn.activePlayerName || 'Party'}
                  </span>
                  <span>{turn.timestamp}</span>
                </div>

                {turn.actionText && (
                  <p className="font-semibold text-amber-200">
                    Action: "{turn.actionText}"
                  </p>
                )}

                <p className="text-stone-300 font-serif leading-relaxed line-clamp-3">
                  {turn.narrative}
                </p>

                {turn.diceRoll && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-stone-900 text-amber-300 border border-stone-800 font-mono text-[10px]">
                    <Dices className="w-3 h-3 text-amber-400" />
                    <span>
                      {turn.diceRoll.skill}: Rolled {turn.diceRoll.total} (DC {turn.diceRoll.dc})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Party Roster */}
        {activeTab === 'roster' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <p className="text-xs text-stone-400">
              Active party members embarking on this campaign:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {party.map((char) => (
                <div
                  key={char.id}
                  className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex gap-3 items-start"
                >
                  {char.portraitUrl ? (
                    <img
                      src={char.portraitUrl}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover border border-amber-500/80 bg-stone-900 shrink-0"
                    />
                  ) : (
                    <span className="text-3xl p-2 bg-stone-900 rounded-xl border border-stone-800 shrink-0">
                      {char.avatar}
                    </span>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-serif font-bold text-amber-100 text-sm truncate">
                        {char.name}
                      </h5>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        Lvl {char.level}
                      </span>
                    </div>

                    <p className="text-xs text-stone-400 truncate">
                      {char.race} {char.characterClass}
                    </p>

                    <div className="flex items-center gap-3 text-xs font-mono pt-1">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {char.hp}/{char.maxHp} HP
                      </span>
                      {char.maxSpellSlots > 0 && (
                        <span className="text-purple-300 flex items-center gap-1">
                          <Wand2 className="w-3 h-3" /> {char.spellSlots}/{char.maxSpellSlots}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-amber-800/40 pt-4 mt-4 flex items-center justify-between text-xs">
          <span className="text-stone-400 font-mono text-[11px]">
            {history.length} Turn Entries • Chapter {currentMilestoneIndex + 1} of {milestones.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold font-serif transition-colors cursor-pointer shadow-md"
          >
            Close Journal
          </button>
        </div>
      </div>
    </div>
  );
};
