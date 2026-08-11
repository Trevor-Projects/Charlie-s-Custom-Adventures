# Charlie's Custom Adventures
Charlie's Custom Adventures is an AI-powered, interactive fantasy adventure game inspired by the mechanics and spirit of tabletop Dungeons & Dragons 5th Edition. Players create a party of adventurers and embark on an AI-generated campaign where their choices, dice rolls, successes, failures, and battles shape the story. The goal is to combine the flexibility of a tabletop RPG with the accessibility of a video game: create a party, start an adventure, and let the story develop around the decisions you make.


## Features

### Character & Party Creation

Build a party of 1–4 adventurers with:

* 12 D&D-inspired character classes
* 8 playable races
* Randomized ability scores using the classic 4d6, drop-lowest method
* Automatically generated character names
* AI-generated character backstories
* Gender and pronoun support
* Character portraits
* Custom portrait uploads
* AI-controlled party members

Characters maintain their own:

* Hit Points
* Armor Class
* Ability Scores
* Spell Slots
* Inventory
* Status Effects
* Backstory
* Portrait
* Character progression

---

## AI Dungeon Master

The heart of Charlie's Custom Adventures is its AI Dungeon Master.

The game uses Google Gemini to generate an original campaign around the player's party.

The Dungeon Master can create:

* Unique worlds and settings
* Campaign premises
* Opening narratives
* Story objectives
* Player decision points
* Skill checks
* Combat encounters
* Consequences for player actions
* Continuing narrative

The current game state is provided to the Dungeon Master as the adventure progresses, including:

* Party composition
* Character statistics
* Current HP
* Spell slots
* Status effects
* Campaign chapter
* Previous actions
* Dice results
* Player decisions

This allows the story to react dynamically to what the party actually does.

---

## D&D-Inspired Gameplay

Players interact with the world by selecting actions suggested by the Dungeon Master or by entering their own actions.

Actions can result in traditional D&D-style ability checks such as:

* Athletics
* Stealth
* Arcana
* History
* Perception
* Insight
* Persuasion
* Deception
* Intimidation
* Medicine
* Survival
* Religion

The basic resolution system follows:

```text
d20 Roll
   +
Ability Modifier
   ↓
Difficulty Class
   ↓
Success / Failure
   ↓
Narrative Consequence
```

Critical successes and failures are tracked separately to make particularly memorable rolls matter.

---

## Tactical Combat

When an encounter turns hostile, the game transitions into a dedicated combat interface.

Combat currently supports:

* Enemy HP
* Enemy AC
* Attack bonuses
* Damage rolls
* Player attacks
* Spellcasting
* Cantrips
* Healing potions
* Spell slot management
* Player HP tracking
* Combat logs
* AI-controlled combat turns
* Victory and defeat states

Players can choose actions such as:

* Weapon Attack
* Cast Spell
* Drink Healing Potion
* Allow AI to control the character

The goal is for combat to feel like a natural extension of the adventure rather than a completely separate game mode.

---

## Historical Inspiration

One of the game's defining features is the **Historical Codex**.

Rather than creating completely disconnected fantasy worlds, Charlie's Custom Adventures can use real-world cultures, civilizations, architecture, mythology, and historical events as inspiration for its adventures.

Examples might include:

* Byzantine architecture
* Celtic mythology
* Ancient Silk Road cultures
* Minoan civilization
* Medieval siegecraft
* Ancient kingdoms
* Historical trade routes

The game can search Wikipedia for historical information and imagery, allowing players to explore the real-world inspirations behind their fictional adventures.

### Historical Codex

Players can:

1. Search Wikipedia from inside the game
2. Read article summaries
3. View historical imagery
4. Explore related topics
5. Add historical subjects to their campaign

Historical topics can then be incorporated into the generated fantasy world.

---

## Campaign Structure

Each adventure is divided into four major chapters.

### Chapter I — The Inciting Incident

The event that begins the heroes' journey.

### Chapter II — The Deepening Shadow

The party begins to uncover the larger threat.

### Chapter III — The Turning Point

The heroes' understanding of the conflict changes.

### Chapter IV — The Final Confrontation

The party faces the ultimate threat and determines the fate of the world.

The milestone system provides an overarching narrative structure while allowing individual encounters and player decisions to remain flexible.

---

## The Adventurer's Journal

The adventure is automatically recorded as the party plays.

The Journal tracks:

* Player actions
* Dice rolls
* Narrative events
* Items gained
* HP changes
* Campaign chapters
* Party members
* Important story beats

The game can also use AI to transform the raw adventure history into a polished campaign chronicle.

### Chronicle

A summarized version of the party's adventure.

### Timeline

A chronological record of major events.

### Roster

A record of the heroes who participated in the campaign.

The resulting chronicle can be copied and saved as a permanent record of the party's adventure.

---

## Status Effects

Characters can acquire temporary conditions during an adventure.

Currently supported effects include:

