import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper function to call Wikipedia API for article summaries and thumbnails with safe timeout
async function fetchWikipediaSummary(title: string) {
  try {
    const cleanTitle = encodeURIComponent(title.trim().replace(/ /g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${cleanTitle}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DND5EMythicQuestGenerator/1.0 (contact@example.com)" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      extract: data.extract,
      description: data.description,
      thumbnail: data.thumbnail?.source || null,
      originalImage: data.originalimage?.source || null,
      contentUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${cleanTitle}`,
    };
  } catch (error) {
    console.warn(`Wikipedia fetch skipped or timed out for "${title}":`, error);
    return null;
  }
}

// Helper to search Wikipedia with safe timeout
async function searchWikipedia(query: string) {
  try {
    const cleanQuery = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${cleanQuery}&format=json&origin=*&srlimit=5`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data?.query?.search || [];
    return results.map((item: any) => ({
      title: item.title,
      snippet: item.snippet.replace(/<[^>]*>?/gm, ""), // strip HTML
      pageid: item.pageid,
    }));
  } catch (error) {
    console.warn("Wikipedia search skipped or timed out:", error);
    return [];
  }
}

function getPronounsStr(gender?: string) {
  if (gender === 'Male') return 'he/him';
  if (gender === 'Female') return 'she/her';
  return 'they/them';
}

// Robust Procedural Adventure Generator (Fallback when API key is missing, network times out, or Gemini fails)
function createFallbackAdventure(party: any[], setting?: string, scenarioHook?: string, wikiTopics?: string[]) {
  const worldName = setting && setting !== 'custom' ? `${setting}` : 'Realm of Aethelgard';
  const heroNames = (party || []).map((p: any) => p.name).join(', ') || 'The Vanguard';
  const firstHero = (party && party[0]) || { name: 'Hero', characterClass: 'Fighter', race: 'Human', gender: 'Male' };
  const pronouns = getPronounsStr(firstHero.gender);

  return {
    worldName: worldName,
    worldSummary: `A sprawling, high-magic realm where ancient empires, celestial ley lines, and forgotten ruins converge under the watchful eyes of legendary factions.`,
    historicalInspirations: (wikiTopics && wikiTopics.length > 0 ? wikiTopics : ['Silk Road trade routes', 'Byzantine fortifications', 'Celtic hillforts']).map((t: string) => ({
      topic: t,
      relevance: `Influences the grand architecture, trading outposts, and tactical fortification styles across ${worldName}.`
    })),
    milestones: [
      { chapter: 1, title: "The Inciting Discovery", description: scenarioHook || "Investigate the ominous omen and secure the outer frontier.", completed: false },
      { chapter: 2, title: "The Deepening Shadow", description: "Uncover the conspiracy within the ancient subterranean vaults.", completed: false },
      { chapter: 3, title: "The Turning Point", description: "Reclaim the lost artifact and rally the realm's allied defenders.", completed: false },
      { chapter: 4, title: "The Final Confrontation", description: "Confront the primeval arch-nemesis at the epicenter of power.", completed: false }
    ],
    openingScene: `The wind howls across the mist-shrouded frontier of ${worldName}. The company of ${heroNames} gathers around the war table of the frontier outpost, parchment maps rustling in the chill draft.

${firstHero.name} tightens ${pronouns.split('/')[0] === 'he' ? 'his' : pronouns.split('/')[0] === 'she' ? 'her' : 'their'} grip on ${pronouns.split('/')[0] === 'he' ? 'his' : pronouns.split('/')[0] === 'she' ? 'her' : 'their'} primary armament as scouts arrive with urgent news: ${scenarioHook || "strange rumblings and ancient glyphs have surfaced near the forgotten barrows"}.

Before the party lie several crucial courses of action. Every choice will test your tactical prowess, knowledge, and resolve in the trials ahead.`,
    activePlayerIndex: 0,
    choices: [
      {
        id: "choice_1",
        text: `Scout ahead through the dense tree-line to identify enemy patrol tracks [Survival / Stealth]`,
        statReq: "wis",
        skillName: "Survival",
        dc: 12
      },
      {
        id: "choice_2",
        text: `Decipher the ancient runic carvings etched into the stone archway [Arcana]`,
        statReq: "int",
        skillName: "Arcana",
        dc: 13
      },
      {
        id: "choice_3",
        text: `Interrogate the frontier scout for strategic weaknesses in the ruins [Insight / Persuasion]`,
        statReq: "cha",
        skillName: "Insight",
        dc: 11
      },
      {
        id: "choice_4",
        text: `Draw weapons, form a battle vanguard, and march directly into the breaches [Initiative / Combat]`,
        statReq: "str",
        skillName: "Athletics",
        dc: 12
      }
    ],
    wikiSearchKeywords: (wikiTopics && wikiTopics.length > 0 ? wikiTopics.slice(0, 2) : ["Byzantine architecture", "Ancient Silk Road"])
  };
}

// Robust Procedural Next Turn Generator (Fallback when API key is missing, network times out, or Gemini fails)
function createFallbackTurn(
  worldName: string,
  currentMilestone: any,
  party: any[],
  activePlayerIndex: number,
  actionChosen: string,
  diceRoll?: any
) {
  const activePlayer = party[activePlayerIndex] || party[0] || { name: 'The Hero', characterClass: 'Fighter', race: 'Human', gender: 'Male' };
  const nextPlayerIdx = (activePlayerIndex + 1) % Math.max(1, party.length);
  const nextPlayer = party[nextPlayerIdx] || activePlayer;
  const isSuccess = diceRoll ? diceRoll.isSuccess : true;
  const isCrit = diceRoll ? diceRoll.isCrit : false;
  const isFail = diceRoll ? diceRoll.isFail : false;
  const pronouns = getPronounsStr(activePlayer.gender);
  const subjectPronoun = pronouns.split('/')[0];
  const possessive = subjectPronoun === 'he' ? 'his' : subjectPronoun === 'she' ? 'her' : 'their';

  let outcomeText = "";
  if (isCrit) {
    outcomeText = `With spectacular precision and a natural 20, ${activePlayer.name} executes "${actionChosen}" flawlessly! The party gains critical momentum, inspiring all nearby allies.`;
  } else if (isSuccess) {
    outcomeText = `${activePlayer.name} successfully resolves ${possessive} action: "${actionChosen}". Through sharp reflexes and disciplined training, ${subjectPronoun} achieves the intended objective without complication.`;
  } else if (isFail) {
    outcomeText = `With a critical stumble, ${activePlayer.name}'s attempt at "${actionChosen}" triggers unexpected resistance! The environment shifts against the heroes, testing their endurance.`;
  } else {
    outcomeText = `${activePlayer.name} falters while attempting "${actionChosen}", encountering stiff resistance. The party must recalibrate their tactical approach to bypass the obstacle.`;
  }

  const narrative = `${outcomeText}

The echoes settle through the corridors of ${worldName}. As ${activePlayer.name} steps back into the formation, the immediate area reveals fresh tactical possibilities. 

All eyes now turn to ${nextPlayer.name} (${nextPlayer.characterClass}) to dictate the company's next movement.`;

  return {
    narrative,
    activePlayerIndex: nextPlayerIdx,
    milestoneCompleted: isCrit,
    hpChanges: !isSuccess && !isFail ? [{ playerIndex: activePlayerIndex, deltaHp: -2, reason: "Minor environmental hazard" }] : [],
    itemsGained: isCrit ? ["Ancient Sunstone Amulet", "Elixir of Vitality"] : isSuccess ? ["Restorative Herbal Poultice"] : [],
    isCombat: isFail,
    combatEncounter: isFail ? {
      enemyName: "Shadow Vanguard Stalker",
      enemyHp: 18,
      maxEnemyHp: 18,
      enemyAc: 12,
      enemyAttackBonus: 3,
      enemyDamage: "1d6+2 Slashing",
      description: "A prowling armored sentinel awakened by the sudden disturbance."
    } : null,
    choices: [
      {
        id: "choice_next_1",
        text: `Advance carefully toward the illuminated inner sanctum [Perception DC 12]`,
        statReq: "wis",
        skillName: "Perception",
        dc: 12
      },
      {
        id: "choice_next_2",
        text: `Barricade the rear passage and establish a defensive perimeter [Athletics DC 13]`,
        statReq: "str",
        skillName: "Athletics",
        dc: 13
      },
      {
        id: "choice_next_3",
        text: `Channel arcane senses to detect magical wards and hidden triggers [Arcana DC 12]`,
        statReq: "int",
        skillName: "Arcana",
        dc: 12
      },
      {
        id: "choice_next_4",
        text: `Quietly search the alcoves for forgotten supply caches [Stealth / Investigation DC 11]`,
        statReq: "dex",
        skillName: "Stealth",
        dc: 11
      }
    ],
    wikiSearchKeywords: ["Medieval fortification", "Ancient citadel"]
  };
}

// Generate Adventure / Campaign Opening
app.post("/api/gemini/generate-adventure", async (req, res) => {
  const {
    party, // Array of 1-4 characters
    setting, // Setting preset or custom name
    scenarioHook, // Initial starting hook choice
    wikiTopics, // Selected Wikipedia inspiration topics
    customNotes,
  } = req.body;

  try {
    if (!ai) {
      console.warn("GEMINI_API_KEY missing - generating high quality procedural adventure fallback.");
      const fallback = createFallbackAdventure(party, setting, scenarioHook, wikiTopics);
      return res.json(fallback);
    }

    const partySummary = (party || [])
      .map(
        (p: any, i: number) =>
          `Player ${i + 1} (${p.playerName}): ${p.name}, Gender: ${p.gender || "I'd rather not say"} (Pronouns: ${getPronounsStr(p.gender)}), ${p.race} ${p.characterClass} (Level 1, HP: ${p.hp}/${p.maxHp}, AC: ${p.ac}, STR ${p.stats?.str || 10}, DEX ${p.stats?.dex || 10}, CON ${p.stats?.con || 10}, INT ${p.stats?.int || 10}, WIS ${p.stats?.wis || 10}, CHA ${p.stats?.cha || 10}) - Backstory: ${p.backstory || "Eager for adventure"}`
      )
      .join("\n");

    const prompt = `You are an expert, immersive Dungeons & Dragons 5th Edition Dungeon Master (DM).
Create a captivating campaign opening for a 1 to 4 player party.

WORLD SETTING / THEME: ${setting || "Fantasy Realm"}
STARTING HOOK: ${scenarioHook || "A mysterious artifact discovered in ancient ruins"}
WIKIPEDIA REAL-WORLD INSPIRATIONS: ${wikiTopics && wikiTopics.length > 0 ? wikiTopics.join(", ") : "Ancient Silk Road trade, Byzantine architecture, Celtic myth"}
CUSTOM NOTES: ${customNotes || "None"}

PARTY MEMBERS:
${partySummary}

STRICT PRONOUN DIRECTIVE:
When describing actions or referring to any character in the story, you MUST strictly use their designated pronouns:
- Male -> he/him/his
- Female -> she/her/hers
- "I'd rather not say" -> they/them/their

Your task:
1. Construct a rich fantasy campaign world, referencing real-world cultural, historical, or linguistic elements drawn from the provided Wikipedia inspiration topics.
2. Formulate 4 milestone objectives for the entire campaign (Chapter 1: The Inciting Incident, Chapter 2: The Deepening Shadow, Chapter 3: The Turning Point, Chapter 4: The Final Confrontation).
3. Write an evocative 3-paragraph opening narrative setting the stage, introducing the world, where the heroes are, and what immediate situation they face. Make sure to refer to the characters using their specified pronouns!
4. Present 3 to 4 distinct player action choices. Each choice must specify which D&D 5E skill check or combat action applies (e.g. "Investigate the arcane glyphs [Arcana DC 12]", "Force open the rusted iron gate [Athletics DC 14]", "Inquire quietly with the tavern keeper [Persuasion DC 11]", or "Prepare weapons for immediate battle [Initiative / Combat]").
5. Provide 2-3 specific real Wikipedia topic search terms (e.g., "Minoan civilization", "Byzantine siegecraft", "Celtic hillfort") that fit this fantasy scene so we can display real historical imagery and lore.

Format your response strictly as JSON with this schema:
{
  "worldName": "string",
  "worldSummary": "string",
  "historicalInspirations": [
    { "topic": "string", "relevance": "string" }
  ],
  "milestones": [
    { "chapter": 1, "title": "string", "description": "string", "completed": false },
    { "chapter": 2, "title": "string", "description": "string", "completed": false },
    { "chapter": 3, "title": "string", "description": "string", "completed": false },
    { "chapter": 4, "title": "string", "description": "string", "completed": false }
  ],
  "openingScene": "string (multiline narrative)",
  "activePlayerIndex": 0,
  "choices": [
    {
      "id": "choice_1",
      "text": "string description of action",
      "statReq": "str | dex | con | int | wis | cha | combat | none",
      "skillName": "Athletics | Stealth | Arcana | History | Perception | Insight | Persuasion | Deception | Intimidation | Medicine | Survival | Religion | Combat | Attack",
      "dc": 12
    }
  ],
  "wikiSearchKeywords": ["string"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            worldName: { type: Type.STRING },
            worldSummary: { type: Type.STRING },
            historicalInspirations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  relevance: { type: Type.STRING },
                },
              },
            },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapter: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                },
              },
            },
            openingScene: { type: Type.STRING },
            activePlayerIndex: { type: Type.INTEGER },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  statReq: { type: Type.STRING },
                  skillName: { type: Type.STRING },
                  dc: { type: Type.INTEGER },
                },
              },
            },
            wikiSearchKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "worldName",
            "worldSummary",
            "historicalInspirations",
            "milestones",
            "openingScene",
            "activePlayerIndex",
            "choices",
            "wikiSearchKeywords",
          ],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);

    // Automatically fetch real Wikipedia thumbnails with safe timeouts
    const keywords = data.wikiSearchKeywords || [];
    const wikiCardPromises = keywords.slice(0, 3).map((kw: string) => fetchWikipediaSummary(kw));
    const wikiCards = (await Promise.all(wikiCardPromises)).filter(Boolean);

    res.json({
      ...data,
      wikiCards,
    });
  } catch (error: any) {
    console.warn("AI generation failed or timed out, activating procedural adventure fallback:", error?.message || error);
    const fallback = createFallbackAdventure(party, setting, scenarioHook, wikiTopics);
    res.json(fallback);
  }
});

// Process Turn / Player Action
app.post("/api/gemini/next-turn", async (req, res) => {
  const {
    worldName,
    currentMilestoneIndex,
    milestones,
    party,
    activePlayerIndex,
    actionChosen, // string text or custom action
    diceRoll, // { stat: 'str', skill: 'Athletics', d20: 15, modifier: 3, total: 18, dc: 14, isSuccess: true, isCrit: false, isFail: false }
    historySummary, // last few turn narrative snippets
  } = req.body;

  const currentMilestone = (milestones && milestones[currentMilestoneIndex]) || { chapter: 1, title: "Quest", description: "Advance" };

  try {
    if (!ai) {
      console.warn("GEMINI_API_KEY missing - running procedural turn fallback.");
      const fallback = createFallbackTurn(worldName, currentMilestone, party || [], activePlayerIndex || 0, actionChosen || "Investigates", diceRoll);
      return res.json(fallback);
    }

    const activePlayer = (party && party[activePlayerIndex]) || (party && party[0]) || { name: "Hero", characterClass: "Fighter", race: "Human", gender: "Male" };

    const partyState = (party || [])
      .map(
        (p: any, i: number) =>
          `P${i + 1} (${p.playerName}): ${p.name} (${p.race} ${p.characterClass}, Gender: ${p.gender || "I'd rather not say"}, Pronouns: ${getPronounsStr(p.gender)}) - HP: ${p.hp}/${p.maxHp}, Spell Slots: ${p.spellSlots ?? 0}/${p.maxSpellSlots ?? 0}, Status Effects: ${
            p.statusEffects && p.statusEffects.length > 0 ? p.statusEffects.join(', ') : 'None'
          }`
      )
      .join("; ");

    const prompt = `You are a D&D 5th Edition Dungeon Master managing an ongoing adventure in world: "${worldName}".
CURRENT CHAPTER / MILESTONE: Chapter ${currentMilestone.chapter}: "${currentMilestone.title}" - Goal: ${currentMilestone.description}
PARTY STATUS: ${partyState}
ACTING PLAYER: ${activePlayer.name} (${activePlayer.race} ${activePlayer.characterClass}, Player ${(activePlayerIndex || 0) + 1}, Gender: ${activePlayer.gender || "I'd rather not say"}, Pronouns: ${getPronounsStr(activePlayer.gender)})

PLAYER ACTION TAKEN: "${actionChosen}"
${
  diceRoll
    ? `DICE ROLL RESULT: rolled a natural d20 of ${diceRoll.d20} + modifier ${diceRoll.modifier} = TOTAL ${diceRoll.total} vs DC ${diceRoll.dc}. RESULT: ${diceRoll.isSuccess ? "SUCCESS!" : "FAILURE!"} ${diceRoll.isCrit ? "CRITICAL HIT / NATURAL 20!" : ""} ${diceRoll.isFail ? "CRITICAL MISS / NATURAL 1!" : ""}`
    : "NO ROLL SPECIFIED (Direct / Story Action)"
}

RECENT NARRATIVE HISTORY:
${historySummary || "The journey has just begun."}

STRICT PRONOUN DIRECTIVE:
You MUST refer to each character using their designated pronouns throughout the narrative:
- Male -> he/him/his
- Female -> she/her/hers
- "I'd rather not say" -> they/them/their

Tasks:
1. Write 2-3 detailed, immersive paragraphs describing the consequences of ${activePlayer.name}'s action and roll outcome. Always refer to ${activePlayer.name} using ${getPronounsStr(activePlayer.gender)} pronouns! Incorporate D&D 5E combat details or skill outcomes seamlessly.
2. Determine if this turn advances or completes the current campaign milestone (set 'milestoneCompleted: true' if this chapter's objective was achieved!).
3. Update party HP, spell slots, inventory, or temporary status effects (such as 'Poisoned', 'Stunned', 'Inspired', 'Blessed', 'Charmed', 'Blinded', 'Frightened', 'Restrained', 'Hasted', 'Shielded').
4. Check if a Combat Encounter should begin. If yes, set 'isCombat: true' and populate monster details (name, hp, ac, attacks).
5. Pass turn to the next player (activePlayerIndex should cycle between 0 and ${(party?.length || 1) - 1}).
6. Generate 3 to 4 distinct choice options for the next acting player.
7. Provide 1-2 Wikipedia search terms for cultural, architectural, or historical imagery inspired by this scene.

Return strictly JSON matching this schema:
{
  "narrative": "string",
  "activePlayerIndex": 0,
  "milestoneCompleted": false,
  "hpChanges": [
    { "playerIndex": 0, "deltaHp": -3, "reason": "Trap needle" }
  ],
  "statusChanges": [
    { "playerIndex": 0, "addEffects": ["Poisoned"], "removeEffects": [] }
  ],
  "itemsGained": ["Health Potion", "Ancient Silver Coin"],
  "isCombat": false,
  "combatEncounter": {
    "enemyName": "string",
    "enemyHp": 20,
    "maxEnemyHp": 20,
    "enemyAc": 13,
    "enemyAttackBonus": 3,
    "enemyDamage": "1d6+2 Slashing",
    "description": "string"
  },
  "choices": [
    {
      "id": "choice_1",
      "text": "string description",
      "statReq": "str | dex | con | int | wis | cha | combat | none",
      "skillName": "Athletics | Stealth | Arcana | Perception | Persuasion | Attack",
      "dc": 12
    }
  ],
  "wikiSearchKeywords": ["string"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrative: { type: Type.STRING },
            activePlayerIndex: { type: Type.INTEGER },
            milestoneCompleted: { type: Type.BOOLEAN },
            hpChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  playerIndex: { type: Type.INTEGER },
                  deltaHp: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                },
              },
            },
            itemsGained: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            isCombat: { type: Type.BOOLEAN },
            combatEncounter: {
              type: Type.OBJECT,
              properties: {
                enemyName: { type: Type.STRING },
                enemyHp: { type: Type.INTEGER },
                maxEnemyHp: { type: Type.INTEGER },
                enemyAc: { type: Type.INTEGER },
                enemyAttackBonus: { type: Type.INTEGER },
                enemyDamage: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  statReq: { type: Type.STRING },
                  skillName: { type: Type.STRING },
                  dc: { type: Type.INTEGER },
                },
              },
            },
            wikiSearchKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "narrative",
            "activePlayerIndex",
            "milestoneCompleted",
            "choices",
            "wikiSearchKeywords",
          ],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);

    // Fetch Wikipedia thumbnails safely
    const keywords = data.wikiSearchKeywords || [];
    const wikiCardPromises = keywords.slice(0, 2).map((kw: string) => fetchWikipediaSummary(kw));
    const wikiCards = (await Promise.all(wikiCardPromises)).filter(Boolean);

    res.json({
      ...data,
      wikiCards,
    });
  } catch (error: any) {
    console.warn("Turn AI processing failed, activating procedural turn outcome fallback:", error?.message || error);
    const fallback = createFallbackTurn(worldName, currentMilestone, party || [], activePlayerIndex || 0, actionChosen || "Moves forward", diceRoll);
    res.json(fallback);
  }
});

