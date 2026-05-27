// ── GAME DATA ──────────────────────────────────────────────────────────
// All static game configuration. Tweak numbers, descriptions, and scaling
// here without touching any rendering or game logic code.

// ── DATA ────────────────────────────────────────────────────────────────────

const WORLDS = [
  {
    id: 1,
    name: "Ashen Forest",
    description: "The cursed woods where weak void creatures first appeared.",
    bg: "/backgrounds/forest.jpg",
    enemies: ["slime", "wolf", "goblin"],
  },
  {
    id: 2,
    name: "Crimson Caverns",
    description: "Blood-red caves filled with corrupted miners.",
    bg: "/backgrounds/cave.jpg",
    enemies: ["bat", "orc", "troll"],
  },
  {
    id: 3,
    name: "Eclipse Citadel",
    description: "The dark kingdom ruled by the Eclipse Emperor.",
    bg: "/backgrounds/eclipse.jpg",
    enemies: ["knight", "lich", "dragon"],
  },
];

const STORY_EVENTS = [
  {
    zone: 1,
    speaker: "Narrator",
    text: "The forest feels wrong. Something watches you from the shadows...",
  },
  {
    zone: 5,
    speaker: "Unknown Voice",
    text: "You should not have come here, mortal.",
  },
  {
    zone: 10,
    speaker: "Eclipse Emperor",
    text: "Your world will dissolve into darkness.",
  },
];

// One boss guards the final zone of each region — tied to the environment they inhabit.
const BOSSES = [
  {
    zone: 9,
    name: "Slime King",
    emoji: "👑",
    image: "/bosses/slime_king.png",
    idleAnim: "float",
    bgm: "boss-theme.mp3",
    regionName: "Slime Outskirts",
    regionAccent: "#3a6a20",
    intro: "The fields tremble. Something vast and acidic heaves itself toward you.",
    baseHp: 1800,
    baseGold: 180,
  },
  {
    zone: 19,
    name: "Goblin Warchief",
    emoji: "⚔️",
    image: "/bosses/goblin.png",
    idleAnim: "shake",
    bgm: "boss-theme.mp3",
    regionName: "Goblin Crags",
    regionAccent: "#6a5a20",
    intro: "Every goblin in the crags falls silent. Their Warchief emerges from the deepest pass.",
    baseHp: 12000,
    baseGold: 1200,
  },
  {
    zone: 29,
    name: "Catacomb Lord",
    emoji: "💀",
    image: "/bosses/skeleton.png",
    idleAnim: "float",
    bgm: "boss-theme.mp3",
    regionName: "The Forgotten Catacombs",
    regionAccent: "#4a3a6a",
    intro: "The catacombs go still. A king who has not rested in centuries rises to bar your path.",
    baseHp: 60000,
    baseGold: 6000,
  },
  {
    zone: 39,
    name: "Orc Warlord",
    emoji: "🏴",
    image: "/bosses/the hollow beast.png",
    idleAnim: "shake",
    bgm: "boss-theme.mp3",
    regionName: "Orcish Wastes",
    regionAccent: "#7a4a10",
    intro: "The Lich promised them the world. They burned it down first. The Warlord wants someone to pay.",
    baseHp: 280000,
    baseGold: 28000,
  },
  {
    zone: 49,
    name: "Troll Shaman King",
    emoji: "🌿",
    image: "/bosses/troll.png",
    idleAnim: "float",
    bgm: "boss-theme.mp3",
    regionName: "The Troll Marshes",
    regionAccent: "#2a5a3a",
    intro: "The marsh darkens. The Shaman King draws the eclipse sky directly into himself — and rises.",
    baseHp: 1200000,
    baseGold: 120000,
  },
  {
    zone: 59,
    name: "Pale Commander",
    emoji: "🛡️",
    image: "/bosses/dark knight.png",
    idleAnim: "float",
    bgm: "boss-theme.mp3",
    regionName: "Citadel Approach",
    regionAccent: "#3a3a7a",
    intro: "The first paladin to accept immortality. He has been marching this road for a thousand years.",
    baseHp: 5000000,
    baseGold: 500000,
  },
  {
    zone: 69,
    name: "Corrupted Dragon",
    emoji: "🐉",
    image: "/bosses/dragon.png",
    idleAnim: "dragonHover",
    bgm: "boss-theme.mp3",
    regionName: "The Dragon Highlands",
    regionAccent: "#7a2a10",
    intro: "The greatest dragon — its mind rewritten. It circles down from the volcanic ridges, no longer free.",
    baseHp: 20000000,
    baseGold: 2000000,
  },
  {
    zone: 99,
    name: "Eclipse Emperor",
    emoji: "🌑",
    image: "/bosses/eclips emperor.png",
    idleAnim: "dragonHover",
    bgm: "final-boss.mp3",
    regionName: "The Obsidian Citadel",
    regionAccent: "#5a1a1a",
    intro: "The Lich King stands at the heart of it. He has watched you die before. He is ready to watch again.",
    baseHp: 100000000,
    baseGold: 10000000,
  },
];

// Fast lookup set for boss zone checks
const BOSS_ZONES = new Set(BOSSES.map(b => b.zone));