| Effect     | Description                                  |
| ---------- | -------------------------------------------- |
| Poisoned   | Disadvantage from toxins                     |
| Stunned    | Incapacitated and unable to move             |
| Inspired   | Heroic motivation granting advantage         |
| Blessed    | Bonus to attacks and saving throws           |
| Charmed    | Restrictions involving the charmer           |
| Blinded    | Attacks become more difficult                |
| Frightened | Disadvantage while facing the source of fear |
| Restrained | Speed reduced to zero                        |
| Hasted     | Increased speed and combat benefits          |
| Shielded   | Magical protection                           |

---

## Character Portraits

Characters can receive automatically selected fantasy portraits based on their class and archetype.

The game supports:

* Preset portraits
* Uploaded portraits
* Automatic image resizing
* 512×512 character portraits
* Class-based portrait selection

The goal is to make the party feel like a group of actual adventurers rather than simply a collection of statistics.

---

## Audio & Immersion

The game includes audio feedback for important events such as:

* Dice rolls
* Critical successes
* Successful actions
* Page turns
* Combat events
* Other major interactions

Audio can be enabled or disabled from the game interface.

---

# Technology

Charlie's Custom Adventures is built using:

* React
* TypeScript
* Vite
* Express
* Tailwind CSS
* Lucide React
* Motion
* Google Gemini API
* Wikipedia APIs

### Architecture

```text
┌──────────────────────────────┐
│          React UI            │
│                              │
│  Character Creation          │
│  Party Management             │
│  Story Interface              │
│  Dice Roller                  │
│  Combat                       │
│  Journal                      │
│  Historical Codex             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Express Backend        │
│                              │
│  Gemini AI                   │
│  Wikipedia API               │
│  Game Processing              │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   Google Gemini   Wikipedia
```

---

# Getting Started

## Prerequisites

You'll need:

* Node.js
* A Google Gemini API key

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd charlies-custom-adventures
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
```

Start the development server:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

# Available Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start the development server      |
| `npm run build`   | Build the production application  |
| `npm run start`   | Start the production server       |
| `npm run preview` | Preview the Vite production build |
| `npm run lint`    | Run TypeScript validation         |
| `npm run clean`   | Remove generated build files      |

---

# Environment Variables

| Variable         | Required | Description                                                    |
| ---------------- | -------: | -------------------------------------------------------------- |
| `GEMINI_API_KEY` |      Yes | Google Gemini API key used for AI Dungeon Master functionality |
| `APP_URL`        |       No | URL where the application is hosted                            |

---

# Project Structure

```text
.
├── assets/
├── src/
│   ├── assets/
│   │   └── images/
│   ├── components/
│   │   ├── ActionControls.tsx
│   │   ├── CharacterModal.tsx
│   │   ├── CombatOverlay.tsx
│   │   ├── DiceRoller.tsx
│   │   ├── Journal.tsx
│   │   ├── MilestoneTracker.tsx
│   │   ├── Navbar.tsx
│   │   ├── PartyBar.tsx
│   │   ├── PlayerSetup.tsx
│   │   ├── PortraitEditorModal.tsx
│   │   ├── StoryLog.tsx
│   │   └── WikiLoreCodex.tsx
│   ├── data/
│   │   └── presets.ts
│   ├── utils/
│   │   ├── audio.ts
│   │   └── portrait.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── types.ts
├── server.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

# Roadmap

Charlie's Custom Adventures is an evolving project.

Potential future features include:

* [ ] More complete D&D 5E rules implementation
* [ ] Character leveling
* [ ] Class abilities and features
* [ ] Expanded equipment and loot systems
* [ ] More sophisticated spell system
* [ ] Expanded monster database
* [ ] Initiative tracking
* [ ] Saving throws
* [ ] Concentration mechanics
* [ ] Expanded status effects
* [ ] NPC generation
* [ ] Procedurally generated maps
* [ ] Visual battle maps
* [ ] Persistent campaigns
* [ ] Save/load campaigns
* [ ] Multiplayer support
* [ ] Campaign sharing
* [ ] Custom campaign settings
* [ ] Expanded historical inspiration sources
* [ ] Improved AI Dungeon Master memory

---

# Disclaimer

This project is a fan-made, D&D-inspired game and is not affiliated with or endorsed by Wizards of the Coast.

The project uses concepts inspired by the Dungeons & Dragons 5th Edition ruleset while experimenting with AI-driven storytelling and game mechanics.

---

# Contributing

Contributions, ideas, bug reports, and feature requests are welcome.

If you'd like to contribute:

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/my-awesome-feature
```

3. Commit your changes

```bash
git commit -m "Add my awesome feature"
```

4. Push the branch

```bash
git push origin feature/my-awesome-feature
```

5. Open a Pull Request

---

# License

*License information coming soon.*

---




One thing I'd strongly consider next is creating a **really good README header** with a screenshot of the game, a short one-line description, and badges for the tech stack/build status. That would make the GitHub landing page feel much more like a finished game project.