// API Route: Journal Summarizer (Chronicle Generator)
app.post("/api/summarize-journal", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const { worldName, worldSummary, party, history, milestones } = req.body;

    const historySummary = (history || [])
      .map(
        (t: any, i: number) =>
          `[Turn ${i + 1} - ${t.activePlayerName || "Party"}] Action: ${t.actionText || "Initiated"}. Narrative: ${t.narrative}`
      )
      .join("\n\n");

    const partySummary = (party || [])
      .map((p: any) => `${p.name} (${p.race} ${p.characterClass})`)
      .join(", ");

    const prompt = `You are a master royal chronicler and bard recording the grand saga of a D&D 5E party.
Synthesize the provided turn history log into a beautifully written, structured adventure journal chronicle.

WORLD: ${worldName || "The Mythic Realm"} (${worldSummary || ""})
HEROES: ${partySummary}
MILESTONES / CHAPTERS: ${JSON.stringify(milestones || [])}

HISTORY LOG:
${historySummary}

Your task:
1. Provide an epic title for this chronicle volume.
2. Write a 2-paragraph overarching narrative chronicle of the journey so far.
3. Group the story beats into structured chapters or narrative arcs. For each arc, include a chapter title, narrative prose summary, key highlights/achievements, and an atmospheric hero quote or motto.
4. Conclude with a brief heroic evaluation of the party's legacy and standing.

Format your response strictly as JSON with this schema:
{
  "title": "string",
  "overallChronicle": "string",
  "storyBeats": [
    {
      "beatNumber": 1,
      "chapterTitle": "string",
      "summary": "string",
      "keyHighlights": ["string"],
      "heroicQuote": "string"
    }
  ],
  "partyLegacy": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            overallChronicle: { type: Type.STRING },
            storyBeats: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  beatNumber: { type: Type.INTEGER },
                  chapterTitle: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  keyHighlights: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  heroicQuote: { type: Type.STRING },
                },
                required: ["beatNumber", "chapterTitle", "summary", "keyHighlights"],
              },
            },
            partyLegacy: { type: Type.STRING },
          },
          required: ["title", "overallChronicle", "storyBeats", "partyLegacy"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error generating journal chronicle:", error);
    res.status(500).json({ error: error.message || "Failed to generate journal chronicle." });
  }
});

// API Route: Chapter Summary (Concise Single Paragraph Overview using Gemini AI)
app.post("/api/gemini/chapter-summary", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const { worldName, worldSummary, party, history, milestones, currentMilestoneIndex, targetChapter } = req.body;

    const historyEntries = history || [];
    const historySummary = historyEntries
      .map(
        (t: any, i: number) =>
          `[Turn ${i + 1} - ${t.activePlayerName || "Hero"}] Action: ${t.actionText || "Exploration"}. Narrative: ${t.narrative}`
      )
      .join("\n\n");

    const partySummary = (party || [])
      .map((p: any) => `${p.name} (${p.race} ${p.characterClass})`)
      .join(", ");

    const currentMilestone = milestones && milestones[currentMilestoneIndex] 
      ? milestones[currentMilestoneIndex] 
      : { chapter: 1, title: "The Adventure Begins", description: "The party embarks." };

    const prompt = `You are a master epic chronicler for D&D 5th Edition.
Your objective is to produce a "Chapter Summary" view that condenses the story log into a concise, evocative paragraph providing a high-level overview of the current campaign progress.

WORLD / SETTING: ${worldName || "The Mythic Realm"} (${worldSummary || ""})
ACTIVE HEROES: ${partySummary}
CURRENT MILESTONE / CHAPTER: Chapter ${currentMilestone.chapter}: ${currentMilestone.title} - ${currentMilestone.description}
CAMPAIGN MILESTONES: ${JSON.stringify(milestones || [])}
${targetChapter ? `TARGET FOCUS: Chapter ${targetChapter}` : "FOCUS: The Entire Campaign Journey To Date"}

COMPLETE STORY LOG HISTORY (${historyEntries.length} turns):
${historySummary || "The party has just set foot on their quest."}

REQUIREMENTS:
1. "condensedParagraph": Exactly one rich, engaging, concise paragraph (around 4 to 6 sentences, ~90-130 words) that captures the core narrative progression, challenges faced, key choices made, and current situation without filler.
2. "chapterHeadline": A short, gripping headline for this chapter overview (e.g., "The Descent into the Sunken Vaults of Minos").
3. "keyAchievements": An array of 3 to 4 concise bullet points summarizing major turning points, critical successes, or relics acquired.
4. "currentThreatLevel": A short descriptive phrase of current danger (e.g., "High Alert - Shadow Watchers Mobilizing", "Moderate - Approaching Inner Sanctum").
5. "nextObjective": One clear sentence summarizing the party's immediate next priority.

Format your response strictly as JSON with this schema:
{
  "chapterHeadline": "string",
  "condensedParagraph": "string",
  "keyAchievements": ["string"],
  "currentThreatLevel": "string",
  "nextObjective": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapterHeadline: { type: Type.STRING },
            condensedParagraph: { type: Type.STRING },
            keyAchievements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            currentThreatLevel: { type: Type.STRING },
            nextObjective: { type: Type.STRING },
          },
          required: [
            "chapterHeadline",
            "condensedParagraph",
            "keyAchievements",
            "currentThreatLevel",
            "nextObjective",
          ],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error generating chapter summary:", error);
    res.status(500).json({ error: error.message || "Failed to condense chapter summary." });
  }
});