// Retreat / Exhaustion system
// Time the player has to kill a normal enemy before retreating (scales with zone)
const ENEMIES = [
  {
    id: "slime",
    name: "Slime",
    enemyKey: "slime",
    emoji: "🟢",
    image: "/monsters/slime.png",
    idleAnim: "float",
    baseHp: 20,
    baseGold: 3,
    zone: 1,
  },
  {
    id: "goblin",
    name: "Goblin",
    enemyKey: "goblin",
    emoji: "👺",
    image: "/monsters/goblin.png",
    idleAnim: "shake",
    baseHp: 60,
    baseGold: 8,
    zone: 2,
  },
  {
    id: "skeleton",
    name: "Skeleton",
    enemyKey: "skeleton",
    emoji: "💀",
    image: "/monsters/skeleton.png",
    idleAnim: "float",
    baseHp: 150,
    baseGold: 18,
    zone: 3,
  },
  {
    id: "orc",
    name: "Orc",
    enemyKey: "orc",
    emoji: "👹",
    image: "/monsters/orc.png",
    idleAnim: "float",
    baseHp: 350,
    baseGold: 40,
    zone: 4,
  },
  {
    id: "troll",
    name: "Troll",
    enemyKey: "troll",
    emoji: "🧌",
    image: "/monsters/troll.png",
    idleAnim: "float",
    baseHp: 800,
    baseGold: 90,
    zone: 5,
  },
  {
    id: "dark_knight",
    name: "Dark Knight",
    enemyKey: "knight",
    emoji: "🛡️",
    image: "/monsters/knight.png",
    idleAnim: "float",
    baseHp: 2000,
    baseGold: 220,
    zone: 6,
  },
  {
    id: "dragon",
    name: "Dragon",
    enemyKey: "dragon",
    emoji: "🐉",
    image: "/monsters/dragon.gif",
    idleAnim: "dragonHover",
    baseHp: 6000,
    baseGold: 600,
    zone: 7,
  },
  {
    id: "lich",
    name: "Lich King",
    enemyKey: "lich",
    emoji: "☠️",
    image: "/monsters/lich king.png",
    idleAnim: "float",
    baseHp: 20000,
    baseGold: 2000,
    zone: 8,
  },
  {
    id: "vampire",
    name: "Vampire Lord",
    enemyKey: "vampire",
    emoji: "🧛",
    image: "/monsters/vampire.png",
    idleAnim: "float",
    baseHp: 55000,
    baseGold: 5500,
    zone: 11,
  },
  {
    id: "demon",
    name: "Chaos Demon",
    enemyKey: "demon",
    emoji: "😈",
    image: "/monsters/demon.png",
    idleAnim: "shake",
    baseHp: 150000,
    baseGold: 15000,
    zone: 16,
  },
  {
    id: "iron_golem",
    name: "Iron Golem",
    enemyKey: "golem",
    emoji: "🗿",
    image: "/monsters/golem.png",
    idleAnim: "float",
    baseHp: 400000,
    baseGold: 40000,
    zone: 22,
  },
  {
    id: "void_wraith",
    name: "Void Wraith",
    enemyKey: "wraith",
    emoji: "👻",
    image: "/monsters/wraith.png",
    idleAnim: "dragonHover",
    baseHp: 1200000,
    baseGold: 120000,
    zone: 30,
  },
];
// Pre-sorted copy of ENEMIES by zone descending for getEnemyForZone lookups.
// We use a copy so ENEMIES retains its original insertion order (slime first, etc.)
// which is relied on by index-based lookups in getEnemyForZone.
const ENEMIES_BY_ZONE = [...ENEMIES].sort((a, b) => b.zone - a.zone);

const HEROES = [
  // acquisition: { kind: 'start' | 'shop' | 'chest' | 'realmoney', note: string }
  // passive: { type: 'dmgMult'|'goldMult'|'cdReduce'|'clickAdd'|'dpsAdd', value: number }
  { id: "squire",   rarity: "Common",    name: "Squire",       emoji: "🧑‍⚔️", baseDps: 1,    baseCost: 15,    costMult: 1.15, lore: "A farmboy who survived the first eclipse. He fights because nobody else will.", acquisition: { kind: "start", note: "You begin with him." }, passive: { type: "clickAdd", value: 1 } },
  { id: "archer",   rarity: "Common",    name: "Archer",       emoji: "🏹",  baseDps: 5,    baseCost: 100,   costMult: 1.15, lore: "Her forest was swallowed by darkness. She shoots arrows toward a horizon she can't see.", acquisition: { kind: "chest", note: "Drops from Goblin Crags chests." }, passive: { type: "dmgMult", value: 0.05 } },
  { id: "mage",     rarity: "Rare",      name: "Mage",         emoji: "🧙",  baseDps: 20,   baseCost: 500,   costMult: 1.15, lore: "Refused to flee when the eclipse came. His tower is rubble, but his spells survive.", acquisition: { kind: "shop", note: "Available after unlocking Mage training." }, passive: { type: "cdReduce", value: 0.02 } },
  { id: "paladin",  rarity: "Rare",      name: "Paladin",      emoji: "⚔️",  baseDps: 80,   baseCost: 2000,  costMult: 1.15, lore: "One of the last who refused the Lich's offer of immortality. He fights as penance.", acquisition: { kind: "realmoney", note: "Limited Relic Store offer." }, passive: { type: "goldMult", value: 0.05 } },
  { id: "assassin", rarity: "Epic",      name: "Assassin",     emoji: "🗡️",  baseDps: 300,  baseCost: 8000,  costMult: 1.15, lore: "Sold her blade to the highest bidder until the eclipse swallowed them all. Now one cause remains.", acquisition: { kind: "chest", note: "Rare chest drop (Skeleton Catacombs)." }, passive: { type: "dpsAdd", value: 0.02 } },
  { id: "dragon",   rarity: "Epic",      name: "Dragon Rider", emoji: "🐲",  baseDps: 1200, baseCost: 35000, costMult: 1.15, lore: "The last free dragon chose a rider. Neither fully understands why. Both are grateful.", acquisition: { kind: "chest", note: "Rare drop from Dragon Highlands chests." }, passive: { type: "dmgMult", value: 0.10 } },
  { id: "titan",    rarity: "Legendary", name: "Titan Guard",  emoji: "🗿",  baseDps: 5000, baseCost: 150000,costMult: 1.15, lore: "An ancient stone guardian reawakened by the first eclipse-quake. It has no allegiance — only purpose.", acquisition: { kind: "chest", note: "Obsidian Citadel chest reward." }, passive: { type: "goldMult", value: 0.08 } },
  { id: "seraph",   rarity: "Legendary", name: "Seraph",       emoji: "😇",  baseDps: 20000,baseCost: 800000,costMult: 1.15, lore: "Fell through a crack in the sky when the eclipse weakened the veil. It fights beside mortals, awed and confused.", acquisition: { kind: "realmoney", note: "Heavenbound offer." }, passive: { type: "clickAdd", value: 3 } },
];


