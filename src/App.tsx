import React, { useState, useEffect } from 'react';
import { GameState, Character, ChoiceOption, DiceRoll, WikiCard, TurnEntry, StatusEffectType, WorldMapData } from './types';
import { Navbar } from './components/Navbar';
import { PlayerSetup } from './components/PlayerSetup';
import { PartyBar } from './components/PartyBar';
import { MilestoneTracker } from './components/MilestoneTracker';
import { StoryLog } from './components/StoryLog';
import { ActionControls } from './components/ActionControls';
import { DiceRoller } from './components/DiceRoller';
import { CombatOverlay } from './components/CombatOverlay';
import { WikiLoreCodex } from './components/WikiLoreCodex';
import { CharacterModal } from './components/CharacterModal';
import { Journal } from './components/Journal';
import { WorldMapModal } from './components/WorldMapModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { AmbientSoundController } from './components/AmbientSoundController';
import { soundManager } from './utils/audio';
import { Trophy, RefreshCw, AlertOctagon, Sparkles, Compass, MapPin } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    step: 'SETUP',
    playerCount: 2,
    party: [],
    settingName: '',
    worldName: '',
    worldSummary: '',
    historicalInspirations: [],
    milestones: [],
    currentMilestoneIndex: 0,
    history: [],
    activePlayerIndex: 0,
    currentChoices: [],
    activeWikiCards: [],
    combatEncounter: null,
    worldMap: null,
    soundEnabled: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Overlay States
  const [pendingDiceChoice, setPendingDiceChoice] = useState<ChoiceOption | null>(null);
  const [isWikiCodexOpen, setIsWikiCodexOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [inspectedCharacter, setInspectedCharacter] = useState<Character | null>(null);

  // Sync context-aware ambient audio when setting, world, or combat changes
  useEffect(() => {
    if (gameState.step === 'PLAYING') {
      soundManager.updateContext(
        gameState.settingName,
        gameState.worldName,
        !!gameState.combatEncounter
      );
    }
  }, [gameState.step, gameState.settingName, gameState.worldName, gameState.combatEncounter]);

  // Sound toggle (Master Mute / Unmute)
  const handleToggleSound = () => {
    const current = soundManager.getSettings();
    const next = !current.masterEnabled;
    soundManager.setMasterEnabled(next);
    setGameState((prev) => ({ ...prev, soundEnabled: next }));
  };

  // Start new campaign
  const handleStartCampaign = async (
    playerCount: 1 | 2 | 3 | 4,
    party: Character[],
    settingName: string,
    scenarioHook: string,
    wikiTopics: string[],
    customNotes: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/generate-adventure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party,
          setting: settingName,
          scenarioHook,
          wikiTopics,
          customNotes,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initialize D&D campaign.');
      }

      const data = await response.json();

      const initialTurn: TurnEntry = {
        id: `turn_0_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        activePlayerIndex: 0,
        activePlayerName: party[0]?.name || 'Party',
        actionText: 'Campaign Commenced',
        narrative: data.openingScene,
        wikiCards: data.wikiCards || [],
      };

      setGameState({
        step: 'PLAYING',
        playerCount,
        party,
        settingName,
        worldName: data.worldName || settingName,
        worldSummary: data.worldSummary || '',
        historicalInspirations: data.historicalInspirations || [],
        milestones: data.milestones || [],
        currentMilestoneIndex: 0,
        history: [initialTurn],
        activePlayerIndex: data.activePlayerIndex || 0,
        currentChoices: data.choices || [],
        activeWikiCards: data.wikiCards || [],
        combatEncounter: null,
        soundEnabled: gameState.soundEnabled,
      });

      soundManager.playSuccess();
    } catch (err: any) {
      console.error('Start campaign error:', err);
      setError(err.message || 'An unexpected error occurred starting the campaign.');
    } finally {
      setIsLoading(false);
    }
  };

  // Process next turn logic
  const executeTurn = async (
    actionChosen: string,
    diceRoll?: DiceRoll
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const activePlayer = gameState.party[gameState.activePlayerIndex];
      const historySummary = gameState.history
        .slice(-3)
        .map((t) => `${t.activePlayerName}: "${t.actionText}" -> ${t.narrative.slice(0, 150)}...`)
        .join('\n');

      const response = await fetch('/api/gemini/next-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          worldName: gameState.worldName,
          currentMilestoneIndex: gameState.currentMilestoneIndex,
          milestones: gameState.milestones,
          party: gameState.party,
          activePlayerIndex: gameState.activePlayerIndex,
          actionChosen,
          diceRoll,
          historySummary,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process turn.');
      }

      const data = await response.json();

      // Apply HP changes if any
      let updatedParty = [...gameState.party];
      if (data.hpChanges && Array.isArray(data.hpChanges)) {
        data.hpChanges.forEach((hpChange: any) => {
          if (updatedParty[hpChange.playerIndex]) {
            const p = updatedParty[hpChange.playerIndex];
            const newHp = Math.max(0, Math.min(p.maxHp, p.hp + hpChange.deltaHp));
            updatedParty[hpChange.playerIndex] = { ...p, hp: newHp };
          }
        });
      }

      // Apply status effect changes if any
      if (data.statusChanges && Array.isArray(data.statusChanges)) {
        data.statusChanges.forEach((sc: any) => {
          if (updatedParty[sc.playerIndex]) {
            const p = updatedParty[sc.playerIndex];
            let currentFx = p.statusEffects || [];
            if (sc.addEffects && Array.isArray(sc.addEffects)) {
              sc.addEffects.forEach((eff: string) => {
                if (!currentFx.includes(eff as StatusEffectType)) {
                  currentFx = [...currentFx, eff as StatusEffectType];
                }
              });
            }
            if (sc.removeEffects && Array.isArray(sc.removeEffects)) {
              sc.removeEffects.forEach((eff: string) => {
                currentFx = currentFx.filter((e) => e !== eff);
              });
            }
            updatedParty[sc.playerIndex] = { ...p, statusEffects: currentFx };
          }
        });
      }

      // Add items gained
      if (data.itemsGained && Array.isArray(data.itemsGained) && data.itemsGained.length > 0) {
        const pIndex = gameState.activePlayerIndex;
        if (updatedParty[pIndex]) {
          const currentInv = updatedParty[pIndex].inventory || [];
          updatedParty[pIndex] = {
            ...updatedParty[pIndex],
            inventory: [...currentInv, ...data.itemsGained],
          };
        }
      }

      // Check milestones completion
      let nextMilestoneIndex = gameState.currentMilestoneIndex;
      let updatedMilestones = [...gameState.milestones];

      if (data.milestoneCompleted) {
        if (updatedMilestones[nextMilestoneIndex]) {
          updatedMilestones[nextMilestoneIndex] = {
            ...updatedMilestones[nextMilestoneIndex],
            completed: true,
          };
        }
        if (nextMilestoneIndex < updatedMilestones.length - 1) {
          nextMilestoneIndex++;
          soundManager.playCrit();
        } else {
          // All milestones completed -> Victory!
          soundManager.playCrit();
        }
      }

      // Construct turn entry
      const newTurn: TurnEntry = {
        id: `turn_${gameState.history.length}_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        activePlayerIndex: gameState.activePlayerIndex,
        activePlayerName: activePlayer.name,
        actionText: actionChosen,
        diceRoll,
        narrative: data.narrative,
        wikiCards: data.wikiCards || [],
        hpChanges: data.hpChanges,
        itemsGained: data.itemsGained,
      };

      // Check for party defeat
      const isPartyDefeated = updatedParty.every((p) => p.hp <= 0);

      // Check for Campaign Victory (all milestones complete)
      const isVictory = nextMilestoneIndex >= updatedMilestones.length - 1 && updatedMilestones.every((m) => m.completed);

      setGameState((prev) => ({
        ...prev,
        step: isPartyDefeated ? 'GAME_OVER' : isVictory ? 'VICTORY' : 'PLAYING',
        party: updatedParty,
        milestones: updatedMilestones,
        currentMilestoneIndex: nextMilestoneIndex,
        history: [...prev.history, newTurn],
        activePlayerIndex: data.activePlayerIndex ?? (prev.activePlayerIndex + 1) % prev.party.length,
        currentChoices: data.choices || [],
        activeWikiCards: data.wikiCards && data.wikiCards.length > 0 ? data.wikiCards : prev.activeWikiCards,
        combatEncounter: data.isCombat ? data.combatEncounter : null,
      }));
    } catch (err: any) {
      console.error('Process turn error:', err);
      setError(err.message || 'Error executing action.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle choice selection from action controls
  const handleSelectChoice = (choice: ChoiceOption) => {
    soundManager.playPageTurn();
    if (choice.statReq && choice.statReq !== 'none' && choice.dc > 0) {
      // Open interactive Dice Roller
      setPendingDiceChoice(choice);
    } else {
      // Execute turn directly
      executeTurn(choice.text);
    }
  };

  // Handle dice roll completion
  const handleDiceRollComplete = (rollResult: DiceRoll) => {
    if (!pendingDiceChoice) return;
    const choiceText = pendingDiceChoice.text;
    setPendingDiceChoice(null);
    executeTurn(choiceText, rollResult);
  };

  // Handle custom text action submission
  const handleSubmitCustomAction = (customText: string) => {
    soundManager.playPageTurn();
    executeTurn(customText);
  };

  // Handle combat attack on monster
  const handleCombatAttack = (damage: number, attackText: string) => {
    if (!gameState.combatEncounter) return;

    const newEnemyHp = Math.max(0, gameState.combatEncounter.enemyHp - damage);

    if (newEnemyHp <= 0) {
      // Enemy defeated!
      soundManager.playSuccess();
      const victoryMessage = `⚔️ ${gameState.combatEncounter.enemyName} was vanquished! The party stands triumphant!`;
      setGameState((prev) => ({
        ...prev,
        combatEncounter: null,
      }));
      executeTurn(`Fought and vanquished ${gameState.combatEncounter.enemyName}!`);
    } else {
      // Monster counterattacks
      const monsterDamage = Math.floor(Math.random() * 4) + 2; // 1d4+2
      const activeIdx = gameState.activePlayerIndex;
      const updatedParty = [...gameState.party];

      if (updatedParty[activeIdx]) {
        const curHp = updatedParty[activeIdx].hp;
        updatedParty[activeIdx] = {
          ...updatedParty[activeIdx],
          hp: Math.max(0, curHp - monsterDamage),
        };
      }

      setGameState((prev) => ({
        ...prev,
        party: updatedParty,
        combatEncounter: prev.combatEncounter
          ? { ...prev.combatEncounter, enemyHp: newEnemyHp }
          : null,
      }));
    }
  };

  // Handle healing player during combat
  const handleCombatHeal = (healedHp: number) => {
    const activeIdx = gameState.activePlayerIndex;
    const updatedParty = [...gameState.party];
    if (updatedParty[activeIdx]) {
      const p = updatedParty[activeIdx];
      updatedParty[activeIdx] = {
        ...p,
        hp: Math.min(p.maxHp, p.hp + healedHp),
      };
    }
    setGameState((prev) => ({ ...prev, party: updatedParty }));
  };

  // Handle fleeing combat
  const handleFleeCombat = () => {
    soundManager.playPageTurn();
    setGameState((prev) => ({ ...prev, combatEncounter: null }));
    executeTurn('Escaped from the battlefield into the shadows.');
  };

  // Add Wikipedia topic to active campaign
  const handleAddWikiTopicToCampaign = (topic: string) => {
    soundManager.playSuccess();
    setGameState((prev) => ({
      ...prev,
      historicalInspirations: [
        ...prev.historicalInspirations,
        { topic, relevance: 'User discovered via Wikipedia Codex' },
      ],
    }));
  };

  const activePlayer = gameState.party[gameState.activePlayerIndex] || gameState.party[0];

  const handleToggleStatusEffect = (characterId: string, effect: StatusEffectType) => {
    soundManager.playDiceRoll();
    setGameState((prev) => ({
      ...prev,
      party: prev.party.map((p) => {
        if (p.id !== characterId) return p;
        const currentEffects = p.statusEffects || [];
        const hasEffect = currentEffects.includes(effect);
        const newEffects = hasEffect
          ? currentEffects.filter((e) => e !== effect)
          : [...currentEffects, effect];
        return { ...p, statusEffects: newEffects };
      }),
    }));
    setInspectedCharacter((prev) => {
      if (!prev || prev.id !== characterId) return prev;
      const currentEffects = prev.statusEffects || [];
      const hasEffect = currentEffects.includes(effect);
      const newEffects = hasEffect
        ? currentEffects.filter((e) => e !== effect)
        : [...currentEffects, effect];
      return { ...prev, statusEffects: newEffects };
    });
  };

  const handleConsumeSpellSlot = (characterId: string) => {
    setGameState((prev) => ({
      ...prev,
      party: prev.party.map((p) => {
        if (p.id !== characterId) return p;
        return { ...p, spellSlots: Math.max(0, p.spellSlots - 1) };
      }),
    }));
  };

  const handleUpdateSpellSlots = (characterId: string, action: 'spend' | 'restore' | 'rest') => {
    soundManager.playDiceRoll();
    setGameState((prev) => ({
      ...prev,
      party: prev.party.map((p) => {
        if (p.id !== characterId) return p;
        let newSlots = p.spellSlots;
        if (action === 'spend') newSlots = Math.max(0, p.spellSlots - 1);
        if (action === 'restore') newSlots = Math.min(p.maxSpellSlots, p.spellSlots + 1);
        if (action === 'rest') newSlots = p.maxSpellSlots;
        return { ...p, spellSlots: newSlots };
      }),
    }));
    setInspectedCharacter((prev) => {
      if (!prev || prev.id !== characterId) return prev;
      let newSlots = prev.spellSlots;
      if (action === 'spend') newSlots = Math.max(0, prev.spellSlots - 1);
      if (action === 'restore') newSlots = Math.min(prev.maxSpellSlots, prev.spellSlots + 1);
      if (action === 'rest') newSlots = prev.maxSpellSlots;
      return { ...prev, spellSlots: newSlots };
    });
  };

  const handleUpdatePortrait = (characterId: string, newPortraitUrl: string) => {
    soundManager.playDiceRoll();
    setGameState((prev) => ({
      ...prev,
      party: prev.party.map((p) => {
        if (p.id !== characterId) return p;
        return { ...p, portraitUrl: newPortraitUrl };
      }),
    }));
    setInspectedCharacter((prev) => {
      if (!prev || prev.id !== characterId) return prev;
      return { ...prev, portraitUrl: newPortraitUrl };
    });
  };

  const handleUpdateCharacter = (updatedChar: Character) => {
    setGameState((prev) => ({
      ...prev,
      party: prev.party.map((p) => (p.id === updatedChar.id ? updatedChar : p)),
    }));
    setInspectedCharacter(updatedChar);
  };

  const handleUpdateWorldMap = (mapData: WorldMapData) => {
    setGameState((prev) => ({
      ...prev,
      worldMap: mapData,
    }));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 flex flex-col justify-between">
      {/* Top Navbar */}
      <Navbar
        gameState={gameState}
        onToggleSound={handleToggleSound}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenDiceRoller={() => {
          if (gameState.currentChoices[0]) {
            setPendingDiceChoice(gameState.currentChoices[0]);
          }
        }}
        onOpenWikiCodex={() => setIsWikiCodexOpen(true)}
        onOpenJournal={() => setIsJournalOpen(true)}
        onOpenWorldMap={() => {
          soundManager.playPageTurn();
          setIsWorldMapOpen(true);
        }}
        onResetGame={() => setGameState((prev) => ({ ...prev, step: 'SETUP' }))}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {gameState.step === 'SETUP' && (
          <PlayerSetup
            onStartCampaign={handleStartCampaign}
            isLoading={isLoading}
            error={error}
          />
        )}

        {gameState.step === 'PLAYING' && (
          <div className="space-y-6">
            {/* Error Banner if any */}
            {error && (
              <div className="p-4 rounded-xl bg-red-950 border border-red-800 text-red-200 text-sm flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-400 hover:text-stone-100 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Context-Aware Theme Ambient Sound Controller Bar */}
            <AmbientSoundController
              settingName={gameState.settingName}
              worldName={gameState.worldName}
              isCombat={!!gameState.combatEncounter}
              onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            />

            {/* Active Adventuring Party Bar */}
            <PartyBar
              party={gameState.party}
              activePlayerIndex={gameState.activePlayerIndex}
              onSelectCharacter={(char) => setInspectedCharacter(char)}
            />

            {/* Quest Milestone Map */}
            {gameState.milestones.length > 0 && (
              <MilestoneTracker
                milestones={gameState.milestones}
                currentMilestoneIndex={gameState.currentMilestoneIndex}
              />
            )}

            {/* Campaign World Map Quick Preview & Navigation Banner */}
            <div className="bg-stone-900/90 border border-amber-800/60 rounded-2xl p-3.5 sm:p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3.5 backdrop-blur-sm">
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div
                  onClick={() => {
                    soundManager.playPageTurn();
                    setIsWorldMapOpen(true);
                  }}
                  className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-600/70 shadow-md shrink-0 bg-stone-950 flex items-center justify-center cursor-pointer group hover:border-amber-400 transition-colors"
                  title="Click to expand World Map"
                >
                  {gameState.worldMap?.imageUrl ? (
                    <img
                      src={gameState.worldMap.imageUrl}
                      alt="World Map"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <Compass className="w-7 h-7 text-amber-400 animate-spin [animation-duration:20s]" />
                  )}
                  <div className="absolute inset-0 bg-amber-950/20 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-amber-100 text-sm sm:text-base truncate flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                      {gameState.worldMap?.mapTitle || `World Map of ${gameState.worldName || 'The Realm'}`}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 shrink-0 hidden sm:inline-block">
                      AI Cartography
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 font-sans mt-0.5 truncate">
                    {gameState.worldMap?.currentPartyLocation ? (
                      <span>📍 Staging Camp: <strong className="text-amber-300">{gameState.worldMap.currentPartyLocation.locationName}</strong> • {gameState.worldMap.locations?.length || 6} Landmarks Discovered</span>
                    ) : (
                      <span>Explore charted territories, chapter objectives, and geographical secrets.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPageTurn();
                    setIsWorldMapOpen(true);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-serif font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Open World Map</span>
                </button>
              </div>
            </div>

            {/* Combat Overlay (when battle triggers) */}
            {gameState.combatEncounter ? (
              <CombatOverlay
                combat={gameState.combatEncounter}
                party={gameState.party}
                activePlayerIndex={gameState.activePlayerIndex}
                onAttackMonster={handleCombatAttack}
                onHealPlayer={handleCombatHeal}
                onFleeCombat={handleFleeCombat}
                onConsumeSpellSlot={handleConsumeSpellSlot}
              />
            ) : null}

            {/* Story & Narrative Log Stream */}
            <StoryLog
              history={gameState.history}
              worldName={gameState.worldName}
              worldSummary={gameState.worldSummary}
              historicalInspirations={gameState.historicalInspirations}
              activeWikiCards={gameState.activeWikiCards}
              isLoading={isLoading}
              onOpenWikiModal={(title) => setIsWikiCodexOpen(true)}
              onOpenJournal={() => setIsJournalOpen(true)}
            />

            {/* Action Controls & Choices */}
            {!gameState.combatEncounter && (
              <ActionControls
                choices={gameState.currentChoices}
                activePlayer={activePlayer}
                activePlayerIndex={gameState.activePlayerIndex}
                onSelectChoice={handleSelectChoice}
                onSubmitCustomAction={handleSubmitCustomAction}
                isLoading={isLoading}
              />
            )}
          </div>
        )}

        {/* Victory Screen */}
        {gameState.step === 'VICTORY' && (
          <div className="max-w-2xl mx-auto my-12 bg-stone-900 border-2 border-amber-500 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
              <Trophy className="w-8 h-8 animate-bounce text-amber-400" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-amber-100">
              Quest Complete & Campaign Victory!
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed">
              Your heroes navigated every milestone, conflict, and lore legacy of <strong>{gameState.worldName}</strong>. Songs of your valor will echo through the ages!
            </p>
            <button
              onClick={() => setGameState((prev) => ({ ...prev, step: 'SETUP' }))}
              className="px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-serif font-bold text-sm transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Begin a New D&D Campaign
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.step === 'GAME_OVER' && (
          <div className="max-w-2xl mx-auto my-12 bg-stone-900 border-2 border-red-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-red-200">
              The Party Has Fallen
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed">
              The darkness proved overwhelming on this journey, but the legends of <strong>{gameState.party.map((p) => p.name).join(', ')}</strong> will inspire future adventurers.
            </p>
            <button
              onClick={() => setGameState((prev) => ({ ...prev, step: 'SETUP' }))}
              className="px-8 py-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 font-serif font-bold text-sm transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again / Start New Adventure
            </button>
          </div>
        )}
      </main>

      {/* Interactive Dice Roller Modal */}
      {pendingDiceChoice && (
        <DiceRoller
          choice={pendingDiceChoice}
          character={activePlayer}
          onRollComplete={handleDiceRollComplete}
          onCancel={() => setPendingDiceChoice(null)}
        />
      )}

      {/* Wikipedia Lore Codex Drawer Modal */}
      <WikiLoreCodex
        isOpen={isWikiCodexOpen}
        onClose={() => setIsWikiCodexOpen(false)}
        activeWikiCards={gameState.activeWikiCards}
        onAddWikiTopicToCampaign={handleAddWikiTopicToCampaign}
      />

      {/* Campaign Journal Chronicle Modal */}
      <Journal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        gameState={gameState}
      />

      {/* World Map & Realm Cartography Modal */}
      <WorldMapModal
        isOpen={isWorldMapOpen}
        onClose={() => setIsWorldMapOpen(false)}
        gameState={gameState}
        onUpdateWorldMap={handleUpdateWorldMap}
      />

      {/* Audio & Ambient Soundscape Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        settingName={gameState.settingName}
        worldName={gameState.worldName}
        isCombat={!!gameState.combatEncounter}
      />

      {/* Character Inspector Sheet Modal */}
      <CharacterModal
        character={inspectedCharacter}
        onClose={() => setInspectedCharacter(null)}
        onToggleStatusEffect={handleToggleStatusEffect}
        onUpdateSpellSlots={handleUpdateSpellSlots}
        onUpdatePortrait={handleUpdatePortrait}
        onUpdateCharacter={handleUpdateCharacter}
        worldName={gameState.worldName}
        settingName={gameState.settingName}
        recentNarrative={gameState.history.slice(-1)[0]?.narrative || gameState.currentNarrative}
      />

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-5 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>D&D 5th Edition Mythic Quest • Powered by Gemini AI</p>
          <button
            onClick={() => setIsWikiCodexOpen(true)}
            className="text-stone-400 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            Learn More: Historical Inspirations & Reference Sources
          </button>
        </div>
      </footer>
    </div>
  );
}