// API Route: World Map Generator (AI Visual Map + Cartographic Data & Pins)
app.post("/api/gemini/generate-world-map", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const {
      worldName,
      worldSummary,
      settingName,
      milestones,
      historicalInspirations,
      mapStyle = "antique",
    } = req.body;

    const milestonesSummary = (milestones || [])
      .map((m: any) => `Chapter ${m.chapter}: ${m.title} (${m.description})`)
      .join("; ");

    const inspirationsSummary = (historicalInspirations || [])
      .map((h: any) => h.topic || h)
      .join(", ");

    const structuredPrompt = `You are a master royal cartographer and worldbuilder for D&D 5th Edition.
Generate a structured, geographically cohesive fantasy world map specification for the campaign world of "${worldName || "The Mythic Realm"}".

SETTING THEME: ${settingName || "Fantasy Realm"}
WORLD SUMMARY: ${worldSummary || "An expansive mythic land of ancient citadels and forgotten magic."}
HISTORICAL INSPIRATIONS: ${inspirationsSummary || "Ancient classical & medieval lore"}
CAMPAIGN MILESTONES / CHAPTERS: ${milestonesSummary || "Chapter 1: The Inciting Incident; Chapter 2: The Deepening Shadow; Chapter 3: The Turning Point; Chapter 4: The Final Confrontation"}
CARTOGRAPHY STYLE PREFERENCE: ${mapStyle}

TASKS:
1. Create a grand map title (e.g., "The Cartography of Aethelgard & The Sunken Isles").
2. Write an evocative regional summary describing the land's oceans, mountain ridges, primeval forests, and forgotten ruins.
3. Write a cartographer's note/warning in the voice of an ancient navigator or wizard.
4. Generate 6 to 8 key points of interest / landmarks distributed across the map coordinates (x: 10-90, y: 10-90).
   - Ensure locations match the campaign's chapters/milestones!
   - Include diverse types: 'capital', 'settlement', 'ruins', 'dungeon', 'landmark', 'temple', 'wilderness'.
   - Assign danger levels ('Safe', 'Moderate', 'Dangerous', 'Lethal').
5. Define the starting party position (x, y coordinates and name of location).
6. Create an ultra-detailed image generation prompt for an antique fantasy parchment world map image.

Format strictly as JSON with this schema:
{
  "mapTitle": "string",
  "styleDescription": "string",
  "regionSummary": "string",
  "cartographerNotes": "string",
  "locations": [
    {
      "id": "loc_1",
      "name": "string",
      "type": "capital | settlement | ruins | dungeon | landmark | temple | wilderness",
      "x": 25,
      "y": 40,
      "description": "string",
      "dangerLevel": "Safe | Moderate | Dangerous | Lethal",
      "discovered": true,
      "chapterMilestone": 1
    }
  ],
  "currentPartyLocation": {
    "x": 25,
    "y": 40,
    "locationName": "string"
  },
  "imagePrompt": "string"
}`;

    const structuredResponse = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: structuredPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mapTitle: { type: Type.STRING },
            styleDescription: { type: Type.STRING },
            regionSummary: { type: Type.STRING },
            cartographerNotes: { type: Type.STRING },
            locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  dangerLevel: { type: Type.STRING },
                  discovered: { type: Type.BOOLEAN },
                  chapterMilestone: { type: Type.INTEGER },
                },
                required: ["id", "name", "type", "x", "y", "description", "dangerLevel", "discovered"],
              },
            },
            currentPartyLocation: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                locationName: { type: Type.STRING },
              },
              required: ["x", "y", "locationName"],
            },
            imagePrompt: { type: Type.STRING },
          },
          required: ["mapTitle", "styleDescription", "regionSummary", "cartographerNotes", "locations", "currentPartyLocation", "imagePrompt"],
        },
      },
    });

    const jsonText = structuredResponse.text || "{}";
    const mapData = JSON.parse(jsonText);

    // Try AI Image generation using nano banana image model (gemini-3.1-flash-image)
    let generatedImageUrl = "";
    try {
      const visualPrompt = mapData.imagePrompt ||
        `High resolution antique fantasy cartography parchment map of "${worldName || "The Realm"}", ${settingName || "high fantasy kingdom"}. Hand-drawn sepia ink on aged textured parchment with golden illumination, ornate decorative compass rose in corner, detailed coastlines, mountain ranges, ancient castles and citadel ruins, winding rivers, sea monsters in oceans, elegant medieval calligraphy banner, D&D 5e style cartography, 8k resolution.`;

      const imageResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: {
          parts: [{ text: visualPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (imgError: any) {
      console.warn("AI Image direct generation warning (fallback image will be used if needed):", imgError?.message || imgError);
    }

    res.json({
      ...mapData,
      imageUrl: generatedImageUrl || undefined,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error generating world map:", error);
    res.status(500).json({ error: error.message || "Failed to generate world map." });
  }
});

// Generate AI Level-Up Skills, Feats & Ability Score Improvement Suggestions
app.post("/api/gemini/level-up-suggestions", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in environment variables.",
      });
    }

    const { character, nextLevel, worldName, settingName, recentNarrative } = req.body;

    if (!character) {
      return res.status(400).json({ error: "Character data is required." });
    }

    const currentLvl = character.level || 1;
    const targetLvl = nextLevel || currentLvl + 1;

    const conMod = Math.floor(((character.stats?.con || 10) - 10) / 2);

    const prompt = `You are a master D&D 5th Edition Dungeon Master and character progression advisor.
Provide strategic, flavor-rich, and mechanically accurate Level-Up suggestions for a character advancing from Level ${currentLvl} to Level ${targetLvl}.

CHARACTER PROFILE:
- Name: ${character.name} (${character.playerName})
- Race & Class: ${character.race} ${character.characterClass}
- Current Level: ${currentLvl} -> Target Level: ${targetLvl}
- Current Stats: STR ${character.stats?.str}, DEX ${character.stats?.dex}, CON ${character.stats?.con}, INT ${character.stats?.int}, WIS ${character.stats?.wis}, CHA ${character.stats?.cha}
- Existing Inventory & Gear: ${character.inventory ? character.inventory.join(', ') : 'Standard adventurer pack'}
- Backstory & Lore: "${character.backstory || 'A daring adventurer'}"
- Campaign World: ${worldName || 'The Mythic Realm'} (${settingName || 'High Fantasy'})
${recentNarrative ? `- Recent Campaign Events: "${recentNarrative.slice(0, 300)}"` : ''}

TASK:
1. Provide a flavorful 1-2 sentence narrative celebrating how ${character.name}'s trials and triumphs in ${worldName || 'the realm'} have sharpened their combat prowess or awakened new magical powers.
2. Provide Hit Point increase advice according to standard D&D 5e hit die rules for ${character.characterClass}.
3. Propose 2 to 3 distinct Ability Score Improvement (ASI) or Feat recommendations tailored to their class and current stat distribution (e.g. boosting odd ability scores to the next modifier threshold, reinforcing primary class stats like STR for Fighter/Barbarian, INT for Wizard, CHA for Bard/Paladin/Warlock, DEX for Rogue/Ranger, CON for survivability).
4. Propose 2 to 4 canonical D&D 5e class features, new spell unlock options, or combat actions gained or recommended at Level ${targetLvl} for a ${character.characterClass}. Include their exact mechanical effect.
5. Provide a brief 1-sentence summary of what this hero should focus on during their next chapter.

Return your response strictly as JSON with this schema:
{
  "flavorNarrative": "string",
  "hpAdvice": {
    "hitDie": "d6 | d8 | d10 | d12",
    "averageGain": 6,
    "conBonus": 2,
    "suggestedTotalGain": 8
  },
  "asiRecommendations": [
    {
      "name": "e.g. Primary Weapon Mastery (+2 STR) or Tough Resilience (+1 CON, +1 DEX)",
      "stats": ["str"],
      "statIncreases": { "str": 2 },
      "reasoning": "string explaining why this is optimal"
    }
  ],
  "newFeatures": [
    {
      "name": "e.g. Action Surge or Misty Step",
      "type": "Feature | Spell | Feat | Action",
      "description": "string concise flavor description",
      "mechanicalEffect": "string exact D&D 5E rule mechanics"
    }
  ],
  "nextMilestoneSummary": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flavorNarrative: { type: Type.STRING },
            hpAdvice: {
              type: Type.OBJECT,
              properties: {
                hitDie: { type: Type.STRING },
                averageGain: { type: Type.INTEGER },
                conBonus: { type: Type.INTEGER },
                suggestedTotalGain: { type: Type.INTEGER },
              },
              required: ["hitDie", "averageGain", "conBonus", "suggestedTotalGain"],
            },
            asiRecommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  stats: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  statIncreases: {
                    type: Type.OBJECT,
                    properties: {
                      str: { type: Type.INTEGER },
                      dex: { type: Type.INTEGER },
                      con: { type: Type.INTEGER },
                      int: { type: Type.INTEGER },
                      wis: { type: Type.INTEGER },
                      cha: { type: Type.INTEGER },
                    },
                  },
                  reasoning: { type: Type.STRING },
                },
                required: ["name", "stats", "statIncreases", "reasoning"],
              },
            },
            newFeatures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  description: { type: Type.STRING },
                  mechanicalEffect: { type: Type.STRING },
                },
                required: ["name", "type", "description", "mechanicalEffect"],
              },
            },
            nextMilestoneSummary: { type: Type.STRING },
          },
          required: ["flavorNarrative", "hpAdvice", "asiRecommendations", "newFeatures", "nextMilestoneSummary"],
        },
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (error: any) {
    console.error("Error generating level-up suggestions:", error);
    res.status(500).json({ error: error.message || "Failed to generate level-up suggestions." });
  }
});

// Setup Vite or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`D&D 5E Mythic Quest Server running on http://localhost:${PORT}`);
  });
}

startServer();