const UPGRADES = [
  { id: "click1", name: "Sharp Blade",      desc: "+5 click dmg",    cost: 50,     type: "click", value: 5 },
  { id: "click2", name: "Battle Axe",       desc: "+20 click dmg",   cost: 500,    type: "click", value: 20 },
  { id: "click3", name: "Holy Sword",       desc: "+100 click dmg",  cost: 5000,   type: "click", value: 100 },
  { id: "click4", name: "Eclipse Breaker",  desc: "+1K click dmg",   cost: 100000, type: "click", value: 1000 },
  // Tier 1 — ×2 DPS (unlock immediately)
  { id: "hero1",  name: "Squire Training",  desc: "Squire ×2 DPS",   cost: 200,    type: "hero",  heroId: "squire",   mult: 2 },
  { id: "hero2",  name: "Eagle Eye",        desc: "Archer ×2 DPS",   cost: 1000,   type: "hero",  heroId: "archer",   mult: 2 },
  { id: "hero3",  name: "Arcane Tome",      desc: "Mage ×2 DPS",     cost: 5000,   type: "hero",  heroId: "mage",     mult: 2 },
  { id: "hero4",  name: "Divine Shield",    desc: "Paladin ×2 DPS",  cost: 20000,  type: "hero",  heroId: "paladin",  mult: 2 },
  { id: "hero5",  name: "Shadow Contract",  desc: "Assassin ×2 DPS", cost: 80000,  type: "hero",  heroId: "assassin", mult: 2 },
  { id: "hero6",  name: "Dragon Pact",      desc: "Dragon Rider ×2", cost: 400000, type: "hero",  heroId: "dragon",   mult: 2 },
  // Tier 2 — ×4 DPS (requires hero Lv50)
  { id: "hero1b", name: "Squire Mastery",       desc: "Squire ×4 DPS",       cost: 5000,     type: "hero", heroId: "squire",   mult: 4, reqLevel: 50 },
  { id: "hero2b", name: "Hawkeye Discipline",   desc: "Archer ×4 DPS",       cost: 25000,    type: "hero", heroId: "archer",   mult: 4, reqLevel: 50 },
  { id: "hero3b", name: "Grand Codex",          desc: "Mage ×4 DPS",         cost: 100000,   type: "hero", heroId: "mage",     mult: 4, reqLevel: 50 },
  { id: "hero4b", name: "Sacred Oath",          desc: "Paladin ×4 DPS",      cost: 500000,   type: "hero", heroId: "paladin",  mult: 4, reqLevel: 50 },
  { id: "hero5b", name: "Blood Covenant",       desc: "Assassin ×4 DPS",     cost: 2000000,  type: "hero", heroId: "assassin", mult: 4, reqLevel: 50 },
  { id: "hero6b", name: "Draconic Resonance",   desc: "Dragon Rider ×4 DPS", cost: 10000000, type: "hero", heroId: "dragon",   mult: 4, reqLevel: 50 },
  // Tier 3 — ×8 DPS (requires hero Lv100)
  { id: "hero1c", name: "Squire Legendary",     desc: "Squire ×8 DPS",       cost: 50000,     type: "hero", heroId: "squire",   mult: 8, reqLevel: 100 },
  { id: "hero2c", name: "Deadeye Ascension",    desc: "Archer ×8 DPS",       cost: 250000,    type: "hero", heroId: "archer",   mult: 8, reqLevel: 100 },
  { id: "hero3c", name: "Void Equation",        desc: "Mage ×8 DPS",         cost: 1000000,   type: "hero", heroId: "mage",     mult: 8, reqLevel: 100 },
  { id: "hero4c", name: "Eclipse Warden",       desc: "Paladin ×8 DPS",      cost: 5000000,   type: "hero", heroId: "paladin",  mult: 8, reqLevel: 100 },
  { id: "hero5c", name: "Void Marked",          desc: "Assassin ×8 DPS",     cost: 20000000,  type: "hero", heroId: "assassin", mult: 8, reqLevel: 100 },
  { id: "hero6c", name: "Dragon Sovereign",     desc: "Dragon Rider ×8 DPS", cost: 100000000, type: "hero", heroId: "dragon",   mult: 8, reqLevel: 100 },
];

// Hero level milestones — landmark levels granting damage multipliers
const HERO_MILESTONES = [
  { level: 25,  mult: 2, label: "×2" },
  { level: 50,  mult: 4, label: "×4" },
  { level: 100, mult: 8, label: "×8" },
];

const ACQ_LABEL = { start: "Starting Hero", shop: "Gold Shop", chest: "Chest Drop", realmoney: "Relic Store" };
const ACQ_EMOJI = { start: "⭐", shop: "🏪", chest: "🎁", realmoney: "💎" };

// Artifact tree — bought with Soul Crystals from rebirth
const ARTIFACT_UPGRADES = [
  { id: "art_gold1",    name: "Gilded Wake",       emoji: "🪙", desc: "+10% gold drops",         cost: 1, type: "gold",     value: 0.10 },
  { id: "art_gold2",    name: "Fortune's Tide",    emoji: "💰", desc: "+25% gold drops",         cost: 2, type: "gold",     value: 0.25 },
  { id: "art_gold3",    name: "Eclipse Hoard",     emoji: "👑", desc: "+50% gold drops",         cost: 4, type: "gold",     value: 0.50 },
  { id: "art_cd1",      name: "Swift Strike",      emoji: "⚡", desc: "-10% ability cooldowns",  cost: 1, type: "cooldown", value: 0.10 },
  { id: "art_cd2",      name: "Relentless Flow",   emoji: "🌀", desc: "-20% ability cooldowns",  cost: 2, type: "cooldown", value: 0.20 },
  { id: "art_click1",   name: "Iron Resolve",      emoji: "🗡️", desc: "+20% click damage",       cost: 1, type: "clickMult",value: 0.20 },
  { id: "art_click2",   name: "Sundered Edge",     emoji: "⚔️", desc: "+50% click damage",       cost: 3, type: "clickMult",value: 0.50 },
  { id: "art_dps1",     name: "Warcry Echo",       emoji: "📯", desc: "+15% all hero DPS",       cost: 2, type: "dpsMult",  value: 0.15 },
  { id: "art_dps2",     name: "Soul Resonance",    emoji: "💎", desc: "+30% all hero DPS",       cost: 3, type: "dpsMult",  value: 0.30 },
  { id: "art_synergy1", name: "Bound Spirits",     emoji: "🧭", desc: "Companions deal 5% of click dmg (synergy)", cost: 2, type: "synergy", value: 0.05 },
  { id: "art_synergy2", name: "Eclipse Bond",      emoji: "🔮", desc: "Companions deal 12% of click dmg (synergy)", cost: 4, type: "synergy", value: 0.12 },
];

