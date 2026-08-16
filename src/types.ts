export type Gender = 'Male' | 'Female' | "I'd rather not say";

export type CharacterClass =
  | 'Fighter'
  | 'Wizard'
  | 'Rogue'
  | 'Cleric'
  | 'Paladin'
  | 'Barbarian'
  | 'Bard'
  | 'Ranger'
  | 'Warlock'
  | 'Sorcerer'
  | 'Druid'
  | 'Monk';

export type Race =
  | 'Human'
  | 'Elf'
  | 'Dwarf'
  | 'Halfling'
  | 'Tiefling'
  | 'Dragonborn'
  | 'Half-Orc'
  | 'Gnome';

export interface Stats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export type StatusEffectType =
  | 'Poisoned'
  | 'Stunned'
  | 'Inspired'
  | 'Blessed'
  | 'Charmed'
  | 'Blinded'
  | 'Frightened'
  | 'Restrained'
  | 'Hasted'
  | 'Shielded';

export interface LevelUpFeatureSuggestion {
  name: string;
  type: 'Feature' | 'Spell' | 'Feat' | 'Action';
  description: string;
  mechanicalEffect: string;
}

export interface LevelUpAsiSuggestion {
  stats: (keyof Stats)[];
  statIncreases: Partial<Record<keyof Stats, number>>;
  name: string;
  reasoning: string;
}

export interface LevelUpSuggestionsData {
  flavorNarrative: string;
  hpAdvice: {
    hitDie: string;
    averageGain: number;
    conBonus: number;
    suggestedTotalGain: number;
  };
  asiRecommendations: LevelUpAsiSuggestion[];
  newFeatures: LevelUpFeatureSuggestion[];
  nextMilestoneSummary: string;
}

export interface Character {
  id: string;
  playerName: string;
  name: string;
  gender: Gender;
  race: Race;
  characterClass: CharacterClass;
  level: number;
  xp?: number;
  hp: number;
  maxHp: number;
  ac: number;
  stats: Stats;
  spellSlots: number;
  maxSpellSlots: number;
  inventory: string[];
  features?: string[];
  backstory: string;
  avatar: string;
  portraitUrl?: string;
  status: string;
  statusEffects?: StatusEffectType[];
  isAiControlled?: boolean;
}

export interface Milestone {
  chapter: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface ChoiceOption {
  id: string;
  text: string;
  statReq: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha' | 'combat' | 'none';
  skillName: string;
  dc: number;
}

export interface DiceRoll {
  stat: string;
  skill: string;
  d20: number;
  modifier: number;
  total: number;
  dc: number;
  isSuccess: boolean;
  isCrit: boolean;
  isFail: boolean;
  timestamp?: string;
  characterName?: string;
  advantageMode?: 'normal' | 'advantage' | 'disadvantage';
  rawRolls?: number[];
  id?: string;
}

export interface DiceRollHistoryItem extends DiceRoll {
  id: string;
  timestamp: string;
  characterName: string;
}

export interface WikiCard {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: string | null;
  originalImage?: string | null;
  contentUrl: string;
}

export interface TurnEntry {
  id: string;
  timestamp: string;
  activePlayerIndex: number;
  activePlayerName: string;
  actionText: string;
  diceRoll?: DiceRoll;
  narrative: string;
  wikiCards?: WikiCard[];
  hpChanges?: { playerIndex: number; deltaHp: number; reason: string }[];
  itemsGained?: string[];
}

export interface CombatEncounter {
  enemyName: string;
  enemyHp: number;
  maxEnemyHp: number;
  enemyAc: number;
  enemyAttackBonus: number;
  enemyDamage: string;
  description: string;
}

export interface MapLocationPin {
  id: string;
  name: string;
  type: 'capital' | 'settlement' | 'ruins' | 'dungeon' | 'landmark' | 'temple' | 'wilderness';
  x: number; // Percentage 5-95
  y: number; // Percentage 5-95
  description: string;
  dangerLevel: 'Safe' | 'Moderate' | 'Dangerous' | 'Lethal';
  discovered: boolean;
  chapterMilestone?: number;
}

export interface WorldMapData {
  imageUrl?: string;
  mapTitle: string;
  styleDescription: string;
  regionSummary: string;
  cartographerNotes?: string;
  locations: MapLocationPin[];
  currentPartyLocation: {
    x: number;
    y: number;
    locationName: string;
  };
  generatedAt?: string;
}

export type GameStep = 'SETUP' | 'PLAYING' | 'VICTORY' | 'GAME_OVER';

export interface GameState {
  step: GameStep;
  playerCount: 1 | 2 | 3 | 4;
  party: Character[];
  settingName: string;
  worldName: string;
  worldSummary: string;
  historicalInspirations: { topic: string; relevance: string }[];
  milestones: Milestone[];
  currentMilestoneIndex: number;
  history: TurnEntry[];
  activePlayerIndex: number;
  currentChoices: ChoiceOption[];
  activeWikiCards: WikiCard[];
  combatEncounter: CombatEncounter | null;
  worldMap?: WorldMapData | null;
  soundEnabled: boolean;
}