// Boss loot — equippable items dropped at 10% chance on zone milestone kills
const LOOT_PREFIXES = ["Ancient", "Cursed", "Sunken", "Blazing", "Spectral", "Obsidian", "Voidforged", "Lich-Touched"];
const LOOT_TYPES = [
  { type: "Sword",   slot: "weapon", emoji: "🗡️", stat: "clickMult", label: "Click Dmg" },
  { type: "Armor",   slot: "chest",  emoji: "🛡️", stat: "dpsMult",   label: "Hero DPS"  },
  { type: "Ring",    slot: "ring",   emoji: "💍", stat: "gold",      label: "Gold Drop" },
  { type: "Amulet",  slot: "amulet", emoji: "📿", stat: "cdReduce",  label: "CD Reduce" },
  { type: "Helmet",  slot: "helmet", emoji: "⛑️", stat: "dpsMult",   label: "Hero DPS"  },
  { type: "Gloves",  slot: "gloves", emoji: "🧤", stat: "clickMult", label: "Click Dmg" },
  { type: "Boots",   slot: "boots",  emoji: "👢", stat: "gold",      label: "Gold Drop" },
];

// Equipment slot definitions for the character paperdoll
const EQUIP_SLOTS = [
  { id: "helmet", label: "Helmet",  emoji: "⛑️", position: "top-left"     },
  { id: "chest",  label: "Chest",   emoji: "🛡️", position: "mid-left"     },
  { id: "gloves", label: "Gloves",  emoji: "🧤", position: "bot-left"     },
  { id: "boots",  label: "Boots",   emoji: "👢", position: "bot-left2"    },
  { id: "weapon", label: "Weapon",  emoji: "🗡️", position: "top-right"    },
  { id: "ring1",  label: "Ring I",  emoji: "💍", position: "mid-right"    },
  { id: "ring2",  label: "Ring II", emoji: "💍", position: "mid-right2"   },
  { id: "amulet", label: "Amulet",  emoji: "📿", position: "bot-right"    },
];

// ── RARITY SYSTEM ─────────────────────────────────────────────────────────────
const RARITIES = {
  Common:    { label: "Common",    color: "#8a8a8a", glow: "#8a8a8a44", border: "#3a3a3a" },
  Rare:      { label: "Rare",      color: "#3a8aee", glow: "#3a8aee44", border: "#1a4a88" },
  Epic:      { label: "Epic",      color: "#9944dd", glow: "#9944dd44", border: "#5a1a99" },
  Legendary: { label: "Legendary", color: "#f5c518", glow: "#f5c51844", border: "#8a7010" },
};

const COMPANIONS = [
  {
    id: "dusk",
    name: "Dusk",
    title: "The Wandering Blade",
    emoji: "🧭",
    lore: "A sellsword who lost his memory when the Eclipse fell. He fights not for glory — only to remember who he was.",
    baseDmg: 2,
    interval: 500,
    baseCost: 75,
    costMult: 1.2,
  },
  {
    id: "mira",
    name: "Mira",
    title: "Shadow Scout",
    emoji: "🏹",
    lore: "She maps the corrupted lands one arrow at a time, leaving marks so others may find their way.",
    baseDmg: 10,
    interval: 700,
    baseCost: 500,
    costMult: 1.2,
  },
  {
    id: "aldric",
    name: "Brother Aldric",
    title: "Last Cleric of Dawn",
    emoji: "☀️",
    lore: "His order was destroyed in the first night of the Eclipse. He prays to the hidden sun anyway.",
    baseDmg: 35,
    interval: 1000,
    baseCost: 3000,
    costMult: 1.2,
  },
  {
    id: "zeph",
    name: "Zeph",
    title: "The Void Dancer",
    emoji: "🌀",
    lore: "Zeph slips between the cracks of fractured time, striking where corruption least expects.",
    baseDmg: 120,
    interval: 600,
    baseCost: 15000,
    costMult: 1.2,
  },
  {
    id: "lyra",
    name: "Lyra",
    title: "Archmage of the Broken Tower",
    emoji: "🔮",
    lore: "She converted her ruined tower into a beacon. Every spell is a message: we are still here.",
    baseDmg: 500,
    interval: 1500,
    baseCost: 80000,
    costMult: 1.2,
  },
  {
    id: "vex",
    name: "Commander Vex",
    title: "The Eternal Soldier",
    emoji: "💀",
    lore: "Vex has died and returned seventeen times. Each Rebirth makes him stronger. He understands your burden.",
    baseDmg: 2000,
    interval: 2000,
    baseCost: 500000,
    costMult: 1.2,
  },
];

// ── COMPANION ABILITIES ───────────────────────────────────────────────────────
// Each companion unlocks an ability when recruited (level >= 1).
// Ability power scales through 4 tiers based on companion level.
// Effects: burstDmg (% of currentEnemy maxHp), clickBuff (mult for duration),
//          goldBuff (mult for duration), dpsBuff (mult for duration),
//          healPercent (restores nothing — visual only, but adds feel),
//          slowField (reduces effective enemy hp regeneration — reflected as burst dmg)
// auto: always true — fires automatically when cooldown expires, no manual press.

const COMPANION_ABILITIES = [
  {
    compId: "dusk",
    id: "ca_dusk",
    name: "Phantom Strike",
    emoji: "🗡️",
    color: "#88aaff",
    origin: "A memory surfaces — a single perfect cut, from a life before the Eclipse.",
    // Thematic: sellsword, lost memory — single devastating strike (burst damage)
    tiers: [
      { minLevel: 1,  desc: "Deal 30% enemy max HP as burst",  cooldown: 20000, effect: { burstDmgPct: 0.30 } },
      { minLevel: 10, desc: "Deal 60% enemy max HP as burst",  cooldown: 18000, effect: { burstDmgPct: 0.60 } },
      { minLevel: 25, desc: "Deal 100% enemy max HP as burst", cooldown: 15000, effect: { burstDmgPct: 1.00 } },
      { minLevel: 50, desc: "Deal 200% enemy max HP as burst", cooldown: 12000, effect: { burstDmgPct: 2.00 } },
    ],
  },
  {
    compId: "mira",
    id: "ca_mira",
    name: "Rain of Arrows",
    emoji: "🏹",
    color: "#aaee55",
    origin: "Every arrow she fires is a mark on the map — she never forgets where she's been.",
    // Thematic: scout, mapper — rapid volley boosting all DPS briefly
    tiers: [
      { minLevel: 1,  desc: "+50% Hero DPS for 6s",  cooldown: 25000, effect: { dpsBuff: 0.50, dur: 6000 } },
      { minLevel: 10, desc: "+100% Hero DPS for 8s",  cooldown: 22000, effect: { dpsBuff: 1.00, dur: 8000 } },
      { minLevel: 25, desc: "+200% Hero DPS for 10s", cooldown: 18000, effect: { dpsBuff: 2.00, dur: 10000 } },
      { minLevel: 50, desc: "+400% Hero DPS for 12s", cooldown: 14000, effect: { dpsBuff: 4.00, dur: 12000 } },
    ],
  },
  {
    compId: "aldric",
    id: "ca_aldric",
    name: "Dawn's Blessing",
    emoji: "☀️",
    color: "#ffdd44",
    origin: "He speaks a prayer to the hidden sun. For a moment, everyone fights a little harder.",
    // Thematic: cleric, dawn — gold aura (prayers turn enemies' greed against them)
    tiers: [
      { minLevel: 1,  desc: "2× Gold drops for 8s",  cooldown: 30000, effect: { goldBuff: 2,   dur: 8000 } },
      { minLevel: 10, desc: "3× Gold drops for 10s", cooldown: 26000, effect: { goldBuff: 3,   dur: 10000 } },
      { minLevel: 25, desc: "4× Gold drops for 12s", cooldown: 22000, effect: { goldBuff: 4,   dur: 12000 } },
      { minLevel: 50, desc: "6× Gold drops for 15s", cooldown: 16000, effect: { goldBuff: 6,   dur: 15000 } },
    ],
  },
  {
    compId: "zeph",
    id: "ca_zeph",
    name: "Void Step",
    emoji: "🌀",
    color: "#cc77ff",
    origin: "Zeph slips sideways through fractured time, striking from directions that shouldn't exist.",
    // Thematic: time dancer — click multiplier (striking from many timelines at once)
    tiers: [
      { minLevel: 1,  desc: "3× Click damage for 5s",  cooldown: 22000, effect: { clickBuff: 3, dur: 5000 } },
      { minLevel: 10, desc: "5× Click damage for 7s",  cooldown: 19000, effect: { clickBuff: 5, dur: 7000 } },
      { minLevel: 25, desc: "8× Click damage for 9s",  cooldown: 16000, effect: { clickBuff: 8, dur: 9000 } },
      { minLevel: 50, desc: "15× Click damage for 12s",cooldown: 12000, effect: { clickBuff: 15,dur: 12000 } },
    ],
  },
  {
    compId: "lyra",
    id: "ca_lyra",
    name: "Arcane Nova",
    emoji: "🔮",
    color: "#ff88cc",
    origin: "The beacon fires. Every surviving mage within a hundred leagues feels it — and fights harder.",
    // Thematic: archmage, tower — massive burst + brief DPS amp
    tiers: [
      { minLevel: 1,  desc: "50% HP burst + +80% DPS 6s",   cooldown: 35000, effect: { burstDmgPct: 0.50, dpsBuff: 0.80, dur: 6000 } },
      { minLevel: 10, desc: "100% HP burst + +150% DPS 8s",  cooldown: 30000, effect: { burstDmgPct: 1.00, dpsBuff: 1.50, dur: 8000 } },
      { minLevel: 25, desc: "200% HP burst + +300% DPS 10s", cooldown: 24000, effect: { burstDmgPct: 2.00, dpsBuff: 3.00, dur: 10000 } },
      { minLevel: 50, desc: "400% HP burst + +600% DPS 12s", cooldown: 18000, effect: { burstDmgPct: 4.00, dpsBuff: 6.00, dur: 12000 } },
    ],
  },
  {
    compId: "vex",
    id: "ca_vex",
    name: "Eclipse Veteran",
    emoji: "💀",
    color: "#cc3333",
    origin: "Vex has fought this enemy seventeen times. He knows exactly where to hit.",
    // Thematic: eternal soldier, reborn — stacks ALL buffs simultaneously (click + DPS + gold + burst)
    tiers: [
      { minLevel: 1,  desc: "2× Click+DPS+Gold for 5s",  cooldown: 45000, effect: { clickBuff: 2,  dpsBuff: 1.00, goldBuff: 2,  dur: 5000,  burstDmgPct: 0.20 } },
      { minLevel: 10, desc: "3× Click+DPS+Gold for 8s",  cooldown: 40000, effect: { clickBuff: 3,  dpsBuff: 2.00, goldBuff: 3,  dur: 8000,  burstDmgPct: 0.50 } },
      { minLevel: 25, desc: "5× Click+DPS+Gold for 10s", cooldown: 32000, effect: { clickBuff: 5,  dpsBuff: 4.00, goldBuff: 5,  dur: 10000, burstDmgPct: 1.00 } },
      { minLevel: 50, desc: "8× Click+DPS+Gold for 15s", cooldown: 24000, effect: { clickBuff: 8,  dpsBuff: 8.00, goldBuff: 8,  dur: 15000, burstDmgPct: 2.00 } },
    ],
  },
];

// Get the current tier for a companion ability based on level
const ABILITIES = [
  { id: "berserk",   name: "Berserker", emoji: "💢", desc: "10× click dmg", duration: 5000,  cooldown: 15000, color: "#cc2200" },
  { id: "battlecry", name: "Battle Cry",emoji: "📯", desc: "2× all dmg",   duration: 5000,  cooldown: 30000, color: "#f5c518" },
  { id: "goldrush",  name: "Gold Rush", emoji: "✨", desc: "2× gold drops", duration: 10000, cooldown: 60000, color: "#44cc88" },
];

// Rebirth milestone unlocks — permanent perks earned on specific rebirth counts
const REBIRTH_MILESTONES = [
  { count: 1,  emoji: "🌅", title: "First Dawn",          desc: "Start each run with 50 bonus gold",          type: "startGold",     value: 50 },
  { count: 2,  emoji: "⚔️", title: "Battle-Hardened",     desc: "Click damage starts at +5 baseline per run", type: "baseClickBonus", value: 5 },
  { count: 3,  emoji: "🧭", title: "Old Routes",           desc: "Offline earnings cap raised to 6 hours",     type: "offlineCap",    value: 6 },
  { count: 5,  emoji: "👥", title: "Loyal Companions",     desc: "Start each run with Dusk already recruited",  type: "startCompanion",value: "dusk" },
  { count: 7,  emoji: "💰", title: "Hoarder's Legacy",     desc: "+25% gold from all kills permanently",        type: "goldBonus",     value: 0.25 },
  { count: 10, emoji: "♾️", title: "Eternal Commander",    desc: "Offline earnings cap raised to 8 hours",     type: "offlineCap",    value: 8 },
];

// Commander Paths — chosen once per Rebirth, reset each cycle
const COMMANDER_PATHS = [
  {
    id: "vanguard",
    name: "The Vanguard",
    emoji: "⚔️",
    color: "#cc4422",
    subtitle: "Active Click Focus",
    lore: "You are the blade itself. Your hand never rests, your strikes never falter. The Eclipse bleeds where you point.",
    bonuses: ["×2 all click damage", "Berserker cooldown −50%"],
  },
  {
    id: "tactician",
    name: "The Tactician",
    emoji: "📯",
    color: "#c8900a",
    subtitle: "Idle DPS Focus",
    lore: "Generals win wars, not soldiers. You command from high ground, and your army fights twice as hard for it.",
    bonuses: ["+40% Hero & Companion DPS", "+20% gold from every kill"],
  },
  {
    id: "void_mage",
    name: "The Void Mage",
    emoji: "🔮",
    color: "#8844cc",
    subtitle: "Ability Synergist",
    lore: "The fractures in time are tools, not obstacles. You bend the eclipse's own dark energy back against its master.",
    bonuses: ["+5s to all ability durations", "Max 3 weak points on screen", "Weak point crits deal ×4 damage"],
  },
];

// Story lore unlocked by zone
const ZONE_LORE = [
  { zone: 1,  text: "The Eclipse fell three years ago. The Lich King shattered time itself to plunge the world into endless night. You are the Eternal Commander — the only one who remembers every lifetime." },
  { zone: 3,  text: "Goblin warbands roam freely now, emboldened by the dark. They say the Lich King promised them the moon." },
  { zone: 5,  text: "Skeleton legions patrol the old roads — soldiers who died in the first wave, reanimated by the Lich's will. Friends, once." },
  { zone: 10, text: "You begin to sense the fracture in time. Déjà vu. You have fought this Orc before. You will again. The question is: how much stronger can you become?" },
  { zone: 15, text: "Trolls have built crude temples to the endless night. They worship the Eclipse as a god. They do not know it is a cage." },
  { zone: 20, text: "Dark Knights — fallen paladins who pledged allegiance to the Lich for immortality. They got it. They regret it." },
  { zone: 30, text: "Dragon bones litter the sky roads. The Lich turned the great ones into weapons. A few still resist in the deep valleys." },
  { zone: 40, text: "You can feel him watching now. The Lich King has seen you die before. He does not understand why you keep returning." },
  { zone: 50, text: "The fracture in time is wide enough. You feel the pull of Rebirth. Another lifetime. Another chance. Each death is a step." },
  { zone: 75, text: "Your companions remember fragments across lifetimes. Dusk almost recalled his name today. The Eclipse is thinning — barely." },
  { zone: 100, text: "One hundred zones. The Lich King's fortress looms on the horizon of every vision. You will reach it. You always do." },
];

// Map regions — zone ranges with flavour
const REGIONS = [
  {
    minZone: 1,  maxZone: 9,
    name: "The Slime Outskirts", emoji: "🌾", accent: "#3a6a20",
    desc: "Once-peaceful farmland, now overrun by acidic oozes seeping from the eclipse wounds in the earth.",
    lore: "Three years ago these fields fed a dozen villages. Farmers left their tools in the soil and never came back — some fled, some were taken, some simply dissolved when the ooze reached their doorsteps. The crops still grow here, twisted and wrong, fed by whatever the slimes leave behind. You can still see the scarecrows standing in rows. They don't frighten anything anymore. The slimes drift between them like they own the place. Which, perhaps now, they do.",
  },
  {
    minZone: 10, maxZone: 19,
    name: "Goblin Crags", emoji: "⛰️", accent: "#6a5a20",
    desc: "A rocky labyrinth where goblin ambushers pick apart traveling merchants and lost patrols.",
    lore: "The goblins didn't cause the Eclipse — they simply moved in after it happened, like vermin into an abandoned house. The merchant road through these crags once carried silk and spice from the eastern ports. Now it carries nothing. Goblin warchiefs have staked out every choke point, every narrow pass, every blind corner. They squabble constantly over territory, which is the only reason any traveler gets through at all. The infighting keeps them distracted. Barely.",
  },
  {
    minZone: 20, maxZone: 29,
    name: "The Forgotten Catacombs", emoji: "🪦", accent: "#4a3a6a",
    desc: "Where the restless skeletons of ancient soldiers guard rusted armor and oaths made to dead kings.",
    lore: "Beneath the old capital lie centuries of buried soldiers, sealed in stone and given their final rites. The Lich King's first act was to unseal every tomb he could find. These men and women died with honor. They rise without it — their personalities scraped out, their bodies reduced to weapons. Somewhere beneath these corridors, there are names carved into walls. Epitaphs. Families who believed their loved ones were at rest. The Lich gave them movement, but took away everything that made them worth mourning.",
  },
  {
    minZone: 30, maxZone: 39,
    name: "Orcish Wastes", emoji: "🏜️", accent: "#7a4a10",
    desc: "Scorched flatlands where orc warlords carve out kingdoms in the Lich's name, fighting for his favor.",
    lore: "The Lich King made a promise to the orc clans: serve me and inherit the world once the light is gone. The orcs believed him. They burned their own ancestral homelands in tribute, salted their own wells, shattered their own monuments — proof of devotion. Now they wait in the ruins of what they destroyed. The promised reward has not come. The Lich ignores them. But they cannot admit the bargain was a lie, because then they would have to live with what they gave up for nothing.",
  },
  {
    minZone: 40, maxZone: 49,
    name: "The Troll Marshes", emoji: "🌿", accent: "#2a5a3a",
    desc: "Fetid swamps where troll shamans commune with the darkness, growing stronger with each eclipse cycle.",
    lore: "Trolls have always been creatures of rot and regrowth — cut one down and it rises again, larger. The Eternal Eclipse suits them perfectly. Their shamans discovered they could draw power directly from the dark sky, channeling it through crude ritual stones half-submerged in the murk. Each cycle that passes without a sunrise makes them a little stronger. A little larger. A little harder to kill. The marshes themselves seem to be changing too — the water is darker, the mist thicker, the trees bent at angles that suggest something has been pushing against them from within.",
  },
  {
    minZone: 50, maxZone: 59,
    name: "Citadel Approach", emoji: "🏰", accent: "#3a3a7a",
    desc: "The broken road to the Lich King's domain. Dark Knights patrol in unwavering, undying formation.",
    lore: "These were once holy paladins. The most decorated. The most faithful. The Lich King offered them immortality and they took it — not out of cowardice, but because they believed they could serve longer, protect more, endure further. The cost wasn't explained until after. They cannot remove their armor. They cannot sleep. They cannot stop moving. The order that trained them is long dead, its temples ash. They march these roads forever because there is no other command left to follow, and following a command is the only shape their existence still holds.",
  },
  {
    minZone: 60, maxZone: 69,
    name: "The Dragon Highlands", emoji: "🐉", accent: "#7a2a10",
    desc: "Volcanic ridges where corrupted dragons circle endlessly, loyal to the Lich's call by dark sorcery.",
    lore: "Dragons do not submit. That is the oldest truth about them. So the Lich King did not ask them to submit — he simply rewrote the part of them that could refuse. Something in their minds was turned, like a key in a lock, and now they fly patterns they did not choose over territory they do not remember claiming. A few escaped into the deep valleys before the corruption spread. You can hear them sometimes, far below — calling out in a language too old to translate. Whether it is rage or grief is impossible to say. Both, probably.",
  },
  {
    minZone: 70, maxZone: 999,
    name: "The Obsidian Citadel", emoji: "🌋", accent: "#5a1a1a",
    desc: "The volcanic throne of the Eclipse and birthplace of the Lich King's dark power. The air itself burns.",
    lore: "The Citadel was not built. It grew — a crystallization of dark magic around the point where the Eclipse first anchored to the earth. The walls are not stone but compressed shadow, hardened over years into something that rings like iron when struck. The Lich King does not need to be present for it to be terrible. The building has absorbed so much of his will that it acts on his behalf — corridors that rearrange, stairs that descend into nothing, rooms that remember every commander who has come this far and died. It has seen you before. Every version of you. It is still waiting to see if this time is different.",
  },
];

// Chronicle milestones — pop up once when a zone threshold is first crossed
const CHRONICLES = [
  { zone: 10,  icon: "🗺️", title: "The Crags Await",           text: "You cross into the Goblin Crags. The farmlands are behind you — scorched and gone. Mira's arrows find purchase in the rocky walls. She says she has been here before. In another life, perhaps." },
  { zone: 25,  icon: "⚰️", title: "Into the Catacombs",         text: "The ground hollows beneath your boots. The Forgotten Catacombs swallow sound itself. Brother Aldric crosses himself and prays. The skeletons here were not always enemies. They had names once." },
  { zone: 50,  icon: "📜", title: "Oracle's Prophecy Unlocked", text: "Your mortal shell has reached its limit against the corrupting fog. You stand before the threshold of ancient power. To go any further, you must shatter your current timeline and scatter your gold to ascend into spirit form." },
  { zone: 75,  icon: "🌋", title: "The Obsidian Citadel",       text: "The air smells of sulfur and old magic. The Lich King's fortress rises from the volcanic rock like a wound that never healed. Vex touches the wall. 'I have died here before,' he says quietly. 'More than once.'" },
  { zone: 100, icon: "☠️", title: "The Threshold of the Lich",  text: "One hundred zones. The Eclipse pulses above like a heartbeat. The Lich King knows your name now. He has always known it. Every lifetime, every Rebirth — he has been waiting. This time, you are stronger." },
];

// ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
// Each achievement tracks a lifetime stat and grants a permanent multiplier.
// bonus.type mirrors the artifact bonus types so we can reuse computeAchievementBonuses().
const ACHIEVEMENTS = [
  // ── CLICK FEATS ──
  {
    id: "carpal_tunnel",
    name: "The Carpal Tunnel Special",
    emoji: "🖱️",
    desc: "Click 10,000 times total",
    flavor: "Your wrist aches. The Eclipse retreats anyway.",
    stat: "totalClicks", threshold: 10000,
    bonus: { type: "clickMult", value: 0.05 },
    rewardText: "+5% Click Damage — permanently",
  },
  {
    id: "clickzilla",
    name: "Clickzilla",
    emoji: "👊",
    desc: "Click 100,000 times total",
    flavor: "At this point the enemy is less afraid of the Eclipse and more afraid of you.",
    stat: "totalClicks", threshold: 100000,
    bonus: { type: "clickMult", value: 0.15 },
    rewardText: "+15% Click Damage — permanently",
  },
  {
    id: "tap_ascendant",
    name: "Tap Ascendant",
    emoji: "✨",
    desc: "Click 1,000,000 times total",
    flavor: "You have become one with the button.",
    stat: "totalClicks", threshold: 1000000,
    bonus: { type: "clickMult", value: 0.30 },
    rewardText: "+30% Click Damage — permanently",
  },

  // ── KILL FEATS ──
  {
    id: "monster_mash",
    name: "Monster Mash",
    emoji: "💀",
    desc: "Defeat 1,000 enemies",
    flavor: "They keep coming. So do you.",
    stat: "totalKills", threshold: 1000,
    bonus: { type: "goldMult", value: 0.02 },
    rewardText: "+2% Gold Dropped — permanently",
  },
  {
    id: "genocide_lite",
    name: "Eclipse Exterminator",
    emoji: "☠️",
    desc: "Defeat 10,000 enemies",
    flavor: "The Lich King has noticed. He is not pleased.",
    stat: "totalKills", threshold: 10000,
    bonus: { type: "goldMult", value: 0.08 },
    rewardText: "+8% Gold Dropped — permanently",
  },
  {
    id: "lich_nightmare",
    name: "The Lich's Nightmare",
    emoji: "🌑",
    desc: "Defeat 100,000 enemies",
    flavor: "You are the thing that hunts in the dark now.",
    stat: "totalKills", threshold: 100000,
    bonus: { type: "goldMult", value: 0.20 },
    rewardText: "+20% Gold Dropped — permanently",
  },

  // ── GOLD SPENT FEATS ──
  {
    id: "rich_gets_richer",
    name: "Rich Gets Richer",
    emoji: "💰",
    desc: "Spend 1,000,000 gold total",
    flavor: "It costs gold to make gold. The accountants of the Eclipse weep.",
    stat: "totalGoldSpent", threshold: 1000000,
    bonus: { type: "upgradeCostReduce", value: 0.05 },
    rewardText: "−5% Hero Upgrade Costs — permanently",
  },
  {
    id: "void_economy",
    name: "Void Economist",
    emoji: "🏦",
    desc: "Spend 100,000,000 gold total",
    flavor: "You have personally funded the entire war effort. Multiple times.",
    stat: "totalGoldSpent", threshold: 100000000,
    bonus: { type: "upgradeCostReduce", value: 0.15 },
    rewardText: "−15% Hero Upgrade Costs — permanently",
  },

  // ── GOLD EARNED FEATS ──
  {
    id: "first_million",
    name: "First Million",
    emoji: "🪙",
    desc: "Earn 1,000,000 gold lifetime",
    flavor: "The first million is always the hardest.",
    stat: "totalGoldEarned", threshold: 1000000,
    bonus: { type: "goldMult", value: 0.05 },
    rewardText: "+5% Gold Dropped — permanently",
  },
  {
    id: "eclipse_treasury",
    name: "Eclipse Treasury",
    emoji: "👑",
    desc: "Earn 1,000,000,000 gold lifetime",
    flavor: "The Eclipse itself owes you money at this point.",
    stat: "totalGoldEarned", threshold: 1000000000,
    bonus: { type: "goldMult", value: 0.15 },
    rewardText: "+15% Gold Dropped — permanently",
  },

  // ── ZONE FEATS ──
  {
    id: "deep_diver",
    name: "Deep Diver",
    emoji: "🗺️",
    desc: "Reach Zone 25",
    flavor: "Most commanders never leave the forest. You are not most commanders.",
    stat: "maxZone", threshold: 25,
    bonus: { type: "dpsMult", value: 0.10 },
    rewardText: "+10% All Hero DPS — permanently",
  },
  {
    id: "lich_door",
    name: "At the Lich's Door",
    emoji: "🏰",
    desc: "Reach Zone 75",
    flavor: "Few have stood this close. Fewer still lived long enough to count it.",
    stat: "maxZone", threshold: 75,
    bonus: { type: "dpsMult", value: 0.25 },
    rewardText: "+25% All Hero DPS — permanently",
  },

  // ── REBIRTH FEATS ──
  {
    id: "once_more",
    name: "Once More Into the Eclipse",
    emoji: "🔁",
    desc: "Rebirth 3 times",
    flavor: "Death is not an end. It is a strategy.",
    stat: "totalRebirths", threshold: 3,
    bonus: { type: "clickMult", value: 0.10 },
    rewardText: "+10% Click Damage — permanently",
  },
  {
    id: "eternal_soldier",
    name: "Eternal Soldier",
    emoji: "♾️",
    desc: "Rebirth 10 times",
    flavor: "You and Commander Vex have more in common than you thought.",
    stat: "totalRebirths", threshold: 10,
    bonus: { type: "dpsMult", value: 0.20 },
    rewardText: "+20% All Hero DPS — permanently",
  },

  // ── COMBO FEATS ──
  {
    id: "combo_apprentice",
    name: "Combo Apprentice",
    emoji: "⚡",
    desc: "Reach a ×5 combo multiplier",
    flavor: "Faster. They can't keep up.",
    stat: "maxCombo", threshold: 30,
    bonus: { type: "clickMult", value: 0.05 },
    rewardText: "+5% Click Damage — permanently",
  },
];

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

export {
  WORLDS, STORY_EVENTS, BOSSES, BOSS_ZONES,
  EXHAUSTION_DURATION, getEnemyKillWindow,
  ENEMIES, ENEMIES_BY_ZONE, HEROES, UPGRADES, HERO_MILESTONES,
  ACQ_LABEL, ACQ_EMOJI, ARTIFACT_UPGRADES,
  LOOT_PREFIXES, LOOT_TYPES, EQUIP_SLOTS, RARITIES,
  COMPANIONS, COMPANION_ABILITIES,
  ABILITIES, REBIRTH_MILESTONES, COMMANDER_PATHS,
  ZONE_LORE, REGIONS, CHRONICLES, ACHIEVEMENTS,
  SUFFIXES,
};
