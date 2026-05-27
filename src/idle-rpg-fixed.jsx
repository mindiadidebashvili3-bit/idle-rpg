import { useState, useEffect, useRef, useCallback, useMemo } from "react";


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
    image: "/bosses/warchief.gif",
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
    image: "/bosses/catacomb_lord.gif",
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
    image: "/bosses/orc_warlord.gif",
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
    image: "/bosses/troll_shaman.gif",
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
    image: "/bosses/pale_commander.gif",
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
    image: "/bosses/corrupted_dragon.gif",
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
    image: "/bosses/eclipse emperor.png",
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
const EXHAUSTION_DURATION = 8000; // ms the player is locked out after a failed retreat

function getEnemyKillWindow(zone) {
  // Starts at 15 s at zone 1, shrinks by 80 ms per zone, bottoms out at 4 s
  return Math.max(4000, 15000 - zone * 80);
}

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
    id: "wolf",
    name: "Wolf",
    enemyKey: "wolf",
    emoji: "🐺",
    image: "/monsters/wolf.png",
    idleAnim: "shake",
    baseHp: 40,
    baseGold: 6,
    zone: 2,
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
    id: "bat",
    name: "Bat",
    enemyKey: "bat",
    emoji: "🦇",
    image: "/monsters/bat.png",
    idleAnim: "float",
    baseHp: 200,
    baseGold: 24,
    zone: 4,
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
    image: "/monsters/dark knight.png",
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
    image: "/monsters/dragon.png",
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
    id: "hollow_beast",
    name: "The Hollow Beast",
    enemyKey: "hollow_beast",
    emoji: "👁️",
    image: "/monsters/the hollow beast.png",
    idleAnim: "dragonHover",
    baseHp: 800000,
    baseGold: 80000,
    zone: 28,
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

// ── PET SYSTEM ────────────────────────────────────────────────────────────────
// Pets persist across Rebirths (unlike heroes / companions).
// Only one pet can be active at a time. Each has a unique passive type:
//   dpsMult   → multiplies idle DPS
//   critMult  → adds to weak-point crit damage multiplier
//   goldTick  → auto-collects gold every 3s based on enemy gold reward
//   killGold  → bonus % gold on every kill

const PETS = [
  {
    id: "baby_dragon",
    name: "Baby Dragon",
    emoji: "🐉",
    unlockZone: 10,
    unlockCost: 5000,
    unlockCurrency: "gold",
    type: "dpsMult",
    lore: "A hatchling that hid in your shadow when the Eclipse fell. It breathes tiny flames — but it is learning.",
    color: "#ff6622",
    tiers: [
      { level: 0, name: "Hatchling",  emoji: "🥚", bonus: 0.15, desc: "+15% Idle DPS",  evolveCost: 40,  evolveCurrency: "voidDust" },
      { level: 1, name: "Whelpling",  emoji: "🐉", bonus: 0.35, desc: "+35% Idle DPS",  evolveCost: 120, evolveCurrency: "voidDust" },
      { level: 2, name: "Drake",      emoji: "🔥", bonus: 0.70, desc: "+70% Idle DPS",  evolveCost: null },
    ],
  },
  {
    id: "ghost_wolf",
    name: "Ghost Wolf",
    emoji: "🐺",
    unlockZone: 20,
    unlockCost: 30000,
    unlockCurrency: "gold",
    type: "critMult",
    lore: "Slain on the first night of the Eclipse, it haunts your path — sniffing out every weakness in your enemies.",
    color: "#88aaff",
    tiers: [
      { level: 0, name: "Phantom Pup",  emoji: "🐾", bonus: 1,   desc: "+1× Crit Damage",  evolveCost: 60,  evolveCurrency: "voidDust" },
      { level: 1, name: "Ghost Wolf",   emoji: "🐺", bonus: 2,   desc: "+2× Crit Damage",  evolveCost: 180, evolveCurrency: "voidDust" },
      { level: 2, name: "Spirit Alpha", emoji: "🌀", bonus: 4,   desc: "+4× Crit Damage",  evolveCost: null },
    ],
  },
  {
    id: "slime_mini",
    name: "Slime King Mini",
    emoji: "👑",
    unlockZone: 30,
    unlockCost: 80,
    unlockCurrency: "voidDust",
    type: "goldTick",
    lore: "A fragment of the defeated Slime King, still loyal to the concept of gold. It rolls the battlefield and brings back coins.",
    color: "#44cc88",
    tiers: [
      { level: 0, name: "Slimeling",    emoji: "🟢", bonus: 0.5,  desc: "Collect 0.5× enemy gold / 3s",  evolveCost: 80,  evolveCurrency: "voidDust" },
      { level: 1, name: "Slime Prince", emoji: "💧", bonus: 1.5,  desc: "Collect 1.5× enemy gold / 3s",  evolveCost: 240, evolveCurrency: "voidDust" },
      { level: 2, name: "Slime Regent", emoji: "👑", bonus: 3.0,  desc: "Collect 3× enemy gold / 3s",    evolveCost: null },
    ],
  },
  {
    id: "phoenix",
    name: "Phoenix",
    emoji: "🔥",
    unlockZone: 50,
    unlockCost: 3,
    unlockCurrency: "soulCrystals",
    type: "killGold",
    lore: "A being that understands Rebirth better than you do. Each enemy it claims burns clean — and their gold multiplies.",
    color: "#ffaa22",
    tiers: [
      { level: 0, name: "Ember",      emoji: "✨", bonus: 0.30, desc: "+30% Gold per kill",  evolveCost: 100, evolveCurrency: "voidDust" },
      { level: 1, name: "Flamewing",  emoji: "🔥", bonus: 0.75, desc: "+75% Gold per kill",  evolveCost: 300, evolveCurrency: "voidDust" },
      { level: 2, name: "Reborn Sun", emoji: "🌟", bonus: 1.50, desc: "+150% Gold per kill", evolveCost: null },
    ],
  },
];

// ── GACHA SYSTEM ─────────────────────────────────────────────────────────────
// Currency: Eclipse Shards 🌑 — earned from boss kills & zone milestones

const GACHA_PULL_COST   = 100;  // shards per single pull
const GACHA_PITY_RARE   = 10;   // guaranteed Rare+ every N pulls (per banner)
const GACHA_PITY_LEGEND = 50;   // guaranteed Legendary every N pulls (pity system)

function getBossShardReward(zone) {
  if (zone >= 69) return 25;
  if (zone >= 49) return 18;
  if (zone >= 29) return 12;
  if (zone >= 19) return 8;
  return 5;
}

// Hero banner — pools from existing HEROES by rarity tier
const HERO_BANNER_POOL = [
  { id: "squire",   rarity: "Common" },
  { id: "archer",   rarity: "Common" },
  { id: "mage",     rarity: "Rare" },
  { id: "paladin",  rarity: "Rare" },
  { id: "assassin", rarity: "Epic" },
  { id: "dragon",   rarity: "Epic" },
  { id: "titan",    rarity: "Legendary" },
  { id: "seraph",   rarity: "Legendary" },
];

// Spirit Egg banner — unique gacha-only pets (flat bonus, no evolution tiers)
// These integrate directly with the existing petOwned/activePet system.
const SPIRIT_EGG_POOL = [
  // Common (70%)
  { id:"void_sprite",     name:"Void Sprite",      emoji:"💜", rarity:"Common",    color:"#9966cc", type:"dpsMult",   bonus:0.05, desc:"+5% Idle DPS",      lore:"A fragment of the void, too small to be dangerous, too stubborn to disappear." },
  { id:"ember_fox",       name:"Ember Fox",        emoji:"🦊", rarity:"Common",    color:"#ff7733", type:"killGold",  bonus:0.10, desc:"+10% Kill Gold",    lore:"A creature of old fire. Drawn to the smell of coin left after a battle." },
  { id:"dusty_crab",      name:"Dusty Crab",       emoji:"🦀", rarity:"Common",    color:"#cc8844", type:"goldTick",  bonus:0.20, desc:"+0.2× Gold/3s",     lore:"Scavenges the battlefield for dropped coin. Slow, methodical, tireless." },
  { id:"moss_toad",       name:"Moss Toad",        emoji:"🐸", rarity:"Common",    color:"#55aa44", type:"dpsMult",   bonus:0.04, desc:"+4% Idle DPS",       lore:"Absorbs residual hero energy and croaks it back as bonus damage." },
  // Rare (20%)
  { id:"storm_sprite",    name:"Storm Sprite",     emoji:"⚡", rarity:"Rare",      color:"#88ccff", type:"critMult",  bonus:0.5,  desc:"+0.5× Crit Dmg",   lore:"Born from a lightning strike that hit an eclipse wound. It hunts weak points." },
  { id:"shadow_lynx",     name:"Shadow Lynx",      emoji:"🐱", rarity:"Rare",      color:"#8855bb", type:"killGold",  bonus:0.20, desc:"+20% Kill Gold",    lore:"Slips in after every kill and pockets something. You never see it happen." },
  { id:"frost_owl",       name:"Frost Owl",        emoji:"🦉", rarity:"Rare",      color:"#aaddff", type:"dpsMult",   bonus:0.12, desc:"+12% Idle DPS",     lore:"Its presence cools the air. Heroes breathe easier, fight longer." },
  // Epic (8%)
  { id:"crystal_serpent", name:"Crystal Serpent",  emoji:"🐍", rarity:"Epic",      color:"#44ccaa", type:"dpsMult",   bonus:0.30, desc:"+30% Idle DPS",     lore:"Each scale refracts eclipse-light back as pure damage. Ancient. Patient." },
  { id:"void_reaper",     name:"Void Reaper",      emoji:"💀", rarity:"Epic",      color:"#cc44ff", type:"critMult",  bonus:1.5,  desc:"+1.5× Crit Dmg",   lore:"Exists only in the moment a weak point breaks. It feeds on the gap." },
  { id:"magma_salamander",name:"Magma Salamander", emoji:"🦎", rarity:"Epic",      color:"#ff5522", type:"goldTick",  bonus:1.20, desc:"+1.2× Gold/3s",     lore:"Tunnels between fights, surfacing with whatever it found down there." },
  // Legendary (2%)
  { id:"astral_dragon",   name:"Astral Dragon",    emoji:"🐲", rarity:"Legendary", color:"#f5c518", type:"dpsMult",   bonus:1.00, desc:"+100% Idle DPS",    lore:"A dragon that shed its body in the last eclipse and chose to stay." },
  { id:"eclipse_wolf",    name:"Eclipse Wolf",     emoji:"🌑", rarity:"Legendary", color:"#cc88ff", type:"killGold",  bonus:0.60, desc:"+60% Kill Gold",    lore:"The wolf the Eclipse sent ahead. It chose you instead. That is everything." },
];

// Roll rarity given pity counter (pulls since last legendary)
function rollGachaRarity(pityCount, mode = "normal") {
  if (pityCount >= GACHA_PITY_LEGEND)                           return "Legendary";
  if (pityCount >= GACHA_PITY_RARE  && mode !== "already_rare") return rollRarityMinRare();
  const r = Math.random();
  if (r < 0.02) return "Legendary";
  if (r < 0.10) return "Epic";
  if (r < 0.30) return "Rare";
  return "Common";
}
function rollRarityMinRare() {
  const r = Math.random();
  if (r < 0.08) return "Legendary";
  if (r < 0.32) return "Epic";
  return "Rare";
}

// Perform a single roll on a pool; returns pool item
function drawFromPool(pool, rarity) {
  const candidates = pool.filter(p => p.rarity === rarity);
  if (candidates.length === 0) return pool[0]; // fallback
  return candidates[Math.floor(Math.random() * candidates.length)];
}

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


// ── GAME HELPERS ────────────────────────────────────────────────────────

function getHeroMilestoneMult(level) {
  let m = 1;
  for (const ms of HERO_MILESTONES) {
    if (level >= ms.level) m = ms.mult;
  }
  return m;
}

// Hero passive bonuses — summed from all owned heroes
function computeHeroPassiveBonuses(heroLevels) {
  const b = { clickAdd: 0, dmgMult: 0, goldMult: 0, cdReduce: 0, dpsAdd: 0 };
  for (const hero of HEROES) {
    if (!(heroLevels[hero.id] > 0)) continue;
    if (!hero.passive) continue;
    const { type, value } = hero.passive;
    if (type === "clickAdd") b.clickAdd += value;
    if (type === "dmgMult")  b.dmgMult  += value;
    if (type === "goldMult") b.goldMult += value;
    if (type === "cdReduce") b.cdReduce += value;
    if (type === "dpsAdd")   b.dpsAdd   += value;
  }
  return b;
}

// Human-readable passive description
function passiveDesc(passive) {
  if (!passive) return "";
  const pct = v => `+${Math.round(v * 100)}%`;
  switch (passive.type) {
    case "clickAdd":  return `+${passive.value} click dmg (passive)`;
    case "dmgMult":   return `${pct(passive.value)} click dmg (passive)`;
    case "goldMult":  return `${pct(passive.value)} gold drops (passive)`;
    case "cdReduce":  return `${pct(passive.value)} CD reduction (passive)`;
    case "dpsAdd":    return `${pct(passive.value)} all DPS (passive)`;
    default: return "";
  }
}

function getItemRarity(bonus) {
  if (bonus >= 36) return "Legendary";
  if (bonus >= 23) return "Epic";
  if (bonus >= 12) return "Rare";
  return "Common";
}

// ── WEAPON EVOLUTION CHAINS ─────────────────────────────────────────────────
// Each weapon type has a 4-tier evolution: evolve when item reaches ★5
// Evolving costs Void Dust and transforms the item into the next tier.
const WEAPON_CHAINS = {
  Sword:  [
    { name: "Iron Sword",    emoji: "🗡️", rarity: "Common",    bonusBase: 8  },
    { name: "Flame Sword",   emoji: "🔥", rarity: "Rare",      bonusBase: 18 },
    { name: "Void Sword",    emoji: "⚔️", rarity: "Epic",      bonusBase: 32 },
    { name: "Eclipse Blade", emoji: "🌑", rarity: "Legendary", bonusBase: 55 },
  ],
  Armor:  [
    { name: "Iron Mail",       emoji: "🛡️", rarity: "Common",    bonusBase: 8  },
    { name: "Flame Plate",     emoji: "🔥", rarity: "Rare",      bonusBase: 18 },
    { name: "Void Carapace",   emoji: "💠", rarity: "Epic",      bonusBase: 32 },
    { name: "Eclipse Aegis",   emoji: "🌑", rarity: "Legendary", bonusBase: 55 },
  ],
  Helmet: [
    { name: "Iron Helm",       emoji: "⛑️", rarity: "Common",    bonusBase: 7  },
    { name: "Spectral Visor",  emoji: "👁️", rarity: "Rare",      bonusBase: 16 },
    { name: "Void Crown",      emoji: "💜", rarity: "Epic",      bonusBase: 30 },
    { name: "Eclipse Circlet", emoji: "🌑", rarity: "Legendary", bonusBase: 52 },
  ],
  Ring:   [
    { name: "Copper Band",     emoji: "💍", rarity: "Common",    bonusBase: 6  },
    { name: "Arcane Ring",     emoji: "💎", rarity: "Rare",      bonusBase: 14 },
    { name: "Void Loop",       emoji: "🔮", rarity: "Epic",      bonusBase: 28 },
    { name: "Eclipse Sigil",   emoji: "🌑", rarity: "Legendary", bonusBase: 50 },
  ],
  Amulet: [
    { name: "Bone Charm",      emoji: "📿", rarity: "Common",    bonusBase: 6  },
    { name: "Blazing Pendant", emoji: "🔮", rarity: "Rare",      bonusBase: 14 },
    { name: "Void Talisman",   emoji: "💜", rarity: "Epic",      bonusBase: 28 },
    { name: "Eclipse Amulet",  emoji: "🌑", rarity: "Legendary", bonusBase: 50 },
  ],
  Gloves: [
    { name: "Leather Wraps",   emoji: "🧤", rarity: "Common",    bonusBase: 7  },
    { name: "Cursed Gauntlets",emoji: "🔥", rarity: "Rare",      bonusBase: 15 },
    { name: "Void Claws",      emoji: "💠", rarity: "Epic",      bonusBase: 28 },
    { name: "Eclipse Fists",   emoji: "🌑", rarity: "Legendary", bonusBase: 50 },
  ],
  Boots:  [
    { name: "Worn Boots",      emoji: "👢", rarity: "Common",    bonusBase: 7  },
    { name: "Spectral Treads", emoji: "🌀", rarity: "Rare",      bonusBase: 15 },
    { name: "Void Striders",   emoji: "💜", rarity: "Epic",      bonusBase: 28 },
    { name: "Eclipse Sabatons",emoji: "🌑", rarity: "Legendary", bonusBase: 50 },
  ],
};

// ── ITEM SETS ─────────────────────────────────────────────────────────────────
// Equipping items sharing a prefix grants bonus effects.
// Bonuses are additive on top of regular loot bonuses.
const ITEM_SETS = {
  "Ancient":     { name: "Ancient Relics",    color: "#c8a060",
    bonuses: { 2: { desc: "+10% Gold",        stat: "gold",      value: 0.10 },
               3: { desc: "+25% Gold & −5% CDs", stat: "gold",  value: 0.25, extra: { stat: "cdReduce", value: 0.05 } } } },
  "Cursed":      { name: "Cursed Set",         color: "#aa44ee",
    bonuses: { 2: { desc: "+12% Click Dmg",   stat: "clickMult", value: 0.12 },
               3: { desc: "+30% Click Dmg",   stat: "clickMult", value: 0.30 } } },
  "Blazing":     { name: "Blazing Arsenal",    color: "#ff6622",
    bonuses: { 2: { desc: "+15% Hero DPS",    stat: "dpsMult",   value: 0.15 },
               3: { desc: "+35% Hero DPS",    stat: "dpsMult",   value: 0.35 } } },
  "Spectral":    { name: "Spectral Pact",      color: "#88aaff",
    bonuses: { 2: { desc: "−10% Cooldowns",   stat: "cdReduce",  value: 0.10 },
               3: { desc: "−22% Cooldowns",   stat: "cdReduce",  value: 0.22 } } },
  "Obsidian":    { name: "Obsidian Dominion",  color: "#5a3a7a",
    bonuses: { 2: { desc: "+10% Gold",        stat: "gold",      value: 0.10 },
               3: { desc: "+20% Gold + +15% DPS", stat: "gold", value: 0.20, extra: { stat: "dpsMult", value: 0.15 } } } },
  "Voidforged":  { name: "Voidforged",         color: "#cc44ff",
    bonuses: { 2: { desc: "+18% Click Dmg",   stat: "clickMult", value: 0.18 },
               4: { desc: "+50% ALL stats",   stat: "clickMult", value: 0.50, extra: { stat: "dpsMult", value: 0.50 } } } },
  "Lich-Touched":{ name: "Lich's Gift",        color: "#44ccaa",
    bonuses: { 2: { desc: "+15% DPS",         stat: "dpsMult",   value: 0.15 },
               3: { desc: "+15% DPS +15% Gold", stat: "dpsMult", value: 0.15, extra: { stat: "gold", value: 0.15 } } } },
};

// Stars display string
function starsStr(stars = 1, max = 5) {
  const filled = Math.min(stars, max);
  return "★".repeat(filled) + "☆".repeat(max - filled);
}

// Roll stars 1-5 based on zone (higher zone = higher base stars chance)
function rollStars(zone) {
  const r = Math.random();
  const zBonus = Math.min(zone / 60, 1); // 0-1 factor
  if (r < 0.04 + zBonus * 0.06) return 5;
  if (r < 0.12 + zBonus * 0.10) return 4;
  if (r < 0.30 + zBonus * 0.10) return 3;
  if (r < 0.60 + zBonus * 0.05) return 2;
  return 1;
}

// Evolve cost in Void Dust (tier 1→2: cheap, tier 3→4: expensive)
function evolveCost(evolutionTier) {
  return [20, 60, 180, 0][Math.min(evolutionTier, 3)];
}

// Get set bonuses for currently equipped items
function computeSetBonuses(equippedItems) {
  const prefixCount = {};
  for (const item of equippedItems) {
    if (!item || !item.equipped) continue;
    const prefix = item.name?.split(" ")[0];
    if (prefix && ITEM_SETS[prefix]) prefixCount[prefix] = (prefixCount[prefix] || 0) + 1;
  }
  const bonuses = { clickMult: 0, dpsMult: 0, gold: 0, cdReduce: 0 };
  const activeSets = [];
  for (const [prefix, count] of Object.entries(prefixCount)) {
    const setDef = ITEM_SETS[prefix];
    if (!setDef) continue;
    const tiers = Object.keys(setDef.bonuses).map(Number).sort((a,b) => b - a);
    for (const tier of tiers) {
      if (count >= tier) {
        const b = setDef.bonuses[tier];
        bonuses[b.stat] = (bonuses[b.stat] || 0) + b.value;
        if (b.extra) bonuses[b.extra.stat] = (bonuses[b.extra.stat] || 0) + b.extra.value;
        activeSets.push({ prefix, count, tier, setDef, bonus: b });
        break;
      }
    }
  }
  return { bonuses, activeSets };
}

function rollLootItem(zone) {
  const prefix = LOOT_PREFIXES[Math.floor(Math.random() * LOOT_PREFIXES.length)];
  const t      = LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)];
  const stars  = rollStars(zone);

  // Use evolution chain tier 0 for the item type, adjusted by zone
  const chain  = WEAPON_CHAINS[t.type];
  const evolveTier = chain
    ? Math.min(Math.floor(zone / 25), chain.length - 1)  // zone 0-24→tier0, 25-49→tier1, etc.
    : 0;
  const chainEntry = chain ? chain[evolveTier] : null;

  // Bonus: chain base + star bonus + zone scaling
  const baseBonus = chainEntry ? chainEntry.bonusBase : Math.round(5 + Math.min(zone * 0.3, 35));
  const starMult  = 1 + (stars - 1) * 0.12; // ★2=+12%, ★3=+24%, ★4=+36%, ★5=+48%
  const bonus     = Math.round(baseBonus * starMult * (0.85 + Math.random() * 0.3));

  const rarity = chainEntry ? chainEntry.rarity : getItemRarity(bonus);
  const slot   = t.slot === "ring" ? (Math.random() < 0.5 ? "ring1" : "ring2") : t.slot;

  return {
    id:           `loot_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name:         chainEntry ? `${prefix} ${chainEntry.name}` : `${prefix} ${t.type}`,
    emoji:        chainEntry ? chainEntry.emoji : t.emoji,
    type:         t.type,
    slot,
    stat:         t.stat,
    label:        t.label,
    bonus,
    rarity,
    zone,
    stars,
    evolutionTier: evolveTier,
    equipped:     false,
    upgradeLevel: 0,
  };
}

// Companions — lore characters that auto-attack, levelable
function getCompAbilityTier(ability, level) {
  if (!level || level < 1) return null;
  let tier = ability.tiers[0];
  for (const t of ability.tiers) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}

function computeAchievementBonuses(unlockedIds) {
  const b = { clickMult: 0, goldMult: 0, dpsMult: 0, upgradeCostReduce: 0 };
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedIds.includes(ach.id)) continue;
    const { type, value } = ach.bonus;
    if (b[type] !== undefined) b[type] += value;
  }
  return b;
}

// Hero bulk-buy calculator (same logic as companion, but uses heroCost)
function calcBulkHeroBuy(hero, startLevel, gold, mode, costDiscount = 0) {
  const cost = (lvl) => Math.max(1, Math.floor(heroCost(hero, lvl) * (1 - costDiscount)));
  if (mode === "max") {
    let remaining = gold;
    let count = 0;
    while (remaining >= cost(startLevel + count)) {
      remaining -= cost(startLevel + count);
      count++;
      if (count >= 10000) break;
    }
    return { count, totalCost: gold - remaining };
  }
  const n = mode === "x1" ? 1 : mode === "x10" ? 10 : 100;
  let totalCost = 0;
  for (let i = 0; i < n; i++) totalCost += cost(startLevel + i);
  return { count: totalCost <= gold ? n : 0, totalCost };
}

function getCurrentRegion(zone) {
  return REGIONS.find(r => zone >= r.minZone && zone <= r.maxZone) || REGIONS[REGIONS.length - 1];
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return "0";
  n = Math.floor(n);
  if (n < 1000) return n.toString();
  let i = 0; let v = n;
  while (v >= 1000 && i < SUFFIXES.length - 1) { v /= 1000; i++; }
  // Trim trailing zeros: "1.50" → "1.5", "2.00" → "2"
  const raw = v.toFixed(2).replace(/\.?0+$/, "");
  return raw + SUFFIXES[i];
}

function getEnemyForZone(zone, rebirthMult = 1) {
  // Boss zones — one per region's final zone
  if (BOSS_ZONES.has(zone)) {
    const boss = BOSSES.find(b => b.zone === zone);
    // Scale boss HP by rebirth multiplier (capped at 50× so late bosses stay beatable)
    const bossHpScale = Math.min(rebirthMult, 50);
    return {
      ...boss,
      id:         boss.name.toLowerCase().replace(/\s+/g, "_"),
      enemyKey:   boss.name.toLowerCase().replace(/\s+/g, "_"),
      maxHp:      Math.floor(boss.baseHp * bossHpScale),
      goldReward: Math.floor(boss.baseGold * bossHpScale),
      isBoss:     true,
    };
  }
  // Slime Outskirts (zones 1-8): slimes with occasional goblin cameo
  if (zone >= 1 && zone <= 8) {
    const slime = ENEMIES[0];
    const scale = Math.pow(1.4, zone - 1);
    if (Math.random() < 0.001) {
      const goblin = ENEMIES.find(e => e.id === "goblin");
      return { ...goblin, name: "Lost Goblin", maxHp: Math.floor(goblin.baseHp * scale), goldReward: Math.floor(goblin.baseGold * scale * 3) };
    }
    return { ...slime, maxHp: Math.floor(slime.baseHp * scale), goldReward: Math.floor(slime.baseGold * scale) };
  }
  // All other zones: find the highest-zone enemy at or below current zone, scale up
  // ENEMIES is pre-sorted by zone descending at module load — no sort needed here
  const base = ENEMIES_BY_ZONE.find(e => zone >= e.zone) || ENEMIES[ENEMIES.length - 1];
  // Cap the exponent to avoid Number overflow (Infinity) at extreme zones
  const exponent = Math.min(Math.max(0, zone - base.zone), 60);
  const scale = Math.pow(1.5, exponent);
  return { ...base, maxHp: Math.floor(base.baseHp * scale), goldReward: Math.floor(base.baseGold * scale) };
}

function heroCost(hero, level) {
  return Math.floor(hero.baseCost * Math.pow(hero.costMult, level));
}

function companionCost(comp, level) {
  return Math.floor(comp.baseCost * Math.pow(comp.costMult, level));
}

function computeIdleDps(heroLevels, boughtUpgrades, artifactOwned = []) {
  const artDpsMult = ARTIFACT_UPGRADES
    .filter(a => a.type === "dpsMult" && artifactOwned.includes(a.id))
    .reduce((s, a) => s + a.value, 0);
  return HEROES.reduce((total, hero) => {
    const level = heroLevels[hero.id] || 0;
    if (level === 0) return total;
    const heroUpgs = UPGRADES.filter(u => u.type === "hero" && u.heroId === hero.id && boughtUpgrades.includes(u.id));
    const upgMult = heroUpgs.reduce((m, u) => m * u.mult, 1);
    const milestoneMult = getHeroMilestoneMult(level);
    return total + hero.baseDps * level * upgMult * milestoneMult * (1 + artDpsMult);
  }, 0);
}

// Compute artifact bonuses as a lookup object
function computeArtifactBonuses(artifactOwned) {
  const b = { goldMult: 0, cdReduce: 0, clickMult: 0, synergyPct: 0 };
  for (const a of ARTIFACT_UPGRADES) {
    if (!artifactOwned.includes(a.id)) continue;
    if (a.type === "gold")      b.goldMult  += a.value;
    if (a.type === "cooldown")  b.cdReduce  += a.value;
    if (a.type === "clickMult") b.clickMult += a.value;
    if (a.type === "synergy")   b.synergyPct += a.value;
  }
  return b;
}

// Compute equipped loot bonuses (gear stats + set bonuses)
function computeLootBonuses(lootItems) {
  const b = { clickMult: 0, dpsMult: 0, gold: 0, cdReduce: 0 };
  const equippedItems = lootItems.filter(i => i.equipped);
  for (const item of equippedItems) {
    const totalBonus = (item.bonus + (item.upgradeLevel || 0)) / 100;
    if (item.stat === "clickMult") b.clickMult += totalBonus;
    if (item.stat === "dpsMult")   b.dpsMult   += totalBonus;
    if (item.stat === "gold")      b.gold       += totalBonus;
    if (item.stat === "cdReduce")  b.cdReduce   += totalBonus;
  }
  // Set bonuses
  const { bonuses: sb } = computeSetBonuses(equippedItems);
  b.clickMult += sb.clickMult || 0;
  b.dpsMult   += sb.dpsMult   || 0;
  b.gold      += sb.gold      || 0;
  b.cdReduce  += sb.cdReduce  || 0;
  return b;
}

// Companion total damage dealt every 500ms tick, with optional synergy % of click dmg
function computeCompanionTickDmg(companionLevels, synergyPct = 0, clickDmgBase = 0) {
  const flatDmg = COMPANIONS.reduce((sum, c) => {
    const level = companionLevels[c.id] || 0;
    if (level === 0) return sum;
    return sum + c.baseDmg * level * (500 / c.interval);
  }, 0);
  const synergyBonus = synergyPct > 0 ? clickDmgBase * synergyPct : 0;
  return flatDmg + synergyBonus;
}

// Companion bulk-buy calculator.
// x1/x10/x100: all-or-nothing for the fixed count (button disabled if short on gold).
// max: walk levels until gold runs out, return exact count + exact total cost.
function calcBulkCompanionBuy(comp, startLevel, gold, mode) {
  if (mode === "max") {
    let remaining = gold;
    let count = 0;
    while (remaining >= companionCost(comp, startLevel + count)) {
      remaining -= companionCost(comp, startLevel + count);
      count++;
      if (count >= 10000) break; // safety cap
    }
    return { count, totalCost: gold - remaining };
  }
  const n = mode === "x1" ? 1 : mode === "x10" ? 10 : 100;
  let totalCost = 0;
  for (let i = 0; i < n; i++) totalCost += companionCost(comp, startLevel + i);
  return { count: totalCost <= gold ? n : 0, totalCost };
}

function getCurrentLore(zone) {
  let lore = ZONE_LORE[0];
  for (const entry of ZONE_LORE) {
    if (zone >= entry.zone) lore = entry;
  }
  return lore;
}

// Combo multiplier tiers — rewards rapid tapping
function getComboMult(combo) {
  if (combo >= 30) return 5;
  if (combo >= 20) return 4;
  if (combo >= 12) return 3;
  if (combo >= 6)  return 2;
  if (combo >= 3)  return 1.5;
  return 1;
}

function getComboColor(combo) {
  if (combo >= 30) return "#ff2200";
  if (combo >= 20) return "#ff8800";
  if (combo >= 12) return "#f5c518";
  if (combo >= 6)  return "#44cc88";
  if (combo >= 3)  return "#4488ff";
  return "#4a3a2a";
}




function RarityBadge({ rarity, style = {} }) {
  const r = RARITIES[rarity] || RARITIES.Common;
  return (
    <span style={{
      fontSize: 9, fontWeight: "bold", letterSpacing: 1,
      padding: "2px 6px", borderRadius: 4,
      border: `1px solid ${r.color}55`,
      background: r.color + "18",
      color: r.color,
      ...style,
    }}>
      {r.label}
    </span>
  );
}


// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function IdleRPG() {
  // ── Audio (placeholder) ───────────────────────────────────────────────
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const musicRef = useRef(null);
  const bgmLoopRef = useRef(false);

  // Keyed pool: one Audio element per unique SFX src, reused on every call.
  // Avoids allocating a new HTMLAudioElement on every click (memory leak).
  const sfxPoolRef = useRef({});

  const playSfx = useCallback((src) => {
    if (!sfxEnabled || !src) return;
    try {
      if (!sfxPoolRef.current[src]) {
        const a = new Audio(src);
        a.volume = 0.6;
        sfxPoolRef.current[src] = a;
      }
      const a = sfxPoolRef.current[src];
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (_) {}
  }, [sfxEnabled]);

  const playBgm = useCallback((src) => {
    if (!musicEnabled || !src) return;
    try {
      if (musicRef.current) {
        try { musicRef.current.pause(); } catch (_) {}
      }
      const a = new Audio(src);
      a.loop = true;
      a.volume = 0.4;
      a.play().catch(() => {});
      musicRef.current = a;
      bgmLoopRef.current = true;
    } catch (_) {}
  }, [musicEnabled]);

  const stopBgm = useCallback(() => {
    try {
      if (musicRef.current) musicRef.current.pause();
    } catch (_) {}
    musicRef.current = null;
    bgmLoopRef.current = false;
  }, []);


  const [gold, setGold]         = useState(0);
  const [zone, setZone]         = useState(1);
  const [killCount, setKillCount] = useState(0);

  const initEnemy = getEnemyForZone(1);
  const [currentEnemy, setCurrentEnemy] = useState(initEnemy);
  const [enemyHp, setEnemyHp]           = useState(initEnemy.maxHp);

  const [heroLevels, setHeroLevels]         = useState({});
  const [companionLevels, setCompanionLevels] = useState({});
  const [boughtUpgrades, setBoughtUpgrades]   = useState([]);
  const [clickDmg, setClickDmg]             = useState(1);

  // New systems
  const [soulCrystals, setSoulCrystals]       = useState(0);   // spendable rebirth currency
  const [artifactOwned, setArtifactOwned]     = useState([]);  // bought artifact upgrades
  const [lootItems, setLootItems]             = useState([]);  // dropped equippable items
  const [voidDust, setVoidDust]               = useState(0);   // 🌌 from scrapping loot
  const [lootModal, setLootModal]             = useState(null);// pending loot to show
  const [milestoneToast, setMilestoneToast]   = useState(null);// hero milestone notification
  const [activePanel, setActivePanel]         = useState(null);// "artifacts" | "loot"
  const [lootSort, setLootSort]               = useState("zone"); // "zone" | "bonus" | "equipped"
  const [selectedGearSlot, setSelectedGearSlot] = useState(null); // for paperdoll slot picker

  const [abilityState, setAbilityState] = useState(
    Object.fromEntries(ABILITIES.map(a => [a.id, { activeUntil: 0, cdUntil: 0 }]))
  );
  // Companion ability state — keyed by ca_id, same shape as abilityState
  const [compAbilityState, setCompAbilityState] = useState(
    Object.fromEntries(COMPANION_ABILITIES.map(a => [a.id, { activeUntil: 0, cdUntil: 0 }]))
  );
  // Active companion buffs (multiplicative, applied in derived values)
  const [compBuffs, setCompBuffs] = useState({ clickMult: 1, dpsMult: 1, goldMult: 1 });
  const [now, setNow] = useState(Date.now());

  const [floats, setFloats] = useState([]);
  const [shake, setShake]   = useState(false);
  const [weakPoints, setWeakPoints] = useState([]);
  const [comboCount, setComboCount] = useState(0); // rapid-click combo counter // dynamic crit hotspots on enemy

  const [storyPopup, setStoryPopup] = useState(null);
  const [seenStoryZones, setSeenStoryZones] = useState([]);

  const [enemyHitNonce, setEnemyHitNonce] = useState(0);

  const [tab, setTab] = useState("battle");

  // Auto-Advance vs Farm toggle
  const [farmMode, setFarmMode] = useState(false); // false = auto-advance, true = farm same zone

  // Companion bulk-buy mode
  const [buyMode, setBuyMode] = useState("x1"); // "x1" | "x10" | "x100" | "max"

  // Boss stage timer
  const [bossTimerEnd, setBossTimerEnd] = useState(null); // timestamp | null
  const [bossFailToast, setBossFailToast] = useState(null); // { prevZone } | null

  // Retreat + Exhaustion system
  const [enemyKillTimerEnd, setEnemyKillTimerEnd] = useState(null); // timestamp | null (normal enemies)
  const [exhaustionUntil, setExhaustionUntil]     = useState(0);    // timestamp — abilities locked
  const [retreatToast, setRetreatToast]           = useState(null); // { prevZone } | null

  // ── Achievement system ────────────────────────────────────────────────────
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [achievementToast, setAchievementToast]         = useState(null);
  const [totalClicks, setTotalClicks]                   = useState(0);
  const [totalKills, setTotalKills]                     = useState(0);
  const [totalGoldEarned, setTotalGoldEarned]           = useState(0);
  const [totalGoldSpent, setTotalGoldSpent]             = useState(0);
  const [maxZoneReached, setMaxZoneReached]             = useState(1);
  const [maxComboReached, setMaxComboReached]           = useState(0);

  const [offlineModal, setOfflineModal]       = useState(null);
  const [rebirthCount, setRebirthCount]       = useState(0);
  const [rebirthConfirm, setRebirthConfirm]   = useState(false);
  const [resetConfirm, setResetConfirm]       = useState(false);
  const [commanderPath, setCommanderPath]     = useState(null); // null | "vanguard" | "tactician" | "void_mage"
  const [pathChoiceModal, setPathChoiceModal] = useState(false);
  const [seenChronicles, setSeenChronicles]   = useState([]);
  const [activeChronicle, setActiveChronicle] = useState(null);

  // Tab notification badges
  const [newLootCount, setNewLootCount]           = useState(0);
  const [newAchievementCount, setNewAchievementCount] = useState(0);

  // ── Pet system ────────────────────────────────────────────────────────────
  // petOwned: { baby_dragon: { tier: 0 }, ghost_wolf: { tier: 1 }, ... }
  // Pets survive Rebirth — this is intentional and a key retention hook.
  const [petOwned,    setPetOwned]    = useState({});   // petId → { tier }
  const [activePet,   setActivePet]   = useState(null); // petId | null
  const [newPetCount, setNewPetCount] = useState(0);    // badge for nav

  // ── Gacha / Summon system ─────────────────────────────────────────────────
  const [eclipseShards, setEclipseShards] = useState(50);   // starting shards
  const [gachaPity,     setGachaPity]     = useState({ hero: 0, spirit: 0 }); // pulls since last legendary per banner
  const [summonModal,   setSummonModal]   = useState(null);  // null | { phase, banner, results, revealIdx }
  const [activeBanner,  setActiveBanner]  = useState("hero"); // "hero" | "spirit"
  const [pullHistory,   setPullHistory]   = useState([]);    // last 20 pulls [{rarity,emoji,name}]

  // (placeholder for future world-transition polish)
  const [pendingWorldBg, setPendingWorldBg] = useState(null);



  // ── refs ──────────────────────────────────────────────────────────────────
  // Internal counters / flags — not state mirrors, stay as individual refs.
  const floatId       = useRef(0);
  const wpIdRef       = useRef(0);
  const saveLoadedRef = useRef(false);
  const enemyDyingRef = useRef(false); // guard against double-kill in dealDamage
  const lastClickTimeRef = useRef(0);  // timestamp of last tap, for combo window

  // ── Single consolidated game-state ref ────────────────────────────────────
  // Replaces 37 individual `xRef + xRef.current = x` mirror pairs.
  //
  // WHY: every callback (dealDamage, buildSave, spawnEnemy, etc.) needs to read
  // the latest state value without stale-closure issues. Previously this required
  // a separate useRef for each piece of state, each sync'd every render.
  // Now a single object is updated once per render and all callbacks read from it.
  //
  // Imperative writes (e.g. `gsRef.current.zone = nz` inside dealDamage) still
  // work exactly as before — we're just using one object instead of 37.
  const gsRef = useRef({});
  gsRef.current = {
    // ── core game state ──
    gold, zone, killCount, heroLevels, companionLevels, boughtUpgrades,
    clickDmg, rebirthCount, seenChronicles, artifactOwned, soulCrystals,
    lootItems, voidDust, commanderPath, farmMode, seenStoryZones,
    bossTimerEnd, exhaustionUntil, enemyKillTimerEnd,
    compAbilityState, compBuffs,
    // ── achievement / stats ──
    totalClicks, totalKills, totalGoldEarned, totalGoldSpent,
    maxZoneReached, maxComboReached, unlockedAchievements,
    // ── pets ──
    petOwned, activePet,
    // ── gacha ──
    eclipseShards, gachaPity,
    // ── derived / computed ──
    maxWp:       commanderPath === "void_mage" ? 3 : 2,
    // enemy and currentEnemy are synced below (also written imperatively by spawnEnemy)
    enemy:       gsRef.current?.enemy ?? currentEnemy,
    // computed multipliers (filled in after derived-values block below)
    goldMult:    gsRef.current?.goldMult    ?? 1,
    rebirthMult: gsRef.current?.rebirthMult ?? 1,
    idleDps:     gsRef.current?.idleDps     ?? 0,
    artGoldMult: gsRef.current?.artGoldMult ?? 1,
    effectiveDmg:gsRef.current?.effectiveDmg?? 1,
    artSynergy:  gsRef.current?.artSynergy  ?? 0,
    pathDpsMult: gsRef.current?.pathDpsMult ?? 1,
  };
  // Keep enemy in sync with React state every render (spawnEnemy also writes this directly)
  gsRef.current.enemy = currentEnemy;


  // ── derived values ────────────────────────────────────────────────────────
  // These five computations are expensive — memoised so they only re-run when
  // their actual inputs change, not on every 200ms clock tick.
  const artBonuses   = useMemo(() => computeArtifactBonuses(artifactOwned),            [artifactOwned]);
  const lootBonuses  = useMemo(() => computeLootBonuses(lootItems),                    [lootItems]);
  const heroPassives = useMemo(() => computeHeroPassiveBonuses(heroLevels),             [heroLevels]);
  const achBonuses   = useMemo(() => computeAchievementBonuses(unlockedAchievements),  [unlockedAchievements]);
  // baseIdleDps: the costly hero×upgrade×milestone roll-up — split from the cheap multiplier chain
  const baseIdleDps  = useMemo(() => computeIdleDps(heroLevels, boughtUpgrades, artifactOwned),
                                     [heroLevels, boughtUpgrades, artifactOwned]);

  // Pet bonuses — derived from active pet + its current evolution tier
  // Handles both direct-buy PETS (tiered) and gacha SPIRIT_EGG_POOL (flat).
  const petBonuses = useMemo(() => {
    const b = { dpsMult: 0, critAdd: 0, killGold: 0, goldTickMult: 0 };
    if (!activePet || !petOwned[activePet]) return b;
    const applyType = (type, bonus) => {
      if (type === "dpsMult")  b.dpsMult      = bonus;
      if (type === "critMult") b.critAdd      = bonus;
      if (type === "killGold") b.killGold     = bonus;
      if (type === "goldTick") b.goldTickMult = bonus;
    };
    const rp = PETS.find(p => p.id === activePet);
    if (rp) {
      const td = rp.tiers[petOwned[activePet].tier || 0];
      if (td) applyType(rp.type, td.bonus);
      return b;
    }
    const gp = SPIRIT_EGG_POOL.find(p => p.id === activePet);
    if (gp) applyType(gp.type, gp.bonus);
    return b;
  }, [activePet, petOwned]);

  const isBerserk   = now < (abilityState.berserk?.activeUntil   || 0);
  const isBattleCry = now < (abilityState.battlecry?.activeUntil || 0);
  const isGoldRush  = now < (abilityState.goldrush?.activeUntil  || 0);
  const isExhausted = now < exhaustionUntil;
  const exhaustionLeft = isExhausted ? Math.ceil((exhaustionUntil - now) / 1000) : 0;

  // Effective cooldown multiplier from artifacts + loot + hero passives
  const cdReduction = Math.min(0.7, artBonuses.cdReduce + lootBonuses.cdReduce + heroPassives.cdReduce); // cap at 70%

  const dmgMult         = isBattleCry ? 2 : 1;
  const rebirthMult     = 1 + rebirthCount * 0.5;
  const pathClickMult   = commanderPath === "vanguard"  ? 2   : 1;
  const pathDpsMult     = commanderPath === "tactician" ? 1.4 : 1;
  const pathGoldBonus   = commanderPath === "tactician" ? 0.2 : 0;
  const clickArtMult    = 1 + artBonuses.clickMult + lootBonuses.clickMult + achBonuses.clickMult;
  const effectiveDmg    = (clickDmg + heroPassives.clickAdd) * (isBerserk ? 10 : 1) * dmgMult * clickArtMult * pathClickMult * (1 + heroPassives.dmgMult) * compBuffs.clickMult;
  const idleDps         = baseIdleDps * (1 + lootBonuses.dpsMult + achBonuses.dpsMult) * (1 + heroPassives.dpsAdd) * dmgMult * rebirthMult * pathDpsMult * compBuffs.dpsMult * (1 + petBonuses.dpsMult);

  const rebirthGoldBonus = REBIRTH_MILESTONES
    .filter(m => m.type === "goldBonus" && rebirthCount >= m.count)
    .reduce((s, m) => s + m.value, 0);

  // Update computed multipliers now that derived values are available
  gsRef.current.goldMult    = isGoldRush ? 2 : 1;
  gsRef.current.rebirthMult = rebirthMult;
  gsRef.current.idleDps     = idleDps;
  gsRef.current.artGoldMult = (1 + artBonuses.goldMult + lootBonuses.gold + pathGoldBonus + heroPassives.goldMult + achBonuses.goldMult + rebirthGoldBonus + petBonuses.killGold) * compBuffs.goldMult;
  gsRef.current.effectiveDmg= effectiveDmg;
  gsRef.current.artSynergy  = artBonuses.synergyPct;
  gsRef.current.pathDpsMult = pathDpsMult;
  gsRef.current.petGoldTickMult = petBonuses.goldTickMult;

  const currentLore = getCurrentLore(zone);

  const currentWorld = WORLDS.find((w) => zone >= (w.id - 1) * 10 + 1 && zone <= w.id * 10) || WORLDS[WORLDS.length - 1];
  const currentBoss = BOSS_ZONES.has(zone) ? BOSSES.find(b => b.zone === zone) : null;


  // ── clock tick: now driven by the master RAF game loop below ─────────────

  // ── spawn enemy ───────────────────────────────────────────────────────────
  const spawnEnemy = useCallback((nextZone) => {
    const e = getEnemyForZone(nextZone, gsRef.current.rebirthMult);
    setCurrentEnemy(e);
    setEnemyHp(e.maxHp);
    gsRef.current.enemy = e;
    // Start kill timer for normal enemies in auto-advance mode only
    if (!BOSS_ZONES.has(nextZone) && !gsRef.current.farmMode) {
      setEnemyKillTimerEnd(Date.now() + getEnemyKillWindow(nextZone));
    } else {
      setEnemyKillTimerEnd(null);
    }
  }, []);

  // ── Achievement checker ───────────────────────────────────────────────────
  const checkAchievements = useCallback((stats) => {
    const statMap = {
      totalClicks:    stats.totalClicks    ?? gsRef.current.totalClicks,
      totalKills:     stats.totalKills     ?? gsRef.current.totalKills,
      totalGoldEarned:stats.totalGoldEarned?? gsRef.current.totalGoldEarned,
      totalGoldSpent: stats.totalGoldSpent ?? gsRef.current.totalGoldSpent,
      maxZone:        stats.maxZone        ?? gsRef.current.maxZoneReached,
      maxCombo:       stats.maxCombo       ?? gsRef.current.maxComboReached,
      totalRebirths:  stats.totalRebirths  ?? gsRef.current.rebirthCount,
    };
    for (const ach of ACHIEVEMENTS) {
      if (gsRef.current.unlockedAchievements.includes(ach.id)) continue;
      if (statMap[ach.stat] >= ach.threshold) {
        gsRef.current.unlockedAchievements = [...gsRef.current.unlockedAchievements, ach.id];
        setUnlockedAchievements(prev => [...prev, ach.id]);
        setAchievementToast(ach);
        setTimeout(() => setAchievementToast(null), 4000);
        setNewAchievementCount(c => c + 1);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── load save + offline earnings ──────────────────────────────────────────
  useEffect(() => {
    async function loadSave() {
      try {
        const result = await window.storage.get('crusade_save');
        if (!result) return;
        const sv = JSON.parse(result.value);
        if (sv.gold           != null) setGold(sv.gold);
        if (sv.heroLevels)             setHeroLevels(sv.heroLevels);
        if (sv.companionLevels)        setCompanionLevels(sv.companionLevels);
        else if (sv.hasAdventurer)     setCompanionLevels({ dusk: 1 }); // migrate old save
        if (sv.boughtUpgrades)         setBoughtUpgrades(sv.boughtUpgrades);
        if (sv.clickDmg       != null) setClickDmg(sv.clickDmg);
        if (sv.killCount      != null) setKillCount(sv.killCount);
        if (sv.rebirthCount   != null) setRebirthCount(sv.rebirthCount);
        if (sv.zone           != null) {
          setZone(sv.zone);
          gsRef.current.zone = sv.zone;
          // rebirthMultRef not yet synced at load time — compute directly
          const loadedMult = 1 + (sv.rebirthCount || 0) * 0.5;
          const e = getEnemyForZone(sv.zone, loadedMult);
          setCurrentEnemy(e);
          setEnemyHp(e.maxHp);
          gsRef.current.enemy = e;
        }
        if (sv.seenChronicles)         setSeenChronicles(sv.seenChronicles);
        if (sv.seenStoryZones)        setSeenStoryZones(sv.seenStoryZones);
        if (sv.soulCrystals    != null) setSoulCrystals(sv.soulCrystals);
        if (sv.artifactOwned)          setArtifactOwned(sv.artifactOwned);
        if (sv.lootItems) {
          // Migrate old items: add slot + upgradeLevel + stars + evolutionTier if missing
          const migrated = sv.lootItems.map(item => {
            const withLevel = item.upgradeLevel !== undefined ? item : { ...item, upgradeLevel: 0 };
            const withStars = withLevel.stars !== undefined ? withLevel : { ...withLevel, stars: 1 };
            const withEvo   = withStars.evolutionTier !== undefined ? withStars : { ...withStars, evolutionTier: 0 };
            if (withEvo.slot) return withEvo;
            const slotMap = { Sword: "weapon", Armor: "chest", Ring: "ring1", Amulet: "amulet", Helmet: "helmet", Gloves: "gloves", Boots: "boots" };
            return { ...withEvo, slot: slotMap[item.type] || item.type?.toLowerCase() || "weapon" };
          });
          setLootItems(migrated);
        }
        if (sv.voidDust        != null) setVoidDust(sv.voidDust);
        if (sv.commanderPath)          setCommanderPath(sv.commanderPath);
        if (sv.farmMode != null)       setFarmMode(sv.farmMode);
        // Pet system (persists across Rebirth)
        if (sv.petOwned)               setPetOwned(sv.petOwned);
        if (sv.activePet)              setActivePet(sv.activePet);
        // Gacha system (persists across Rebirth)
        if (sv.eclipseShards != null)  setEclipseShards(sv.eclipseShards);
        if (sv.gachaPity)              setGachaPity(sv.gachaPity);
        if (sv.pullHistory)            setPullHistory(sv.pullHistory);
        // Achievement stats
        if (sv.unlockedAchievements)   setUnlockedAchievements(sv.unlockedAchievements);
        if (sv.totalClicks    != null) setTotalClicks(sv.totalClicks);
        if (sv.totalKills     != null) setTotalKills(sv.totalKills);
        if (sv.totalGoldEarned!= null) setTotalGoldEarned(sv.totalGoldEarned);
        if (sv.totalGoldSpent != null) setTotalGoldSpent(sv.totalGoldSpent);
        if (sv.maxZoneReached != null) setMaxZoneReached(sv.maxZoneReached);
        if (sv.maxComboReached!= null) setMaxComboReached(sv.maxComboReached);
        saveLoadedRef.current = true;
        if (sv.lastSeen && sv.savedDps > 0) {
          const unlockedMs   = REBIRTH_MILESTONES.filter(m => (sv.rebirthCount || 0) >= m.count);
          const offlineHours = unlockedMs.filter(m => m.type === "offlineCap").reduce((best, m) => Math.max(best, m.value), 4);
          const elapsed = Math.min((Date.now() - sv.lastSeen) / 1000, offlineHours * 3600);
          if (elapsed >= 60) {
            const earned = Math.floor(sv.savedDps * elapsed);
            setGold(g => g + earned);
            setOfflineModal({ gold: earned, seconds: Math.floor(elapsed) });
          }
        }
      } catch (_) { /* fresh start */ }
    }
    loadSave();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── save state on hide ────────────────────────────────────────────────────
  const buildSave = useCallback(() => ({
    gold:           gsRef.current.gold,
    heroLevels:     gsRef.current.heroLevels,
    companionLevels:gsRef.current.companionLevels,
    boughtUpgrades: gsRef.current.boughtUpgrades,
    clickDmg:       gsRef.current.clickDmg,
    zone:           gsRef.current.zone,
    killCount:      gsRef.current.killCount,
    rebirthCount:   gsRef.current.rebirthCount,
    seenChronicles: gsRef.current.seenChronicles,
    soulCrystals:   gsRef.current.soulCrystals,
    artifactOwned:  gsRef.current.artifactOwned,
    lootItems:      gsRef.current.lootItems,
    voidDust:       gsRef.current.voidDust,
    commanderPath:  gsRef.current.commanderPath,
    farmMode:       gsRef.current.farmMode,
    // Pet system — persists across Rebirth
    petOwned:       gsRef.current.petOwned,
    activePet:      gsRef.current.activePet,
    // Gacha system — persists across Rebirth
    eclipseShards:  gsRef.current.eclipseShards,
    gachaPity:      gsRef.current.gachaPity,
    pullHistory:    pullHistory.slice(-20),
    savedDps:       gsRef.current.idleDps + (gsRef.current.companionLevels
                      ? COMPANIONS.reduce((sum, c) => {
                          const lv = (gsRef.current.companionLevels[c.id] || 0);
                          return lv > 0 ? sum + c.baseDmg * lv * (1000 / c.interval) : sum;
                        }, 0) * gsRef.current.rebirthMult
                      : 0),
    lastSeen:       Date.now(),
    seenStoryZones: gsRef.current.seenStoryZones,
    unlockedAchievements: gsRef.current.unlockedAchievements,
    totalClicks:          gsRef.current.totalClicks,
    totalKills:           gsRef.current.totalKills,
    totalGoldEarned:      gsRef.current.totalGoldEarned,
    totalGoldSpent:       gsRef.current.totalGoldSpent,
    maxZoneReached:       gsRef.current.maxZoneReached,
    maxComboReached:      gsRef.current.maxComboReached,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handle = () => {
      if (!document.hidden) return;
      window.storage.set('crusade_save', JSON.stringify(buildSave())).catch(() => {});
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [buildSave]);

  // ── auto-save every 30 seconds ────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (!saveLoadedRef.current) return;
      window.storage.set('crusade_save', JSON.stringify(buildSave())).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [buildSave]);

  // ── deal damage ───────────────────────────────────────────────────────────
  const dealDamage = useCallback((amount) => {
    setEnemyHp((prev) => {
      const next = prev - amount;
      if (next <= 0) {
        // Guard: React may re-run functional state updaters in concurrent mode.
        // If this kill has already been processed, skip it.
        if (enemyDyingRef.current) return 0;
        enemyDyingRef.current = true;
        // Reset the flag after the current paint so the next enemy can die normally
        requestAnimationFrame(() => { enemyDyingRef.current = false; });
        const reward = Math.floor(
          gsRef.current.enemy.goldReward *
            gsRef.current.goldMult *
            gsRef.current.rebirthMult *
            gsRef.current.artGoldMult
        );
        setGold((g) => g + reward);
        // Track lifetime gold earned
        const newGoldEarned = gsRef.current.totalGoldEarned + reward;
        setTotalGoldEarned(newGoldEarned);

        // Clear boss timer — player beat the boss in time
        setBossTimerEnd(null);
        // Clear enemy kill timer — player beat the enemy in time
        setEnemyKillTimerEnd(null);

        // Farm mode: respawn same enemy, freeze zone progress, skip chest drops
        if (gsRef.current.farmMode) {
          // Still track the kill
          const fmKills = gsRef.current.totalKills + 1;
          setTotalKills(fmKills);
          checkAchievements({ totalKills: fmKills, totalGoldEarned: newGoldEarned });
          spawnEnemy(gsRef.current.zone);
          return 0;
        }

        setKillCount((k) => {
          const newK = k + 1;
          // Track lifetime kills
          const newTotalKills = gsRef.current.totalKills + 1;
          setTotalKills(newTotalKills);
          const isBossKill = BOSS_ZONES.has(gsRef.current.zone) || (newK % 10 === 0); // boss zones: any kill advances; normal: every 10th

          if (isBossKill) {
            const nz = gsRef.current.zone + 1;
            setZone(nz);
            gsRef.current.zone = nz;
            spawnEnemy(nz);
            // Track max zone
            const newMaxZone = Math.max(gsRef.current.maxZoneReached, nz);
            if (newMaxZone > gsRef.current.maxZoneReached) setMaxZoneReached(newMaxZone);
            checkAchievements({ totalKills: newTotalKills, totalGoldEarned: newGoldEarned, maxZone: newMaxZone });

            // Eclipse Shards reward — boss kills only
            if (BOSS_ZONES.has(gsRef.current.zone - 1)) {
              const shards = getBossShardReward(gsRef.current.zone - 1);
              setEclipseShards(s => s + shards);
            }
            // Bonus shards every 10 zones
            if ((nz - 1) % 10 === 0 && nz > 1) {
              setEclipseShards(s => s + 10);
            }

            // Chest drop system:
            // - 10% chance to get a chest on boss milestone kills
            // - chest contains: (a) hero unlock from acquisition.kind === "chest" or (b) loot items
            if (Math.random() < 0.1) {
              // pick chest type based on zone/enemy flavor; kept simple for now
              const chestZone = gsRef.current.zone;

              // decide hero vs loot
              const chestHeroes = HEROES.filter(h => h.acquisition?.kind === "chest");
              const willDropHero = chestHeroes.length > 0 && Math.random() < Math.min(0.35, 0.12 + chestZone * 0.002);

              if (willDropHero) {
                const hero = chestHeroes[Math.floor(Math.random() * chestHeroes.length)];
                setNewLootCount(c => c + 1);
                setLootModal({
                  // reuse lootModal renderer by storing a special kind payload
                  chest: true,
                  chestKind: "hero",
                  heroId: hero.id,
                  zone: chestZone,
                  // keep compatibility with existing modal UI
                  emoji: hero.emoji,
                  name: `Chest Unsealed · ${hero.name}`,
                  label: "Hero Unlock",
                  bonus: 0,
                });
              } else {
                const itemCount = 1 + (Math.random() < 0.25 ? 1 : 0);
                setNewLootCount(c => c + 1);
                // store as chest+items; we will render an opening modal and then add items/loot
                setLootModal({
                  chest: true,
                  chestKind: "loot",
                  zone: chestZone,
                  emoji: "🎁",
                  name: `Chest Unsealed · Zone ${chestZone}`,
                  label: "Loot",
                  bonus: 0,
                  items: Array.from({ length: itemCount }, () => rollLootItem(chestZone)),
                });
              }
            }
          } else {
            checkAchievements({ totalKills: newTotalKills, totalGoldEarned: newGoldEarned });
            spawnEnemy(gsRef.current.zone);
          }
          return newK;
        });

        return 0;
      }

      // hit flash
      setEnemyHitNonce((n) => n + 1);

      return next;
    });
  }, [spawnEnemy]);

  // ── click handler ─────────────────────────────────────────────────────────
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = floatId.current++;
    // Drive combo counter (cap at 30 — max tier)
    lastClickTimeRef.current = Date.now();
    const newCombo = Math.min(30, comboCount + 1);
    setComboCount(newCombo);
    // Track lifetime clicks
    const newClicks = gsRef.current.totalClicks + 1;
    setTotalClicks(newClicks);
    // Track max combo
    const newMaxCombo = Math.max(gsRef.current.maxComboReached, newCombo);
    if (newMaxCombo > gsRef.current.maxComboReached) setMaxComboReached(newMaxCombo);
    checkAchievements({ totalClicks: newClicks, maxCombo: newMaxCombo });
    // Float color: berserk > high-combo gold > mid-combo blue > base red
    const floatColor = isBerserk ? "#ff8800" : comboMult >= 4 ? "#f5c518" : comboMult >= 2 ? "#4488ff" : "#ff4444";
    setFloats(f => [...f, { id, x, y, value: comboDmg, color: floatColor }]);
    setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 900);
    setShake(true);
    setTimeout(() => setShake(false), 150);
    dealDamage(comboDmg);
  };

  // ── MASTER GAME LOOP ──────────────────────────────────────────────────────
  // Single requestAnimationFrame loop replaces 6 separate setInterval timers:
  //   200ms  clock tick         (drives UI countdowns / kill timer)
  //   100ms  idle DPS applier   (passive damage per tick)
  //   500ms  companion DPS tick (party member damage)
  //  2500ms  weak-point spawner (hotspot targets on enemy)
  //   150ms  combo decay        (drains combo when player stops tapping)
  //   500ms  companion abilities auto-fire + buff recompute
  //
  // Benefits vs. 6 × setInterval:
  //   • One timer in the JS event queue instead of six
  //   • RAF is suspended automatically when the tab is hidden (free CPU savings)
  //   • All subsystems tick from a single coherent timestamp — no drift skew
  //   • Each subsystem fires at its own cadence via a per-system lastFired stamp
  useEffect(() => {
    const last = {
      clock:       0,  // 200ms
      idleDps:     0,  // 100ms
      companion:   0,  // 500ms
      weakPoint:   0,  // 2500ms
      comboDecay:  0,  // 150ms
      compAbility: 0,  // 500ms
      petGold:     0,  // 3000ms — Slime King Mini auto-gold tick
    };

    let rafId;
    const tick = (ts) => {
      rafId = requestAnimationFrame(tick);

      // 200ms — clock: updates `now` state which drives kill-timer countdown UI
      if (ts - last.clock >= 200) {
        last.clock = ts;
        setNow(Date.now());
      }

      // 100ms — idle DPS: apply passive damage in small increments (÷10 per 100ms = per-second rate)
      if (ts - last.idleDps >= 100) {
        last.idleDps = ts;
        if (gsRef.current.idleDps > 0) dealDamage(gsRef.current.idleDps / 10);
      }

      // 500ms — companion DPS tick
      if (ts - last.companion >= 500) {
        last.companion = ts;
        const dmg =
          computeCompanionTickDmg(
            gsRef.current.companionLevels,
            gsRef.current.artSynergy,
            gsRef.current.effectiveDmg,
          ) *
          gsRef.current.rebirthMult *
          gsRef.current.pathDpsMult;
        if (dmg > 0) dealDamage(dmg);
      }

      // 2500ms — weak-point spawner
      if (ts - last.weakPoint >= 2500) {
        last.weakPoint = ts;
        setWeakPoints(prev => {
          if (prev.length >= gsRef.current.maxWp) return prev;
          const id = wpIdRef.current++;
          const x = 12 + Math.random() * 76;
          const y = 12 + Math.random() * 55;
          setTimeout(() => setWeakPoints(p => p.filter(w => w.id !== id)), 1500);
          return [...prev, { id, x, y }];
        });
      }

      // 150ms — combo decay: drain combo counter when player has stopped tapping
      if (ts - last.comboDecay >= 150) {
        last.comboDecay = ts;
        if (Date.now() - lastClickTimeRef.current > 800) {
          setComboCount(c => (c > 0 ? Math.max(0, c - 3) : 0));
        }
      }

      // 3000ms — Slime King Mini: auto-collect gold = mult × current enemy goldReward × all gold modifiers
      if (ts - last.petGold >= 3000) {
        last.petGold = ts;
        const tickMult = gsRef.current.petGoldTickMult;
        if (tickMult > 0 && gsRef.current.enemy) {
          const tickGold = Math.floor(
            gsRef.current.enemy.goldReward *
            tickMult *
            gsRef.current.goldMult *
            gsRef.current.rebirthMult *
            gsRef.current.artGoldMult
          );
          if (tickGold > 0) {
            setGold(g => g + tickGold);
          }
        }
      }

      // 500ms — companion ability auto-fire
      if (ts - last.compAbility >= 500) {
        last.compAbility = ts;
        const now = Date.now();
        if (gsRef.current.exhaustionUntil <= now) {
          let anyFired = false;
          const newState = { ...gsRef.current.compAbilityState };

          for (const ab of COMPANION_ABILITIES) {
            const level = gsRef.current.companionLevels[ab.compId] || 0;
            if (level < 1) continue;
            const tier = getCompAbilityTier(ab, level);
            if (!tier) continue;
            const st = newState[ab.id];
            if (now < st.cdUntil) continue;

            anyFired = true;
            const dur = tier.effect.dur || 0;
            newState[ab.id] = { activeUntil: now + dur, cdUntil: now + tier.cooldown };
            if (tier.effect.burstDmgPct) {
              dealDamage(gsRef.current.enemy.maxHp * tier.effect.burstDmgPct);
            }
          }

          if (anyFired) {
            setCompAbilityState(newState);
            let clickMult = 1, dpsMult = 1, goldMult = 1;
            for (const ab of COMPANION_ABILITIES) {
              const st = newState[ab.id];
              if (now >= st.activeUntil) continue;
              const level = gsRef.current.companionLevels[ab.compId] || 0;
              const tier = getCompAbilityTier(ab, level);
              if (!tier) continue;
              if (tier.effect.clickBuff) clickMult *= tier.effect.clickBuff;
              if (tier.effect.dpsBuff)   dpsMult   *= (1 + tier.effect.dpsBuff);
              if (tier.effect.goldBuff)  goldMult  *= tier.effect.goldBuff;
            }
            setCompBuffs({ clickMult, dpsMult, goldMult });
          }
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [dealDamage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── companion buff expiry watcher (every 200ms via now tick) ──────────────
  useEffect(() => {
    let clickMult = 1, dpsMult = 1, goldMult = 1;
    for (const ab of COMPANION_ABILITIES) {
      const st = compAbilityState[ab.id];
      if (!st || now >= st.activeUntil) continue;
      const level = companionLevels[ab.compId] || 0;
      const tier = getCompAbilityTier(ab, level);
      if (!tier) continue;
      if (tier.effect.clickBuff) clickMult *= tier.effect.clickBuff;
      if (tier.effect.dpsBuff)   dpsMult   *= (1 + tier.effect.dpsBuff);
      if (tier.effect.goldBuff)  goldMult  *= tier.effect.goldBuff;
    }
    const prev = gsRef.current.compBuffs;
    if (prev.clickMult !== clickMult || prev.dpsMult !== dpsMult || prev.goldMult !== goldMult) {
      setCompBuffs({ clickMult, dpsMult, goldMult });
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── summon portal phase: portal → revealing ───────────────────────────────
  useEffect(() => {
    if (!summonModal || summonModal.phase !== "portal") return;
    const hasLegendary = summonModal.results.some(r => r.rarity === "Legendary");
    const delay = hasLegendary ? 2200 : 1500;
    const t = setTimeout(() => {
      setSummonModal(m => m ? { ...m, phase: "revealing", revealIdx: 0 } : null);
    }, delay);
    return () => clearTimeout(t);
  }, [summonModal?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── summon modal phase: auto-advance card reveals ─────────────────────────
  useEffect(() => {
    if (!summonModal || summonModal.phase !== "revealing") return;
    if (summonModal.revealIdx >= summonModal.results.length) {
      setSummonModal(m => m ? { ...m, phase: "done" } : null);
      return;
    }
    const card     = summonModal.results[summonModal.revealIdx];
    const isLegend = card?.rarity === "Legendary";
    const delay    = isLegend ? 1400 : 380;
    const t = setTimeout(() => {
      setSummonModal(m => m ? { ...m, revealIdx: m.revealIdx + 1 } : null);
    }, delay);
    return () => clearTimeout(t);
  }, [summonModal?.phase, summonModal?.revealIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── chronicle trigger — fires once per threshold, skips on initial save-load ──
  useEffect(() => {
    if (!saveLoadedRef.current) return; // suppress on restore
    const entry = CHRONICLES.find(c => c.zone === zone);
    if (!entry) return;
    if (gsRef.current.seenChronicles.includes(zone)) return;
    setSeenChronicles((prev) => [...prev, zone]);
    setActiveChronicle(entry);
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── story popup trigger — based on STORY_EVENTS, once per zone ──
  useEffect(() => {
    if (!saveLoadedRef.current) return;
    const ev = STORY_EVENTS.find((e) => e.zone === zone);
    if (!ev) return;
    if (gsRef.current.seenStoryZones.includes(zone)) return;
    setSeenStoryZones((prev) => {
      const next = [...prev, zone];
      gsRef.current.seenStoryZones = next;
      return next;
    });
    setStoryPopup(ev);
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── boss stage timer — start countdown when entering a boss zone (auto-advance only) ──
  useEffect(() => {
    if (!saveLoadedRef.current) return;
    if (!BOSS_ZONES.has(zone)) { setBossTimerEnd(null); return; }
    if (farmMode)               { setBossTimerEnd(null); return; }
    // Timer scales with zone: 60s early, 75s mid, 90s late — bosses take longer to prepare for
    const duration = zone <= 20 ? 60000 : zone <= 50 ? 75000 : 90000;
    setBossTimerEnd(Date.now() + duration);
  }, [zone, farmMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── boss timer expiry — kick back to previous zone in farm mode ──
  useEffect(() => {
    if (bossTimerEnd === null) return;
    if (now < bossTimerEnd)   return;
    // Timer ran out — push back
    const prevZone = Math.max(1, zone - 1);
    setBossTimerEnd(null);
    setZone(prevZone);
    gsRef.current.zone = prevZone;
    spawnEnemy(prevZone);
    setFarmMode(true);
    setBossFailToast({ prevZone });
    setTimeout(() => setBossFailToast(null), 2500);
  }, [now, bossTimerEnd, zone, spawnEnemy]);

  // ── enemy kill timer expiry — retreat + exhaustion debuff ─────────────────
  useEffect(() => {
    if (!enemyKillTimerEnd) return;
    if (now < enemyKillTimerEnd) return;
    if (BOSS_ZONES.has(gsRef.current.zone)) return; // bosses use their own timer
    // Retreat to previous zone
    const prevZone = Math.max(1, gsRef.current.zone - 1);
    setEnemyKillTimerEnd(null);
    setZone(prevZone);
    gsRef.current.zone = prevZone;
    spawnEnemy(prevZone);
    setFarmMode(true);
    // Apply exhaustion — locks all abilities
    setExhaustionUntil(Date.now() + EXHAUSTION_DURATION);
    setRetreatToast({ prevZone });
    setTimeout(() => setRetreatToast(null), 3500);
  }, [now, enemyKillTimerEnd, spawnEnemy]);

  // ── sync kill timer when farm mode is toggled ─────────────────────────────
  useEffect(() => {
    if (farmMode) {
      setEnemyKillTimerEnd(null); // no kill timer while farming
    } else if (!BOSS_ZONES.has(gsRef.current.zone)) {
      // Resuming auto-advance — start a fresh kill timer for the current enemy
      setEnemyKillTimerEnd(Date.now() + getEnemyKillWindow(gsRef.current.zone));
    }
  }, [farmMode]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── buy hero ──────────────────────────────────────────────────────────────
  const buyHero = (hero, count = 1, totalCost = null) => {
    const level = heroLevels[hero.id] || 0;
    const achDiscount = computeAchievementBonuses(unlockedAchievements).upgradeCostReduce;
    const cost = totalCost ?? Math.max(1, Math.floor(heroCost(hero, level) * (1 - achDiscount)));
    if (count < 1 || gold < cost) return;

    const acquisitionKind = hero.acquisition?.kind || "shop";

    // Chest / real-money heroes cannot be bought via gold.
    if (level === 0 && (acquisitionKind === "chest" || acquisitionKind === "realmoney")) return;

    setGold(g => g - cost);
    const newSpent = gsRef.current.totalGoldSpent + cost;
    setTotalGoldSpent(newSpent);
    checkAchievements({ totalGoldSpent: newSpent });

    const newLevel = level + count;
    setHeroLevels(prev => ({ ...prev, [hero.id]: newLevel }));

    // Check for milestone crossing (any milestone between old and new level)
    const crossedMs = HERO_MILESTONES.filter(m => m.level > level && m.level <= newLevel);
    if (crossedMs.length > 0) {
      const ms = crossedMs[crossedMs.length - 1];
      setMilestoneToast({ hero, level: newLevel, mult: ms.label });
      setTimeout(() => setMilestoneToast(null), 3000);
    }
  };

  // ── buy companion (bulk-aware) ─────────────────────────────────────────────
  const buyCompanion = (comp, count = 1, totalCost = null) => {
    const level = companionLevels[comp.id] || 0;
    const cost  = totalCost ?? companionCost(comp, level);
    if (count < 1 || gold < cost) return;
    setGold(g => g - cost);
    const newSpentC = gsRef.current.totalGoldSpent + cost;
    setTotalGoldSpent(newSpentC);
    checkAchievements({ totalGoldSpent: newSpentC });
    setCompanionLevels(prev => ({ ...prev, [comp.id]: (prev[comp.id] || 0) + count }));
  };

  // ── buy upgrade ───────────────────────────────────────────────────────────
  const buyUpgrade = (upg) => {
    if (gold < upg.cost || boughtUpgrades.includes(upg.id)) return;
    setGold(g => g - upg.cost);
    const newSpentU = gsRef.current.totalGoldSpent + upg.cost;
    setTotalGoldSpent(newSpentU);
    checkAchievements({ totalGoldSpent: newSpentU });
    setBoughtUpgrades(prev => [...prev, upg.id]);
    if (upg.type === "click") setClickDmg(d => d + upg.value);
  };

  // ── use ability ───────────────────────────────────────────────────────────
  const useAbility = (ab) => {
    if (gsRef.current.exhaustionUntil > Date.now()) return; // exhausted — abilities locked
    const state = abilityState[ab.id];
    if (now < state.cdUntil) return;
    const t = Date.now();
    let reducedCd = Math.floor(ab.cooldown * (1 - cdReduction));
    if (commanderPath === "vanguard" && ab.id === "berserk") reducedCd = Math.floor(reducedCd * 0.5);
    let duration = ab.duration;
    if (commanderPath === "void_mage") duration += 5000;
    setAbilityState(prev => ({ ...prev, [ab.id]: { activeUntil: t + duration, cdUntil: t + reducedCd } }));
  };

  // ── buy artifact upgrade ──────────────────────────────────────────────────
  const buyArtifact = (art) => {
    if (soulCrystals < art.cost || artifactOwned.includes(art.id)) return;
    setSoulCrystals(c => c - art.cost);
    setArtifactOwned(prev => [...prev, art.id]);
  };

  // ── equip / unequip loot — slot-aware ────────────────────────────────────
  const toggleEquip = (itemId) => {
    setLootItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const itemSlot = item.slot || item.type?.toLowerCase();
      if (item.equipped) {
        // Unequip
        return prev.map(i => i.id === itemId ? { ...i, equipped: false } : i);
      } else {
        // Equip: unequip anything already in this slot
        return prev.map(i => {
          if (i.id === itemId) return { ...i, equipped: true };
          const iSlot = i.slot || i.type?.toLowerCase();
          if (iSlot === itemSlot && i.equipped) return { ...i, equipped: false };
          return i;
        });
      }
    });
  };

  // ── claim loot from modal ─────────────────────────────────────────────────
  // Placeholder ad flow (Google AdMob rewarded video):
  // later you can replace this function with your actual rewarded-ad SDK.
  const watchAd = async () => {
    // eslint-disable-next-line no-unused-vars
    const _ = true;
    // Return true to allow chest opening.
    return true;
  };

  const claimLoot = () => {
    if (!lootModal) return;

    // Chest hero unlock
    if (lootModal.chest && lootModal.chestKind === "hero") {
      const heroId = lootModal.heroId;
      const hero = HEROES.find(h => h.id === heroId);
      if (!hero) {
        setLootModal(null);
        return;
      }
      const alreadyOwned = (heroLevels[heroId] || 0) > 0;
      if (alreadyOwned) {
        // Duplicate hero — award Void Dust consolation instead of nothing
        const dustReward = 25 + Math.floor(lootModal.zone * 2);
        setVoidDust(d => d + dustReward);
      } else {
        setHeroLevels(prev => ({ ...prev, [heroId]: 1 }));
      }
      setLootModal(null);
      return;
    }

    // Chest loot
    if (lootModal.chest && lootModal.chestKind === "loot") {
      const items = (lootModal.items || []).map(it => ({ ...it, equipped: true }));
      setLootItems(prev => [...prev, ...items]);
      setLootModal(null);
      return;
    }

    // Normal single loot item (legacy behavior)
    setLootItems(prev => [...prev, { ...lootModal, equipped: true }]);
    setLootModal(null);
  };

  // ── scrap item → earn Void Dust ───────────────────────────────────────────
  const scrapItem = (itemId) => {
    setLootItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const rarityMult = { Common: 1, Rare: 2, Epic: 4, Legendary: 8 }[item.rarity || getItemRarity(item.bonus)] || 1;
      const dust = Math.max(1, Math.floor(item.bonus / 5)) * rarityMult;
      setVoidDust(d => d + dust);
      return prev.filter(i => i.id !== itemId);
    });
  };

  // ── reforge item → spend Void Dust for +bonus% ────────────────────────────
  const reforgeItem = (itemId, amount, cost) => {
    if (voidDust < cost) return;
    setVoidDust(d => d - cost);
    setLootItems(prev => prev.map(i => i.id === itemId ? { ...i, upgradeLevel: (i.upgradeLevel || 0) + amount } : i));
  };

  // ── fuse 3 items of same slot → +1 star (max ★5) ─────────────────────────
  const fuseItems = (keepId, consumeIds) => {
    if (consumeIds.length < 2) return;
    setLootItems(prev => {
      const keep = prev.find(i => i.id === keepId);
      if (!keep) return prev;
      const newStars = Math.min(5, (keep.stars || 1) + 1);
      const starMult  = 1 + (newStars - 1) * 0.12;
      const chain     = WEAPON_CHAINS[keep.type];
      const chainEntry = chain ? chain[keep.evolutionTier || 0] : null;
      const baseBonus  = chainEntry ? chainEntry.bonusBase : keep.bonus;
      const newBonus   = Math.round(baseBonus * starMult);
      const newRarity  = chainEntry ? chainEntry.rarity : getItemRarity(newBonus);
      return prev
        .filter(i => !consumeIds.includes(i.id))
        .map(i => i.id === keepId
          ? { ...i, stars: newStars, bonus: newBonus, rarity: newRarity }
          : i
        );
    });
  };

  // ── evolve item to next chain tier (requires ★5, costs Void Dust) ─────────
  const evolveItem = (itemId) => {
    setLootItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const chain = WEAPON_CHAINS[item.type];
      if (!chain) return prev;
      const nextTier = (item.evolutionTier || 0) + 1;
      if (nextTier >= chain.length) return prev;
      const cost = evolveCost(item.evolutionTier || 0);
      if (voidDust < cost) return prev;
      setVoidDust(d => d - cost);
      const nextEntry = chain[nextTier];
      // Keep prefix, swap chain name
      const prefix = item.name.split(" ")[0];
      const newBonus = Math.round(nextEntry.bonusBase * (1 + ((item.stars || 1) - 1) * 0.12));
      return prev.map(i => i.id === itemId
        ? { ...i,
            evolutionTier: nextTier,
            name: `${prefix} ${nextEntry.name}`,
            emoji: nextEntry.emoji,
            rarity: nextEntry.rarity,
            stars: 1,          // reset stars on evolution
            bonus: newBonus,
            upgradeLevel: 0,
          }
        : i
      );
    });
  };

  // ── gacha pull ────────────────────────────────────────────────────────────
  const performPull = (banner, count = 1) => {
    const cost = GACHA_PULL_COST * count;
    if (eclipseShards < cost) return;
    setEclipseShards(s => s - cost);

    const pool = banner === "hero" ? HERO_BANNER_POOL : SPIRIT_EGG_POOL;
    const results = [];
    let pity = gachaPity[banner] || 0;

    for (let i = 0; i < count; i++) {
      pity++;
      const rarity  = rollGachaRarity(pity);
      const item    = drawFromPool(pool, rarity);
      const isNew   = banner === "hero"
        ? (heroLevels[item.id] || 0) === 0
        : !petOwned[item.id];
      results.push({ ...item, isNew, pullIndex: i });
      if (rarity === "Legendary") pity = 0;
    }

    setGachaPity(prev => ({ ...prev, [banner]: pity }));
    setPullHistory(prev => [...results.map(r => ({ rarity: r.rarity, emoji: r.emoji || HEROES.find(h=>h.id===r.id)?.emoji, name: r.name || HEROES.find(h=>h.id===r.id)?.name })), ...prev].slice(0, 30));

    // Apply results to game state immediately (rewards in background, drama in foreground)
    if (banner === "hero") {
      const newLevels = { ...heroLevels };
      let dust = 0;
      for (const r of results) {
        const hero = HEROES.find(h => h.id === r.id);
        if (!hero) continue;
        if ((newLevels[hero.id] || 0) > 0) {
          // Duplicate: award Void Dust as consolation
          dust += { Common: 5, Rare: 15, Epic: 40, Legendary: 120 }[r.rarity] || 5;
        } else {
          newLevels[hero.id] = 1;
        }
      }
      setHeroLevels(newLevels);
      if (dust > 0) setVoidDust(d => d + dust);
    } else {
      const newPets = { ...petOwned };
      let dust = 0;
      for (const r of results) {
        if (newPets[r.id]) {
          dust += { Common: 3, Rare: 10, Epic: 30, Legendary: 100 }[r.rarity] || 3;
        } else {
          newPets[r.id] = { tier: 0 };
        }
      }
      setPetOwned(newPets);
      if (dust > 0) setVoidDust(d => d + dust);
      // Auto-equip first legendary spirit if no pet active
      const legendary = results.find(r => r.rarity === "Legendary" && !petOwned[r.id]);
      if (legendary && !activePet) setActivePet(legendary.id);
    }

    // Start the reveal modal
    setSummonModal({ phase: "portal", banner, results, revealIdx: -1 });
  };

  // ── buy pet ───────────────────────────────────────────────────────────────
  const buyPet = (pet) => {
    if (petOwned[pet.id]) return; // already owned
    if (zone < pet.unlockZone) return; // not unlocked yet
    if (pet.unlockCurrency === "gold") {
      if (gold < pet.unlockCost) return;
      setGold(g => g - pet.unlockCost);
      const spent = gsRef.current.totalGoldSpent + pet.unlockCost;
      setTotalGoldSpent(spent);
      checkAchievements({ totalGoldSpent: spent });
    } else if (pet.unlockCurrency === "voidDust") {
      if (voidDust < pet.unlockCost) return;
      setVoidDust(d => d - pet.unlockCost);
    } else if (pet.unlockCurrency === "soulCrystals") {
      if (soulCrystals < pet.unlockCost) return;
      setSoulCrystals(c => c - pet.unlockCost);
    }
    setPetOwned(prev => ({ ...prev, [pet.id]: { tier: 0 } }));
    setActivePet(pet.id); // auto-equip newly bought pet
    setNewPetCount(c => c + 1);
  };

  // ── evolve pet ────────────────────────────────────────────────────────────
  const evolvePet = (pet) => {
    const owned = petOwned[pet.id];
    if (!owned) return;
    const currentTier = owned.tier || 0;
    const tierData = pet.tiers[currentTier];
    if (!tierData || tierData.evolveCost === null) return; // max tier
    if (tierData.evolveCurrency === "voidDust") {
      if (voidDust < tierData.evolveCost) return;
      setVoidDust(d => d - tierData.evolveCost);
    }
    setPetOwned(prev => ({ ...prev, [pet.id]: { tier: currentTier + 1 } }));
    setNewPetCount(c => c + 1);
  };

  // ── weak point crit click ─────────────────────────────────────────────────
  const handleWeakPointClick = (e, wp) => {
    e.stopPropagation();
    const critMult = (commanderPath === "void_mage" ? 4 : 3) + petBonuses.critAdd;
    const critDmg = effectiveDmg * critMult;
    const rect = e.currentTarget.closest('[data-enemycard]').getBoundingClientRect();
    const cx = (wp.x / 100) * rect.width;
    const cy = (wp.y / 100) * rect.height;
    const id = floatId.current++;
    setFloats(f => [...f, { id, x: cx, y: cy, value: critDmg, color: "#ffcc00", crit: true }]);
    setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 1000);
    setWeakPoints(p => p.filter(w => w.id !== wp.id));
    dealDamage(critDmg);
  };

  // ── rebirth ───────────────────────────────────────────────────────────────
  const doRebirth = () => {
    const newRebirthCount = rebirthCount + 1;
    setRebirthCount(newRebirthCount);
    checkAchievements({ totalRebirths: newRebirthCount });
    setSoulCrystals(c => c + 1);

    // Milestone bonuses
    const unlockedMilestones = REBIRTH_MILESTONES.filter(m => newRebirthCount >= m.count);
    const startGoldBonus = unlockedMilestones.filter(m => m.type === "startGold").reduce((s, m) => s + m.value, 0);
    const startCompanion = unlockedMilestones.find(m => m.type === "startCompanion");
    const baseClickBonus = unlockedMilestones.filter(m => m.type === "baseClickBonus").reduce((s, m) => s + m.value, 0);

    setGold(startGoldBonus);
    setHeroLevels({});
    setCompanionLevels(startCompanion ? { [startCompanion.value]: 1 } : {});
    setBoughtUpgrades([]);
    setClickDmg(1 + baseClickBonus);
    setKillCount(0);
    setZone(1);
    gsRef.current.zone = 1;
    spawnEnemy(1);
    setCommanderPath(null);
    setRebirthConfirm(false);
    setPathChoiceModal(true); // choose new path for this lifetime
  };

  const chooseCommanderPath = (pathId) => {
    setCommanderPath(pathId);
    setPathChoiceModal(false);
  };

  const hpPct = Math.max(0, (enemyHp / currentEnemy.maxHp) * 100);
  // Derive equippedSlots from lootItems for the paperdoll UI
  const equippedSlots = {};
  for (const item of lootItems) {
    if (item.equipped) {
      const slot = item.slot || (item.type === "Armor" ? "chest" : item.type?.toLowerCase());
      equippedSlots[slot] = item;
    }
  }
  const companionDps = computeCompanionTickDmg(companionLevels, artBonuses.synergyPct, effectiveDmg) * 2 * rebirthMult * pathDpsMult;
  const activePath      = COMMANDER_PATHS.find(p => p.id === commanderPath) || null;
  const isBossZone      = BOSS_ZONES.has(zone);
  const bossTimeLeft    = bossTimerEnd !== null ? Math.max(0, Math.ceil((bossTimerEnd - now) / 1000)) : null;
  const bossTimerDuration = zone <= 20 ? 60000 : zone <= 50 ? 75000 : 90000;
  const bossTimePct     = bossTimerEnd !== null ? Math.max(0, ((bossTimerEnd - now) / bossTimerDuration) * 100) : 0;
  const bossTimerDanger = bossTimeLeft !== null && bossTimeLeft <= 10;
  const comboMult       = getComboMult(comboCount);
  const comboColor      = getComboColor(comboCount);
  const comboDmg        = effectiveDmg * comboMult; // actual click damage with combo
  const comboPct        = Math.min(100, (comboCount / 30) * 100);

  // Time-to-kill estimate (idle DPS + companion DPS only — excludes click)
  const passiveDps    = idleDps + companionDps;
  const ttkSeconds    = passiveDps > 0 ? enemyHp / passiveDps : null;
  const ttkLabel      = ttkSeconds === null ? null
                      : ttkSeconds < 3   ? { text: "< 3s",  color: "#44cc88" }
                      : ttkSeconds < 15  ? { text: `~${ttkSeconds.toFixed(0)}s`, color: "#88cc44" }
                      : ttkSeconds < 60  ? { text: `~${ttkSeconds.toFixed(0)}s`, color: "#f5c518" }
                      : ttkSeconds < 300 ? { text: `~${Math.ceil(ttkSeconds / 60)}m`,  color: "#ff8844" }
                      :                   { text: "Very slow", color: "#cc4422" };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <style>{css}</style>

      {/* HEADER */}
      <header style={S.header}>
        <div>
          <div style={S.logo}>⚔ IDLE CRUSADE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={S.subtitle}>Eclipse Year III · Zone {zone}</span>
            {activePath && (
              <span style={{ fontSize: 9, fontWeight: "bold", letterSpacing: 1, padding: "1px 6px", borderRadius: 4, border: `1px solid ${activePath.color}88`, background: activePath.color + "22", color: activePath.color }}>
                {activePath.emoji} {activePath.name.replace("The ", "")}
              </span>
            )}
          </div>
        </div>
        <div style={S.goldPill}>🪙 <span style={S.goldNum}>{fmt(gold)}</span></div>
        <div
          style={{ ...S.goldPill, borderColor: "#3a2a5a", cursor: "pointer" }}
          onClick={() => setTab("summon")}
          title="Eclipse Shards — used for Summoning"
        >
          🌑 <span style={{ color: "#cc88ff", fontWeight: "bold" }}>{eclipseShards}</span>
        </div>
      </header>

      {/* ABILITY BARS — ultra-compact strip */}
      <div style={{ background: "#0a0908", borderBottom: "1px solid #1e1810", flexShrink: 0, padding: "2px 8px", display: "flex", flexDirection: "column", gap: 2 }}>

        {/* ── EXHAUSTION BANNER ── */}
        {isExhausted && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "3px 8px", borderRadius: 5, marginBottom: 1,
            background: "linear-gradient(90deg,#1a0808,#220a0a)",
            border: "1px solid #6a1010",
            animation: "exhaustionPulse 1.2s ease-in-out infinite",
          }}>
            <span style={{ fontSize: 9, fontWeight: "bold", color: "#cc3333", letterSpacing: 1.5, textTransform: "uppercase" }}>
              😴 Exhausted — abilities locked
            </span>
            <span style={{ fontSize: 10, fontWeight: "bold", color: "#ff5555", fontVariantNumeric: "tabular-nums" }}>
              {exhaustionLeft}s
            </span>
          </div>
        )}

        {/* Player abilities row */}
        <div style={{ display: "flex", gap: 4, opacity: isExhausted ? 0.35 : 1, transition: "opacity 0.3s" }}>
          {ABILITIES.map(ab => {
            const st     = abilityState[ab.id];
            const active = !isExhausted && now < st.activeUntil;
            const onCd   = isExhausted || (now < st.cdUntil && !active);
            const cdSec  = onCd && !isExhausted ? Math.ceil((st.cdUntil - now) / 1000) : 0;
            const actSec = active ? Math.ceil((st.activeUntil - now) / 1000) : 0;
            return (
              <button key={ab.id}
                style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 3,
                  padding: "2px 6px", borderRadius: 5,
                  border: `1px solid ${isExhausted ? "#3a1010" : active ? ab.color : onCd ? "#2a2010" : ab.color + "66"}`,
                  background: isExhausted ? "#110808" : active ? ab.color + "22" : "#110d08",
                  opacity: onCd ? 0.5 : 1, cursor: (onCd || isExhausted) ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
                onClick={() => useAbility(ab)} disabled={onCd || isExhausted}
              >
                <span style={{ fontSize: 11 }}>{isExhausted ? "💤" : ab.emoji}</span>
                <span style={{ fontSize: 8, fontWeight: "bold", color: isExhausted ? "#6a2a2a" : active ? ab.color : "#c8b89a", flex: 1, textAlign: "left" }}>{ab.name}</span>
                <span style={{ fontSize: 8, color: isExhausted ? "#6a2a2a" : active ? ab.color : onCd ? "#5a4a2a" : "#6a8a4a", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  {isExhausted ? "locked" : active ? `${actSec}s` : onCd ? `${cdSec}s` : ab.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Companion abilities row — only if any companion hired */}
        {COMPANION_ABILITIES.some(ab => (companionLevels[ab.compId] || 0) >= 1) && (() => {
          const hired = COMPANION_ABILITIES.filter(ab => (companionLevels[ab.compId] || 0) >= 1);
          return (
            <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 1, opacity: isExhausted ? 0.3 : 1, transition: "opacity 0.3s" }}>
              {hired.map(ab => {
                const level  = companionLevels[ab.compId] || 0;
                const tier   = getCompAbilityTier(ab, level);
                const st     = compAbilityState[ab.id];
                const active = !isExhausted && now < st.activeUntil;
                const onCd   = isExhausted || (now < st.cdUntil && !active);
                const cdSec  = onCd && !isExhausted ? Math.ceil((st.cdUntil - now) / 1000) : 0;
                const actSec = active ? Math.ceil((st.activeUntil - now) / 1000) : 0;
                const cdPct  = onCd && tier && !isExhausted ? Math.max(0, ((st.cdUntil - now) / tier.cooldown) * 100) : 0;
                return (
                  <div key={ab.id} style={{
                    flexShrink: 0, display: "flex", alignItems: "center", gap: 3,
                    padding: "1px 5px", borderRadius: 4, position: "relative",
                    border: `1px solid ${isExhausted ? "#3a1010" : active ? ab.color : onCd ? "#2a2010" : ab.color + "44"}`,
                    background: isExhausted ? "#110808" : active ? ab.color + "15" : "#0d0b08",
                    opacity: onCd ? 0.6 : 1, minWidth: 0,
                  }}>
                    <span style={{ fontSize: 10 }}>{isExhausted ? "💤" : ab.emoji}</span>
                    <span style={{ fontSize: 7, fontWeight: "bold", color: isExhausted ? "#6a2a2a" : active ? ab.color : "#a89878", whiteSpace: "nowrap" }}>{ab.name}</span>
                    <span style={{ fontSize: 7, color: isExhausted ? "#6a2a2a" : active ? ab.color : onCd ? "#5a4a2a" : "#44aa44", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {isExhausted ? "💤" : active ? `⚡${actSec}s` : onCd ? `${cdSec}s` : "▶"}
                    </span>
                    {onCd && tier && !isExhausted && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1e1810", borderRadius: "0 0 4px 4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${100 - cdPct}%`, background: ab.color, transition: "width 0.5s linear" }} />
                      </div>
                    )}
                    <span style={{ fontSize: 5, color: "#3a2a1a", position: "absolute", top: 1, right: 2 }}>AUTO</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* CONTENT */}
      <div style={S.content}>

        {/* ACHIEVEMENT TOAST */}
        {achievementToast && (
          <div style={{
            position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
            zIndex: 200, minWidth: 280, maxWidth: 340,
            background: "linear-gradient(135deg,#1a0e2a,#0d1a1a)",
            border: "2px solid #7a40cc",
            borderRadius: 14, padding: "14px 18px",
            boxShadow: "0 0 40px #7a40cc55",
            animation: "achieveSlide 0.3s ease",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 32, flexShrink: 0 }}>{achievementToast.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#a060ee", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Achievement Unlocked</div>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#e0c8ff", marginBottom: 3 }}>{achievementToast.name}</div>
              <div style={{ fontSize: 11, color: "#44cc88", fontWeight: "bold" }}>{achievementToast.rewardText}</div>
              <div style={{ fontSize: 10, color: "#6a5a7a", fontStyle: "italic", marginTop: 2 }}>{achievementToast.flavor}</div>
            </div>
          </div>
        )}

        {/* STORY POPUP — only when no chronicle is blocking */}
        {storyPopup && !activeChronicle && (
          <div
            style={{
              background: "#18140f",
              border: "2px solid #a855f7",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "16px",
              width: "100%",
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
              boxShadow: "0 0 30px #a855f722",
            }}
          >
            <div style={{ color: "#fbbf24", fontWeight: "bold", marginBottom: "8px" }}>
              {storyPopup.speaker}
            </div>
            <div style={{ color: "#e5e7eb" }}>{storyPopup.text}</div>
            <button
              onClick={() => setStoryPopup(null)}
              style={{
                marginTop: "12px",
                background: "#a855f7",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── BATTLE ── */}
        {tab === "battle" && (
          <div style={S.battleView}>

            {/* Active Commander Path reminder */}
            {activePath && (
              <div style={{ width: "100%", background: activePath.color + "0f", border: `1px solid ${activePath.color}44`, borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{activePath.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: "bold", color: activePath.color, letterSpacing: 0.5 }}>{activePath.name}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                    {activePath.bonuses.map((b, i) => (
                      <span key={i} style={{ fontSize: 8, color: activePath.color + "bb" }}>✦ {b}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── AREA NAME + ZONE PROGRESS — very top ── */}
            {(() => {
              const r = getCurrentRegion(zone);
              return (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3 }}>
                  {/* Area name row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: r.accent + "18", border: `1px solid ${r.accent}55`, borderRadius: 7 }}>
                    <span style={{ fontSize: 13 }}>{r.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: "bold", color: r.accent, flex: 1, letterSpacing: 0.5 }}>{r.name}</span>
                    <span style={{ fontSize: 10, color: r.accent + "bb", fontWeight: "bold" }}>Zone {zone}</span>
                    {/* Farm / Auto mini toggles */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 4 }}>
                      {[
                        { label: "Farm", active: farmMode, action: () => { setFarmMode(true); setBossTimerEnd(null); setEnemyKillTimerEnd(null); }, tip: "Grind here for gold" },
                        { label: "Auto", active: !farmMode, action: () => setFarmMode(false), tip: "Push to new zones" },
                      ].map(({ label, active, action, tip }) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer" }} onClick={action} title={tip}>
                          <span style={{ fontSize: 7, color: active ? "#c8b87a" : "#4a3a2a", letterSpacing: 0.5, fontWeight: "bold" }}>{label}</span>
                          <div style={{ width: 26, height: 13, borderRadius: 7, background: active ? "#3a5a18" : "#1a1408", border: `1px solid ${active ? "#6acc3088" : "#2a2010"}`, position: "relative", transition: "all 0.2s" }}>
                            <div style={{ position: "absolute", top: 1, left: active ? 14 : 1, width: 9, height: 9, borderRadius: "50%", background: active ? "#6acc30" : "#3a2a1a", transition: "left 0.15s ease", boxShadow: active ? "0 0 4px #6acc3088" : "none" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Zone progress bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "#1e1710", borderRadius: 3, border: "1px solid #2a2010", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, transition: "width 0.3s ease", width: farmMode ? "100%" : `${(killCount % 10) * 10}%`, background: farmMode ? "linear-gradient(90deg,#2a5a10,#4a8a20)" : "linear-gradient(90deg,#3a7a20,#6acc30)" }} />
                    </div>
                    <span style={{ fontSize: 9, color: farmMode ? "#6a8a3a" : "#5a7a3a", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {farmMode ? "🌾" : `${killCount % 10}/10`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const r = getCurrentRegion(zone);
              // Region-themed gradient backgrounds — no file paths needed
              const regionBgs = {
                "The Slime Outskirts":     "radial-gradient(ellipse at 60% 30%, #0d1a08 0%, #040a02 100%)",
                "Goblin Crags":            "radial-gradient(ellipse at 40% 40%, #1a1508 0%, #0a0803 100%)",
                "The Forgotten Catacombs": "radial-gradient(ellipse at 50% 20%, #120d18 0%, #05030a 100%)",
                "Orcish Wastes":           "radial-gradient(ellipse at 60% 50%, #1a0e04 0%, #090400 100%)",
                "The Troll Marshes":       "radial-gradient(ellipse at 30% 60%, #081408 0%, #020602 100%)",
                "Citadel Approach":        "radial-gradient(ellipse at 50% 30%, #0a0a1a 0%, #040408 100%)",
                "The Dragon Highlands":    "radial-gradient(ellipse at 70% 40%, #1a0804 0%, #090200 100%)",
                "The Obsidian Citadel":    "radial-gradient(ellipse at 50% 50%, #150404 0%, #080000 100%)",
              };
              const bgGradient = regionBgs[r.name] || "radial-gradient(ellipse at 50% 40%, #0d0b08 0%, #050403 100%)";
              const bossGlow = currentBoss ? `radial-gradient(ellipse at 50% 30%, ${currentBoss.regionAccent}18 0%, transparent 70%), ` : "";
              return (
            <div
              data-enemycard
              style={{
                ...S.enemyCard,
                background: bossGlow + bgGradient,
                ...(currentBoss ? { "--boss-accent": currentBoss.regionAccent } : {}),
              }}
              onClick={handleClick}
              className={`${shake ? "shake" : ""} ${currentBoss ? "boss-card" : ""}`}
            >
              {currentBoss ? (
                <>
                  {/* Region-connected boss intro banner */}
                  <div style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: (currentBoss.regionAccent || "#8a6010") + "22",
                    border: `1px solid ${currentBoss.regionAccent || "#8a6010"}55`,
                    marginBottom: 8,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 8, color: currentBoss.regionAccent || "#f5c518", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 3, fontWeight: "bold" }}>
                      ⚔ {currentBoss.regionName} — REGION BOSS
                    </div>
                    <div style={{ fontSize: 10, color: "#a89870", fontStyle: "italic", lineHeight: 1.4 }}>
                      {currentBoss.intro}
                    </div>
                  </div>
                  <img
                    key={`boss_${enemyHitNonce}`}
                    src={currentBoss.image}
                    alt={currentBoss.name}
                    className={`enemy-sprite boss-entrance ${currentBoss.idleAnim || "float"}${enemyHitNonce > 0 ? " enemy-hit" : ""}`}
                    style={{ marginBottom: 8, filter: `drop-shadow(0 0 12px ${currentBoss.regionAccent || "#f5c518"}88)` }}
                    onError={(e) => { e.currentTarget.hidden = true; const fb = e.currentTarget.nextSibling; if (fb) fb.hidden = false; }}
                  />
                  <div hidden className="enemy-idle" style={{ ...S.enemyEmoji, marginBottom: 8, fontSize: 56, filter: `drop-shadow(0 0 16px ${currentBoss.regionAccent || "#f5c518"})` }}>{currentBoss.emoji}</div>
                  <div style={{ ...S.enemyName, color: currentBoss.regionAccent || "#f5c518", textShadow: `0 0 12px ${currentBoss.regionAccent || "#f5c518"}88` }}>{currentBoss.name}</div>
                </>
              ) : (
                <>
                  <img
                    src={currentEnemy.image}
                    alt={currentEnemy.name}
                    key={enemyHitNonce}
                    className={`enemy-sprite ${currentEnemy.idleAnim || "float"}${enemyHitNonce > 0 ? " enemy-hit" : ""}`}
                    style={{ marginBottom: 8 }}
                    onError={(e) => { e.currentTarget.hidden = true; const fb = e.currentTarget.nextSibling; if (fb) fb.hidden = false; }}
                  />
                  <div hidden className="enemy-idle" style={{ ...S.enemyEmoji, marginBottom: 8 }}>{currentEnemy.emoji}</div>
                  <div style={S.enemyName}>{currentEnemy.name}</div>
                </>
              )}

              <div style={S.hpBar}><div style={{ ...S.hpFill, width: `${hpPct}%`, ...(currentBoss ? { background: `linear-gradient(90deg, ${currentBoss.regionAccent}cc, ${currentBoss.regionAccent})`, boxShadow: `0 0 8px ${currentBoss.regionAccent}88` } : {}) }} /></div>
              <div style={S.hpText}>{fmt(enemyHp)} / {fmt(currentEnemy.maxHp)}</div>
              {(isBerserk || isBattleCry || isGoldRush) && (
                <div style={S.activeBadges}>
                  {isBerserk   && <span style={{ ...S.badge, background: "#cc220033", color: "#ff6644" }}>💢 BERSERK</span>}
                  {isBattleCry && <span style={{ ...S.badge, background: "#f5c51833", color: "#f5c518" }}>📯 BATTLE CRY</span>}
                  {isGoldRush  && <span style={{ ...S.badge, background: "#44cc8833", color: "#44cc88" }}>✨ GOLD RUSH</span>}
                </div>
              )}

              {/* ── PARTY ROW ── player + active companions */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, marginTop: 6, marginBottom: 2 }}>

                {/* Player character */}
                {(() => {
                  const anyActive = isBerserk || isBattleCry || isGoldRush;
                  const glowColor = isBerserk ? "#cc2200" : isBattleCry ? "#f5c518" : "#44cc88";
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <div
                        className={anyActive ? "party-glow" : ""}
                        style={{
                          fontSize: 22, borderRadius: 8, padding: "3px 6px",
                          background: anyActive ? glowColor + "22" : "#1a1408",
                          border: `1px solid ${anyActive ? glowColor : "#f5c51844"}`,
                          boxShadow: anyActive ? `0 0 14px ${glowColor}99, 0 0 28px ${glowColor}44` : "0 0 8px #f5c51822",
                          transition: "border 0.2s, background 0.2s",
                          position: "relative",
                        }}
                      >
                        {(heroLevels["squire"] || 0) > 0 ? "🧑‍⚔️" : "⚔️"}
                        {/* Active ability mini label */}
                        {anyActive && (
                          <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: "bold", color: glowColor, whiteSpace: "nowrap", textShadow: `0 0 6px ${glowColor}` }}>
                            {isBerserk ? "💢" : isBattleCry ? "📯" : "✨"}
                          </div>
                        )}
                        {/* CD bars for all player abilities */}
                        <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, display: "flex", gap: 1 }}>
                          {ABILITIES.map(ab => {
                            const st = abilityState[ab.id];
                            const active = now < st.activeUntil;
                            const onCd = now < st.cdUntil && !active;
                            const pct = active
                              ? ((st.activeUntil - now) / ab.duration) * 100
                              : onCd
                              ? ((st.cdUntil - now) / ab.cooldown) * 100
                              : 0;
                            return (
                              <div key={ab.id} style={{ flex: 1, height: 3, background: "#1a1408", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${active ? 100 - pct : 100 - pct}%`, background: active ? ab.color : "#3a5a20", borderRadius: 2, transition: "width 0.3s linear" }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span style={{ fontSize: 7, color: anyActive ? glowColor : "#f5c51899", letterSpacing: 0.5, marginTop: 5 }}>YOU</span>
                    </div>
                  );
                })()}

                {/* Active companions */}
                {COMPANIONS.filter(c => (companionLevels[c.id] || 0) > 0).map(c => {
                  const ab = COMPANION_ABILITIES.find(a => a.compId === c.id);
                  const st = ab ? compAbilityState[ab.id] : null;
                  const tier = ab ? getCompAbilityTier(ab, companionLevels[c.id] || 0) : null;
                  const isActive = st ? now < st.activeUntil : false;
                  const isOnCd   = st ? (now < st.cdUntil && !isActive) : false;
                  const cdPct    = st && tier && isOnCd  ? Math.max(0, ((st.cdUntil   - now) / tier.cooldown) * 100) : 0;
                  const actPct   = st && ab   && isActive ? Math.max(0, ((st.activeUntil - now) / (tier?.cooldown ?? 1)) * 100) : 0;
                  const barFill  = isActive ? (100 - actPct) : (100 - cdPct);
                  const abColor  = ab?.color || "#44aa66";

                  return (
                    <div key={c.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <div
                        className={isActive ? "party-glow" : ""}
                        style={{
                          fontSize: 20, borderRadius: 8, padding: "3px 5px",
                          background: isActive ? abColor + "22" : "#0f1208",
                          border: `1px solid ${isActive ? abColor : isOnCd ? "#2a2a1a" : "#3a6a2a44"}`,
                          boxShadow: isActive ? `0 0 14px ${abColor}aa, 0 0 28px ${abColor}44` : "0 0 6px #44aa4422",
                          transition: "border 0.2s, background 0.2s",
                          position: "relative",
                        }}
                      >
                        {c.emoji}
                        {/* Active icon */}
                        {isActive && (
                          <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: abColor, textShadow: `0 0 6px ${abColor}` }}>
                            {ab?.emoji}
                          </div>
                        )}
                        {/* CD / active bar at bottom of icon */}
                        {st && tier && (
                          <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 3, background: "#1a1408", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${barFill}%`, background: isActive ? abColor : "#3a6a1a", borderRadius: 2, transition: "width 0.3s linear", boxShadow: isActive ? `0 0 4px ${abColor}` : "none" }} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 7, color: isActive ? abColor : "#6acc3099", letterSpacing: 0.3, maxWidth: 32, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginTop: 5 }}>
                        {c.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={S.tapHint}>
                Tap to attack · {fmt(comboDmg)} dmg{comboMult > 1 ? ` · ×${comboMult} combo` : ""}
              </div>


              {/* Weak point hotspots */}
              {weakPoints.map(wp => (
                <div
                  key={wp.id}
                  className="weak-point"
                  style={{ position: "absolute", left: `${wp.x}%`, top: `${wp.y}%`, transform: "translate(-50%,-50%)", width: 34, height: 34, borderRadius: "50%", background: "#ff220066", border: "2px solid #ff6600", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 12px #ff440088" }}
                  onClick={(e) => handleWeakPointClick(e, wp)}
                >
                  💥
                </div>
              ))}

              {/* Damage floats */}
              {floats.map(f => (
                <div key={f.id} className="float-dmg" style={{ left: f.x, top: f.y, color: f.color, fontSize: f.crit ? 22 : 18 }}>
                  {f.crit ? `⚡ CRIT -${fmt(f.value)}` : `-${fmt(f.value)}`}
                </div>
              ))}
            </div>
              ); })()}

            <div style={S.rewardRow}>
              <span style={S.dim}>🪙 {fmt(currentEnemy.goldReward)}{isGoldRush ? " ×2" : ""}</span>
              <span style={S.dim}>⚡ {fmt(idleDps + companionDps)} DPS</span>
              {ttkLabel && (
                <span style={{ fontSize: 11, color: ttkLabel.color, fontWeight: "bold" }}>
                  ⏱ {ttkLabel.text}
                </span>
              )}
            </div>

            {/* ── ACTIVE PET BADGE ── */}
            {activePet && petOwned[activePet] && (() => {
              const pet     = PETS.find(p => p.id === activePet);
              if (!pet) return null;
              const tier    = petOwned[activePet].tier || 0;
              const tierDat = pet.tiers[tier];
              return (
                <div style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  background: pet.color + "0f", border: `1px solid ${pet.color}44`,
                  borderRadius: 8, padding: "6px 10px",
                }}>
                  <span className="pet-idle" style={{ fontSize: 18, display: "inline-block" }}>{tierDat.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: "bold", color: pet.color }}>{pet.name}</span>
                    <span style={{ fontSize: 9, color: pet.color + "aa", marginLeft: 5 }}>· {tierDat.name}</span>
                  </div>
                  <span style={{ fontSize: 10, color: pet.color, fontWeight: "bold" }}>{tierDat.desc}</span>
                </div>
              );
            })()}

            {/* Active companion ability badges */}
            {COMPANION_ABILITIES.some(ab => now < compAbilityState[ab.id].activeUntil) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, width: "100%", justifyContent: "center" }}>
                {COMPANION_ABILITIES.filter(ab => now < compAbilityState[ab.id].activeUntil).map(ab => {
                  const level = companionLevels[ab.compId] || 0;
                  const tier  = getCompAbilityTier(ab, level);
                  const secLeft = Math.ceil((compAbilityState[ab.id].activeUntil - now) / 1000);
                  return (
                    <span key={ab.id} style={{ fontSize: 10, fontWeight: "bold", padding: "2px 7px", borderRadius: 5, background: ab.color + "22", border: `1px solid ${ab.color}66`, color: ab.color }}>
                      {ab.emoji} {ab.name} {secLeft}s
                    </span>
                  );
                })}
              </div>
            )}

            {/* ── COMBO METER ── */}
            <div style={S.comboWrap}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: comboCount > 0 ? comboColor : "#3a2a1a", fontWeight: "bold", letterSpacing: 1.5, textTransform: "uppercase", transition: "color 0.2s" }}>
                  ⚡ Click Combo
                </span>
                <span style={{ fontSize: 13, fontWeight: "bold", color: comboCount > 0 ? comboColor : "#3a2a1a", transition: "color 0.2s", fontVariantNumeric: "tabular-nums" }}>
                  {comboCount > 0
                    ? (comboMult > 1 ? `×${comboMult} · ${comboCount} hits` : `${comboCount} hits`)
                    : "tap rapidly to build"}
                </span>
              </div>
              <div style={S.comboBarTrack}>
                <div style={{
                  ...S.comboBarFill,
                  width: `${comboPct}%`,
                  background: comboCount === 0
                    ? "#1e1810"
                    : `linear-gradient(90deg, ${comboColor}88, ${comboColor})`,
                  boxShadow: comboCount >= 12 ? `0 0 8px ${comboColor}88` : "none",
                }} />
                {/* tier notches at 3 / 6 / 12 / 20 / 30 hits */}
                {[3, 6, 12, 20].map(n => (
                  <div key={n} style={{
                    position: "absolute",
                    left: `${(n / 30) * 100}%`,
                    top: 0, bottom: 0,
                    width: 1,
                    background: "#0d0b0a",
                    opacity: 0.6,
                  }} />
                ))}
              </div>
              {/* Tier labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                {[
                  { hits: 3,  label: "×1.5" },
                  { hits: 6,  label: "×2" },
                  { hits: 12, label: "×3" },
                  { hits: 20, label: "×4" },
                  { hits: 30, label: "×5" },
                ].map(tier => (
                  <span key={tier.hits} style={{
                    fontSize: 9,
                    color: comboCount >= tier.hits ? comboColor : "#3a2a1a",
                    fontWeight: "bold",
                    transition: "color 0.2s",
                    letterSpacing: 0.5,
                  }}>{tier.label}</span>
                ))}
              </div>
            </div>

            {/* Boss Stage Timer */}
            {bossTimerEnd !== null && (
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: "bold", color: bossTimerDanger ? "#ff4444" : "#f5c518", letterSpacing: 1 }}>
                    {bossTimerDanger ? "⚠️ BOSS CHALLENGE" : "⚔️ BOSS CHALLENGE"}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: "bold",
                    color: bossTimerDanger ? "#ff4444" : "#f5c518",
                    fontVariantNumeric: "tabular-nums",
                    ...(bossTimerDanger ? { animation: "timerPulse 0.6s ease-in-out infinite" } : {}),
                  }}>
                    {bossTimeLeft}s
                  </span>
                </div>
                <div style={S.bossTimerBar}>
                  <div style={{
                    ...S.bossTimerFill,
                    width: `${bossTimePct}%`,
                    background: bossTimerDanger
                      ? "linear-gradient(90deg,#8b0000,#ff2200)"
                      : "linear-gradient(90deg,#8a6010,#f5c518)",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "#4a3a2a", marginTop: 4, textAlign: "center" }}>
                  Defeat the boss or be pushed back to Zone {Math.max(1, zone - 1)}
                </div>
              </div>
            )}

            {/* Enemy Kill Timer — normal (non-boss) zones in auto-advance mode */}
            {enemyKillTimerEnd !== null && !BOSS_ZONES.has(zone) && !farmMode && (() => {
              const totalDur  = getEnemyKillWindow(zone);
              const remaining = Math.max(0, enemyKillTimerEnd - now);
              const pct       = Math.max(0, (remaining / totalDur) * 100);
              const secLeft   = Math.ceil(remaining / 1000);
              const danger    = secLeft <= 8;
              return (
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: "bold", color: danger ? "#ff5555" : "#8a7a5a", letterSpacing: 1, textTransform: "uppercase" }}>
                      {danger ? "⚠️ Retreat imminent" : "⏳ Kill window"}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: "bold", color: danger ? "#ff5555" : "#8a7a5a",
                      fontVariantNumeric: "tabular-nums",
                      ...(danger ? { animation: "exhaustionPulse 0.6s ease-in-out infinite" } : {}),
                    }}>
                      {secLeft}s
                    </span>
                  </div>
                  <div style={{ height: 5, background: "#1e1208", borderRadius: 3, border: "1px solid #2a1808", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, transition: "width 0.2s linear, background 0.5s",
                      width: `${pct}%`,
                      background: danger
                        ? "linear-gradient(90deg,#6a0808,#cc2200)"
                        : "linear-gradient(90deg,#4a3a10,#8a6a20)",
                    }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#4a3a2a", marginTop: 3, textAlign: "center" }}>
                    Defeat this enemy in time or retreat → Zone {Math.max(1, zone - 1)} · Exhaustion
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ── LORE ── */}
        {tab === "lore" && (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── WORLD MAP ── */}
            <div>
              <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                🗺 World Map
              </div>
              <div style={{ background: "#0a0808", border: "1px solid #2a2010", borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 6 }}>
                {REGIONS.map((r, idx) => {
                  const isCurrentRegion = zone >= r.minZone && zone <= r.maxZone;
                  const isUnlocked = maxZoneReached >= r.minZone;
                  const isLocked = !isUnlocked;
                  const prevRegion = REGIONS[idx - 1];
                  const canTravel = !isLocked && !isCurrentRegion;

                  // zone milestone nodes to show inside each region strip
                  const milestoneZones = [];
                  const start = r.minZone;
                  const end = Math.min(r.maxZone === 999 ? r.minZone + 29 : r.maxZone, r.minZone + 29);
                  for (let z = start; z <= end; z += Math.ceil((end - start + 1) / 5)) {
                    milestoneZones.push(z);
                  }

                  return (
                    <div key={r.name}>
                      {/* Connector line between regions */}
                      {idx > 0 && (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
                          <div style={{ width: 2, height: 12, background: isUnlocked ? "#3a2a10" : "#1a1810", borderRadius: 1 }} />
                        </div>
                      )}
                      <div style={{
                        border: `1px solid ${isCurrentRegion ? r.accent : isUnlocked ? r.accent + "44" : "#1e1810"}`,
                        borderRadius: 10,
                        background: isCurrentRegion ? r.accent + "18" : isUnlocked ? "#0d0b08" : "#090807",
                        padding: "8px 10px",
                        opacity: isLocked ? 0.45 : 1,
                        transition: "all 0.2s",
                      }}>
                        {/* Region header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{isLocked ? "🔒" : r.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: "bold", color: isCurrentRegion ? r.accent : isUnlocked ? "#c8b888" : "#4a3a2a" }}>
                              {r.name}
                              {isCurrentRegion && <span style={{ marginLeft: 6, fontSize: 9, background: r.accent + "33", color: r.accent, border: `1px solid ${r.accent}66`, borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>HERE</span>}
                            </div>
                            <div style={{ fontSize: 9, color: "#5a4a2a", marginTop: 1 }}>
                              {isLocked ? `Locked · Reach Zone ${r.minZone}` : `Zones ${r.minZone}–${r.maxZone === 999 ? "∞" : r.maxZone}`}
                            </div>
                          </div>
                          {canTravel && (
                            <button
                              style={{ fontSize: 9, padding: "4px 8px", borderRadius: 5, border: `1px solid ${r.accent}88`, background: r.accent + "22", color: r.accent, cursor: "pointer", fontFamily: "inherit", fontWeight: "bold", whiteSpace: "nowrap" }}
                              onClick={() => {
                                const targetZone = r.minZone;
                                setZone(targetZone);
                                gsRef.current.zone = targetZone;
                                spawnEnemy(targetZone);
                                setKillCount(0);
                                setTab("battle");
                              }}
                            >
                              → Travel
                            </button>
                          )}
                        </div>

                        {/* Zone node track */}
                        {isUnlocked && (
                          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 2 }}>
                            {Array.from({ length: Math.min(r.maxZone === 999 ? 20 : r.maxZone - r.minZone + 1, 20) }, (_, i) => {
                              const z = r.minZone + i;
                              const isHere = z === zone;
                              const visited = z <= maxZoneReached;
                              const isBoss = BOSS_ZONES.has(z);
                              return (
                                <div key={z} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                                  {/* connector */}
                                  {i > 0 && (
                                    <div style={{ width: 8, height: 2, background: visited ? r.accent + "66" : "#1e1810", flexShrink: 0 }} />
                                  )}
                                  {/* node */}
                                  <div
                                    title={`Zone ${z}`}
                                    onClick={() => {
                                      if (!visited) return;
                                      setZone(z);
                                      gsRef.current.zone = z;
                                      spawnEnemy(z);
                                      setKillCount(0);
                                      setTab("battle");
                                    }}
                                    style={{
                                      width: isHere ? 16 : isBoss ? 12 : 9,
                                      height: isHere ? 16 : isBoss ? 12 : 9,
                                      borderRadius: "50%",
                                      background: isHere ? r.accent : visited ? (isBoss ? "#f5c518" : r.accent + "88") : "#1e1810",
                                      border: isHere ? `2px solid #fff8` : isBoss && visited ? "1px solid #f5c51888" : "none",
                                      cursor: visited ? "pointer" : "default",
                                      flexShrink: 0,
                                      boxShadow: isHere ? `0 0 8px ${r.accent}` : "none",
                                      transition: "all 0.15s",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 6,
                                    }}
                                  >
                                    {isBoss && visited && !isHere ? "★" : ""}
                                  </div>
                                </div>
                              );
                            })}
                            {r.maxZone === 999 && <div style={{ fontSize: 9, color: "#4a3a2a", marginLeft: 6 }}>…</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {(() => { const r = getCurrentRegion(zone); return (
              <div>
                <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                  ⚔ Environment
                </div>
                <div style={{ background: `linear-gradient(135deg,#0d0b0a,#100e0a)`, border: `1px solid ${r.accent}66`, borderRadius: 14, overflow: "hidden" }}>
                  {/* Header band */}
                  <div style={{ background: `linear-gradient(90deg,${r.accent}22,transparent)`, borderBottom: `1px solid ${r.accent}33`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{r.emoji}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: "#e8dcc8", letterSpacing: 0.5 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: r.accent, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>Zones {r.minZone}–{r.maxZone === 999 ? "∞" : r.maxZone} · Currently Zone {zone}</div>
                    </div>
                  </div>
                  {/* Short tagline */}
                  <div style={{ padding: "10px 16px 0", fontSize: 12, color: "#a89870", fontStyle: "italic", lineHeight: 1.6 }}>
                    {r.desc}
                  </div>
                  {/* Long lore */}
                  <div style={{ padding: "10px 16px 16px", fontSize: 12, color: "#7a6a52", lineHeight: 1.75 }}>
                    {r.lore}
                  </div>
                </div>
              </div>
            ); })()}

            {/* ── CURRENT CHRONICLE ── */}
            <div>
              <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                📜 Chronicle
              </div>
              <div style={{ background: "#0a0808", border: "1px solid #2a1810", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#5a4a2a", letterSpacing: 1, marginBottom: 8 }}>Zone {currentLore.zone} — The Eternal Commander's Record</div>
                <div style={{ fontSize: 13, color: "#9a8a6a", fontStyle: "italic", lineHeight: 1.75 }}>"{currentLore.text}"</div>
              </div>
            </div>

            {/* ── CHRONICLE ARCHIVE ── */}
            {ZONE_LORE.filter(e => zone >= e.zone).length > 1 && (
              <div>
                <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                  🗂 Chronicle Archive
                </div>
                <div style={{ background: "#0a0808", border: "1px solid #1e1810", borderRadius: 12, padding: "14px 16px" }}>
                  {ZONE_LORE.filter(e => zone >= e.zone).slice().reverse().slice(1).map(entry => (
                    <div key={entry.zone} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #1a1410" }}>
                      <div style={{ fontSize: 10, color: "#4a3a22", letterSpacing: 1, marginBottom: 5 }}>Zone {entry.zone}</div>
                      <div style={{ fontSize: 11, color: "#5a4a32", fontStyle: "italic", lineHeight: 1.65 }}>"{entry.text}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── VOICES FROM THE ECLIPSE ── */}
            {seenStoryZones.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: "#8a4a9a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #2a1a3a" }}>
                  👁 Voices from the Eclipse
                </div>
                <div style={{ background: "#0a0808", border: "1px solid #2a1a3a", borderRadius: 12, padding: "14px 16px" }}>
                  {STORY_EVENTS.filter(e => seenStoryZones.includes(e.zone)).map(ev => (
                    <div key={ev.zone} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #1e1820" }}>
                      <div style={{ fontSize: 11, fontWeight: "bold", color: "#c0a0d0", marginBottom: 5 }}>{ev.speaker}</div>
                      <div style={{ fontSize: 12, color: "#8a7a9a", fontStyle: "italic", lineHeight: 1.65 }}>"{ev.text}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── COMPANION LORE ── */}
            <div>
              <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e1810" }}>
                🧭 Companion Lore
              </div>
              <div style={{ background: "#0a0808", border: "1px solid #1e1a10", borderRadius: 12, padding: "14px 16px" }}>
                {COMPANIONS.filter(c => (companionLevels[c.id] || 0) > 0).map(comp => {
                  const ab = COMPANION_ABILITIES.find(a => a.compId === comp.id);
                  return (
                    <div key={comp.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #1e1810" }}>
                      <div style={{ fontSize: 13, fontWeight: "bold", color: "#e8dcc8", marginBottom: 2 }}>{comp.emoji} {comp.name}</div>
                      <div style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1, marginBottom: 7 }}>— {comp.title}</div>
                      <div style={{ fontSize: 12, color: "#6a5a42", fontStyle: "italic", lineHeight: 1.7, marginBottom: ab ? 8 : 0 }}>"{comp.lore}"</div>
                      {ab && <div style={{ fontSize: 10, color: ab.color + "cc", fontStyle: "italic", lineHeight: 1.5 }}>✦ {ab.origin}</div>}
                    </div>
                  );
                })}
                {COMPANIONS.every(c => (companionLevels[c.id] || 0) === 0) && (
                  <div style={{ fontSize: 11, color: "#4a3a2a", fontStyle: "italic" }}>Recruit companions to unlock their stories.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ── COMPANIONS ── */}
        {tab === "companions" && (
          <div style={S.shopView}>
            {/* ── Buy-mode toggle ── */}
            <div style={S.buyToggleWrap}>
              <span style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1, flexShrink: 0 }}>BUY</span>
              {["x1", "x10", "x100", "max"].map(mode => (
                <button
                  key={mode}
                  style={{ ...S.buyToggleBtn, ...(buyMode === mode ? S.buyToggleBtnActive : {}) }}
                  onClick={() => setBuyMode(mode)}
                >
                  {mode === "max" ? "Max" : mode}
                </button>
              ))}
            </div>

            <div style={S.sectionLabel}>Your Companions</div>
            {COMPANIONS.map(comp => {
              const level = companionLevels[comp.id] || 0;
              const hired = level > 0;
              const dps   = hired
                ? (comp.baseDmg * level * (1000 / comp.interval) * rebirthMult * pathDpsMult).toFixed(1)
                : null;

              const bulk       = calcBulkCompanionBuy(comp, level, gold, buyMode);
              const canAfford  = bulk.count > 0;
              const baseAction = !hired ? "Recruit" : "Lvl Up";
              const countTag   = bulk.count > 1 ? ` ×${bulk.count}` : "";
              const btnLabel   = canAfford
                ? `${baseAction}${countTag} · 🪙${fmt(bulk.totalCost)}`
                : buyMode === "max"
                  ? "Not enough 🪙"
                  : `${baseAction} · 🪙${fmt(bulk.totalCost)}`;

              const ab = COMPANION_ABILITIES.find(a => a.compId === comp.id);
              const tier = ab ? getCompAbilityTier(ab, level) : null;
              const st = ab ? compAbilityState[ab.id] : null;
              const isActive = st && now < st.activeUntil;
              const isOnCd = st && now < st.cdUntil && !isActive;

              return (
                <div key={comp.id} style={{
                  background: "#13100a", border: `1px solid ${hired ? "#3a2d1a" : "#1e1810"}`,
                  borderRadius: 10, padding: "8px 10px", marginBottom: 6,
                }}>
                  {/* Top row: emoji + name/stats + button */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{comp.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: "bold", color: hired ? "#e8dcc8" : "#6a5a3a" }}>{comp.name}</span>
                        {hired && <span style={S.lvlBadge}>Lv {level}</span>}
                        {hired && <span style={{ fontSize: 10, color: "#44cc88" }}>⚡{fmt(dps)}</span>}
                      </div>
                      <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 0.5 }}>{comp.title}</div>
                      {/* Ability line */}
                      {ab && (
                        <div style={{ fontSize: 9, marginTop: 2 }}>
                          {tier ? (
                            <>
                              <span style={{ color: ab.color + "cc" }}>{ab.emoji} {ab.name}</span>
                              <span style={{ color: "#5a4a2a" }}> · {tier.desc}</span>
                              {isActive && <span style={{ color: ab.color, fontWeight: "bold" }}> ⚡</span>}
                              {isOnCd && <span style={{ color: "#5a4a2a" }}> {Math.ceil((st.cdUntil - now) / 1000)}s</span>}
                            </>
                          ) : (
                            <span style={{ color: "#3a2a4a" }}>{ab.emoji} {ab.name} · Recruit to unlock</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      style={{
                        padding: "6px 9px", borderRadius: 7, border: `1px solid ${canAfford ? "#5a4010" : "#1e1810"}`,
                        background: canAfford ? "#1e1608" : "#110d08",
                        color: canAfford ? "#f5c518" : "#4a3a2a",
                        fontSize: 10, fontWeight: "bold", cursor: canAfford ? "pointer" : "not-allowed",
                        fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
                      }}
                      onClick={() => buyCompanion(comp, bulk.count, bulk.totalCost)}
                      disabled={!canAfford}
                    >
                      {btnLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SHOP ── */}
        {tab === "shop" && (
          <div style={S.shopView}>

            {/* ── Buy-mode toggle ── */}
            <div style={S.buyToggleWrap}>
              <span style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1, flexShrink: 0 }}>BUY</span>
              {["x1", "x10", "x100", "max"].map(mode => (
                <button key={mode}
                  style={{ ...S.buyToggleBtn, ...(buyMode === mode ? S.buyToggleBtnActive : {}) }}
                  onClick={() => setBuyMode(mode)}>
                  {mode === "max" ? "Max" : mode}
                </button>
              ))}
            </div>

            <div style={S.sectionLabel}>Idle Heroes</div>
            {HEROES.map(hero => {
              const level        = heroLevels[hero.id] || 0;
              const achDiscount  = achBonuses.upgradeCostReduce;
              const acqKind      = hero.acquisition?.kind || "shop";
              const isGoldBuyable = acqKind === "start" || acqKind === "shop";
              const isLocked     = level === 0 && !isGoldBuyable;
              const bulk         = isLocked ? { count: 0, totalCost: 0 } : calcBulkHeroBuy(hero, level, gold, buyMode, achDiscount);
              const canAfford    = !isLocked && bulk.count > 0;
              const countTag     = bulk.count > 1 ? ` ×${bulk.count}` : "";
              const heroDps      = level > 0
                ? fmt(hero.baseDps * level * getHeroMilestoneMult(level) *
                    UPGRADES.filter(u => u.type === "hero" && u.heroId === hero.id && boughtUpgrades.includes(u.id)).reduce((m, u) => m * u.mult, 1))
                : fmt(hero.baseDps);

              const costLabel = isLocked
                ? `${ACQ_EMOJI[acqKind]} ${ACQ_LABEL[acqKind]}`
                : canAfford
                  ? `🪙${fmt(bulk.totalCost)}${countTag}`
                  : buyMode === "max" ? "Not enough 🪙" : `🪙${fmt(bulk.totalCost)}`;

              return (
                <div key={hero.id} style={{
                  background: "#13100a",
                  border: `1px solid ${canAfford ? "#8a6010" : isLocked ? "#1a1810" : "#2a2010"}`,
                  borderRadius: 10, padding: "8px 10px", marginBottom: 6,
                  opacity: isLocked ? 0.55 : 1,
                  boxShadow: canAfford ? "0 0 8px #f5c51822" : "none",
                  transition: "border 0.2s, box-shadow 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{hero.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: "bold", color: level > 0 ? "#e8dcc8" : isLocked ? "#4a3a2a" : "#c8b89a" }}>{hero.name}</span>
                        {level > 0 && <span style={S.lvlBadge}>Lv {level}</span>}
                        <RarityBadge rarity={hero.rarity} />
                      </div>
                      <div style={{ fontSize: 9, color: "#6a5a3a" }}>
                        {level > 0 ? `⚡${heroDps} DPS` : `${heroDps} base DPS`}
                        {hero.passive && <span style={{ color: "#44cc88aa", marginLeft: 6 }}>✦ {passiveDesc(hero.passive)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => !isLocked && buyHero(hero, bulk.count, bulk.totalCost)}
                      disabled={isLocked || !canAfford}
                      style={{
                        padding: "6px 9px", borderRadius: 7, fontSize: 10, fontWeight: "bold",
                        fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, cursor: (isLocked || !canAfford) ? "not-allowed" : "pointer",
                        border: `1px solid ${canAfford ? "#5a4010" : "#1e1810"}`,
                        background: canAfford ? "#1e1608" : "#110d08",
                        color: canAfford ? "#f5c518" : isLocked ? "#5a4a2a" : "#4a3a2a",
                      }}>
                      {costLabel}
                    </button>
                  </div>
                </div>
              );
            })}

            <div style={{ ...S.sectionLabel, marginTop: 10 }}>Upgrades</div>
            {UPGRADES.map(upg => {
              const bought      = boughtUpgrades.includes(upg.id);
              const heroLevel   = upg.heroId ? (heroLevels[upg.heroId] || 0) : 999;
              const levelLocked = upg.heroId && heroLevel < (upg.reqLevel || 0);
              const canAfford   = !bought && !levelLocked && gold >= upg.cost;
              return (
                <div key={upg.id} style={{
                  background: "#13100a",
                  border: `1px solid ${bought ? "#1e2a10" : canAfford ? "#8a6010" : "#1e1810"}`,
                  borderRadius: 10, padding: "8px 10px", marginBottom: 6,
                  opacity: levelLocked ? 0.45 : bought ? 0.7 : 1,
                  boxShadow: canAfford ? "0 0 8px #f5c51822" : "none",
                  transition: "border 0.2s, box-shadow 0.2s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{bought ? "✅" : levelLocked ? "🔒" : "🔮"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: "bold", color: bought ? "#5a7a5a" : canAfford ? "#e8dcc8" : "#6a5a3a" }}>{upg.name}</div>
                      <div style={{ fontSize: 9, color: "#5a4a2a" }}>
                        {upg.desc}{levelLocked ? ` · Need Lv${upg.reqLevel}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => !levelLocked && buyUpgrade(upg)}
                      disabled={bought || !canAfford || levelLocked}
                      style={{
                        padding: "6px 9px", borderRadius: 7, fontSize: 10, fontWeight: "bold",
                        fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, cursor: (bought || !canAfford || levelLocked) ? "not-allowed" : "pointer",
                        border: `1px solid ${bought ? "#1e2a10" : canAfford ? "#5a4010" : "#1e1810"}`,
                        background: bought ? "#0d1208" : canAfford ? "#1e1608" : "#110d08",
                        color: bought ? "#5a7a5a" : canAfford ? "#f5c518" : "#4a3a2a",
                      }}>
                      {bought ? "Owned" : levelLocked ? `Lv${upg.reqLevel}` : `🪙${fmt(upg.cost)}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── COLLECTION ── */}
        {tab === "collection" && (
          <div style={S.shopView}>
            <div style={S.sectionLabel}>Hero Collection</div>
            <div style={{ fontSize: 12, color: "#8a7a5a", marginBottom: 12, fontStyle: "italic" }}>
              Heroes are unique. Some are found via chests, some are bought with gold, and some are offered as real-money relics.

            </div>

            {HEROES.filter((hero) => {
              const level = heroLevels[hero.id] || 0;
              const acqKind = hero.acquisition?.kind || "shop";
              // Hide chest/realmoney heroes that haven't been unlocked yet
              if (level === 0 && (acqKind === "chest" || acqKind === "realmoney")) return false;
              return true;
            }).map((hero) => {
              const rarity = hero.rarity || "Common";
              const rarityColor = RARITIES[rarity]?.color || "#8a8a8a";

              const level = heroLevels[hero.id] || 0;
              const unlocked = level > 0;
              const acquisitionKind = hero.acquisition?.kind || "shop";
              const pDesc = passiveDesc(hero.passive);

              return (
                <div key={hero.id} style={{
                  ...S.heroCollectionCard,
                  borderColor: unlocked ? rarityColor + "88" : "#1e1810",
                  boxShadow: unlocked && rarity === "Legendary" ? `0 0 12px ${rarityColor}33` : "none",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{hero.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: "bold", color: unlocked ? "#e8dcc8" : "#6a5a3a" }}>
                          {hero.name}
                        </div>
                        <RarityBadge rarity={rarity} />
                        {unlocked && <span style={S.lvlBadge}>Lv {level}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: unlocked ? "#8a7a5a" : "#4a3a2a", fontStyle: "italic", lineHeight: 1.4, marginBottom: 6 }}>
                        "{hero.lore}"
                      </div>
                      {pDesc && (
                        <div style={{ fontSize: 11, color: unlocked ? "#44cc88" : "#2a4a2a", marginBottom: 4 }}>
                          ✦ {pDesc}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: "#5a4a2a" }}>
                        {ACQ_EMOJI[acquisitionKind]} {ACQ_LABEL[acquisitionKind]}
                        {hero.acquisition?.note ? ` — ${hero.acquisition.note}` : ""}
                      </div>
                    </div>
                  </div>

                  {!unlocked && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#4a3a2a", fontStyle: "italic" }}>
                      {acquisitionKind === "chest"     && "Find in chests dropped by zone bosses."}
                      {acquisitionKind === "realmoney" && "Available in the Relic Store."}
                      {(acquisitionKind === "shop" || acquisitionKind === "start") && "Recruit in the Shop with gold."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── GEAR / EQUIPMENT ── */}
        {tab === "gear" && (() => {
          const dustUpgradeCosts = [
            { label: "+1%", amount: 1, cost: 3 },
            { label: "+3%", amount: 3, cost: 8 },
            { label: "+5%", amount: 5, cost: 15 },
          ];
          const itemsForSlot = selectedGearSlot
            ? lootItems.filter(i => {
                const s = i.slot || (i.type === "Armor" ? "chest" : i.type?.toLowerCase());
                if (selectedGearSlot === "ring1" || selectedGearSlot === "ring2") return s === "ring1" || s === "ring2";
                return s === selectedGearSlot;
              }).sort((a,b) => b.bonus - a.bonus)
            : [];

          const SlotButton = ({ slotId, label, fallbackEmoji }) => {
            const item = equippedSlots[slotId];
            const isSelected = selectedGearSlot === slotId;
            const rc = item ? (RARITIES[item.rarity || getItemRarity(item.bonus)] || RARITIES.Common) : null;
            return (
              <button
                onClick={() => setSelectedGearSlot(p => p === slotId ? null : slotId)}
                style={{
                  width: 72, height: 72, borderRadius: 10, border: `2px solid ${isSelected ? "#f5c518" : item ? rc.color + "88" : "#2a2010"}`,
                  background: isSelected ? "#2a1e08" : item ? rc.color + "12" : "#0d0b08",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontFamily: "inherit", gap: 2,
                  boxShadow: item ? `0 0 10px ${rc.color}44` : "none",
                  position: "relative",
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: item ? 22 : 20, filter: item ? "none" : "grayscale(1) opacity(0.3)" }}>
                  {item ? item.emoji : fallbackEmoji}
                </span>
                {item ? (
                  <>
                    <span style={{ fontSize: 8, fontWeight: "bold", color: rc.color, letterSpacing: 0.5, textAlign: "center", lineWidth: 1, maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      +{item.bonus + (item.upgradeLevel || 0)}%
                    </span>
                    <span style={{ fontSize: 7, color: "#f5c518bb", letterSpacing: 0 }}>{starsStr(item.stars || 1)}</span>
                    {(item.upgradeLevel || 0) > 0 && (
                      <span style={{ position: "absolute", top: 3, right: 4, fontSize: 8, fontWeight: "bold", color: "#c0a0ff", background: "#1a0a2a", borderRadius: 3, padding: "0 3px" }}>
                        +{item.upgradeLevel}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 8, color: "#3a2a1a", letterSpacing: 0.5 }}>{label}</span>
                )}
              </button>
            );
          };

          return (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Void Dust balance */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0818", border: "1px solid #3a1a6a", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 12, color: "#a080cc", fontWeight: "bold" }}>🌌 Void Dust</span>
                <span style={{ fontSize: 16, fontWeight: "bold", color: "#c0a0ff" }}>{voidDust}</span>
              </div>

              {/* ── PAPERDOLL ── */}
              <div style={{ background: "#0a0908", border: "1px solid #2a2010", borderRadius: 14, padding: "14px 10px" }}>
                <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid #1e1810" }}>
                  ⚔ Character Equipment
                </div>

                {/* Layout: left slots | character | right slots */}
                <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 72px", gap: 6, alignItems: "start" }}>
                  {/* Left column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <SlotButton slotId="helmet" label="Helmet"  fallbackEmoji="⛑️" />
                    <SlotButton slotId="chest"  label="Chest"   fallbackEmoji="🛡️" />
                    <SlotButton slotId="gloves" label="Gloves"  fallbackEmoji="🧤" />
                    <SlotButton slotId="boots"  label="Boots"   fallbackEmoji="👢" />
                  </div>

                  {/* Center character */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 310, gap: 6 }}>
                    <div style={{ fontSize: 64, filter: "drop-shadow(0 0 12px #f5c51866)" }}>🧙‍♂️</div>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: "#e8dcc8", letterSpacing: 1, textAlign: "center" }}>Eternal Commander</div>
                    <div style={{ fontSize: 10, color: "#6a5a3a", textAlign: "center", lineHeight: 1.5 }}>
                      {Object.values(equippedSlots).filter(Boolean).length} / {EQUIP_SLOTS.length} slots filled
                    </div>
                    {/* Active stat bonuses from gear */}
                    <div style={{ background: "#13100a", border: "1px solid #2a2010", borderRadius: 8, padding: "8px 10px", width: "100%", marginTop: 4 }}>
                      <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Gear Bonuses</div>
                      {lootBonuses.clickMult > 0 && <div style={{ fontSize: 10, color: "#ff8844", marginBottom: 2 }}>⚔ +{Math.round(lootBonuses.clickMult * 100)}% Click Dmg</div>}
                      {lootBonuses.dpsMult > 0   && <div style={{ fontSize: 10, color: "#44aaff", marginBottom: 2 }}>📯 +{Math.round(lootBonuses.dpsMult * 100)}% Hero DPS</div>}
                      {lootBonuses.gold > 0       && <div style={{ fontSize: 10, color: "#f5c518", marginBottom: 2 }}>🪙 +{Math.round(lootBonuses.gold * 100)}% Gold</div>}
                      {lootBonuses.cdReduce > 0   && <div style={{ fontSize: 10, color: "#44cc88", marginBottom: 2 }}>⚡ -{Math.round(lootBonuses.cdReduce * 100)}% Cooldown</div>}
                      {Object.values(lootBonuses).every(v => v === 0) && <div style={{ fontSize: 10, color: "#3a2a1a", fontStyle: "italic" }}>No bonuses yet</div>}
                    </div>

                    {/* ── SET BONUSES active ── */}
                    {(() => {
                      const { activeSets } = computeSetBonuses(lootItems.filter(i => i.equipped));
                      if (activeSets.length === 0) return null;
                      return (
                        <div style={{ background: "#0d0818", border: "1px solid #5a2a9a44", borderRadius: 8, padding: "8px 10px", width: "100%", marginTop: 4 }}>
                          <div style={{ fontSize: 9, color: "#9a60cc", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>✦ Active Set Bonuses</div>
                          {activeSets.map(({ prefix, count, tier, setDef, bonus: b }) => (
                            <div key={prefix} style={{ fontSize: 10, color: setDef.color, marginBottom: 3, display: "flex", justifyContent: "space-between" }}>
                              <span>{setDef.name} ({count}/{tier})</span>
                              <span style={{ color: "#c0a0ff" }}>{b.desc}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <SlotButton slotId="weapon" label="Weapon"  fallbackEmoji="🗡️" />
                    <SlotButton slotId="ring1"  label="Ring I"  fallbackEmoji="💍" />
                    <SlotButton slotId="ring2"  label="Ring II" fallbackEmoji="💍" />
                    <SlotButton slotId="amulet" label="Amulet"  fallbackEmoji="📿" />
                  </div>
                </div>
              </div>

              {/* ── SELECTED SLOT DETAIL ── */}
              {selectedGearSlot && (() => {
                const slotDef = EQUIP_SLOTS.find(s => s.id === selectedGearSlot);
                const equippedItem = equippedSlots[selectedGearSlot];
                return (
                  <div style={{ background: "#0f0c08", border: "1px solid #3a2810", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 10, color: "#8a6a3a", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
                      {slotDef?.emoji} {slotDef?.label} Slot
                    </div>

                    {/* Currently equipped item */}
                    {equippedItem && (() => {
                      const rc = RARITIES[equippedItem.rarity || getItemRarity(equippedItem.bonus)] || RARITIES.Common;
                      const totalBonus = equippedItem.bonus + (equippedItem.upgradeLevel || 0);
                      const stars = equippedItem.stars || 1;
                      const chain = WEAPON_CHAINS[equippedItem.type];
                      const evoTier = equippedItem.evolutionTier || 0;
                      const canEvolve = stars >= 5 && chain && evoTier < chain.length - 1;
                      const evCost = evolveCost(evoTier);
                      // Fusion: same slot, same type, not equipped, not this item
                      const fusionCandidates = lootItems.filter(i => !i.equipped && i.id !== equippedItem.id && i.type === equippedItem.type);
                      const canFuse = fusionCandidates.length >= 2 && stars < 5;

                      return (
                        <div style={{ background: rc.color + "10", border: `2px solid ${rc.color}66`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                          {/* Name + rarity + stars */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 28, filter: `drop-shadow(0 0 8px ${rc.color}88)` }}>{equippedItem.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: "bold", color: rc.color }}>{equippedItem.name}</span>
                                <RarityBadge rarity={equippedItem.rarity || getItemRarity(equippedItem.bonus)} />
                              </div>
                              {/* Stars row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, color: "#f5c518", letterSpacing: 1, textShadow: stars >= 5 ? "0 0 8px #f5c51888" : "none" }}>
                                  {starsStr(stars)}
                                </span>
                                {(equippedItem.upgradeLevel || 0) > 0 && (
                                  <span style={{ fontSize: 10, background: "#1a0a2a", color: "#c0a0ff", border: "1px solid #5a20aa", borderRadius: 4, padding: "1px 5px" }}>
                                    +{equippedItem.upgradeLevel} reforged
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#8a7a5a", marginTop: 2 }}>+{totalBonus}% {equippedItem.label} · Zone {equippedItem.zone}</div>
                            </div>
                            <button
                              onClick={() => toggleEquip(equippedItem.id)}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #3a1a1a", background: "#180808", color: "#cc4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              Unequip
                            </button>
                          </div>

                          {/* Evolution chain preview */}
                          {chain && (
                            <div style={{ borderTop: `1px solid ${rc.color}22`, paddingTop: 8, marginBottom: 8 }}>
                              <div style={{ fontSize: 9, color: "#7a5a3a", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>🔗 Evolution Chain</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, overflowX: "auto" }}>
                                {chain.map((step, i) => {
                                  const isCurrent = i === evoTier;
                                  const isPast = i < evoTier;
                                  const sc = RARITIES[step.rarity] || RARITIES.Common;
                                  return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                                      <div style={{ textAlign: "center", padding: "4px 6px", borderRadius: 6, border: `1px solid ${isCurrent ? sc.color : isPast ? "#3a6a3a" : "#2a1a10"}`, background: isCurrent ? sc.color + "20" : isPast ? "#0a1808" : "#080604", minWidth: 44 }}>
                                        <div style={{ fontSize: 16, filter: isPast ? "grayscale(0.5)" : isCurrent ? `drop-shadow(0 0 6px ${sc.color})` : "grayscale(0.8) opacity(0.4)" }}>{step.emoji}</div>
                                        <div style={{ fontSize: 7, color: isCurrent ? sc.color : isPast ? "#4a8a4a" : "#3a2a1a", fontWeight: isCurrent ? "bold" : "normal", whiteSpace: "nowrap", overflow: "hidden", maxWidth: 44, textOverflow: "ellipsis" }}>{step.name.split(" ").pop()}</div>
                                        {isPast && <div style={{ fontSize: 6, color: "#4a9a4a" }}>✓</div>}
                                        {isCurrent && <div style={{ fontSize: 7, color: "#f5c518", letterSpacing: 0.5 }}>{starsStr(stars, 5)}</div>}
                                      </div>
                                      {i < chain.length - 1 && <span style={{ fontSize: 10, color: "#3a2a1a" }}>→</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Evolve button */}
                          {canEvolve && (
                            <button
                              onClick={() => evolveItem(equippedItem.id)}
                              disabled={voidDust < evCost}
                              style={{ width: "100%", padding: "9px", borderRadius: 8, marginBottom: 8, fontSize: 12, fontWeight: "bold", fontFamily: "inherit", cursor: voidDust >= evCost ? "pointer" : "not-allowed",
                                border: `2px solid ${voidDust >= evCost ? "#cc88ff" : "#3a1a5a"}`,
                                background: voidDust >= evCost ? "linear-gradient(90deg,#1a0a2a,#2a0a3a)" : "#0a0608",
                                color: voidDust >= evCost ? "#ee88ff" : "#4a2a6a",
                                boxShadow: voidDust >= evCost ? "0 0 16px #cc44ff44" : "none",
                              }}>
                              ✦ EVOLVE → {chain[evoTier + 1]?.name} &nbsp;
                              <span style={{ fontSize: 10, color: voidDust >= evCost ? "#aa66dd" : "#3a1a5a" }}>🌌{evCost}</span>
                            </button>
                          )}

                          {/* Fusion button */}
                          {canFuse && (
                            <button
                              onClick={() => {
                                const ids = fusionCandidates.slice(0, 2).map(i => i.id);
                                fuseItems(equippedItem.id, ids);
                              }}
                              style={{ width: "100%", padding: "8px", borderRadius: 8, marginBottom: 8, fontSize: 11, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer",
                                border: "1px solid #f5c51888",
                                background: "linear-gradient(90deg,#1a1408,#221c08)",
                                color: "#f5c518",
                              }}>
                              ★ FUSE (use 2 {equippedItem.type}s from inventory → ★{Math.min(5, (equippedItem.stars||1)+1)})
                            </button>
                          )}

                          {/* Reforge with Void Dust */}
                          <div style={{ borderTop: `1px solid ${rc.color}22`, paddingTop: 8 }}>
                            <div style={{ fontSize: 9, color: "#8a6a9a", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>🌌 Reforge with Void Dust</div>
                            <div style={{ display: "flex", gap: 5 }}>
                              {dustUpgradeCosts.map(u => (
                                <button key={u.label}
                                  onClick={() => reforgeItem(equippedItem.id, u.amount, u.cost)}
                                  disabled={voidDust < u.cost}
                                  style={{
                                    flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: "bold",
                                    fontFamily: "inherit", cursor: voidDust >= u.cost ? "pointer" : "not-allowed",
                                    border: `1px solid ${voidDust >= u.cost ? "#7a40cc88" : "#1e1810"}`,
                                    background: voidDust >= u.cost ? "#0f0a18" : "#0a0808",
                                    color: voidDust >= u.cost ? "#c0a0ff" : "#3a2a4a",
                                  }}>
                                  <div>{u.label}</div>
                                  <div style={{ fontSize: 9, color: voidDust >= u.cost ? "#8a60cc" : "#2a1a3a" }}>🌌{u.cost}</div>
                                </button>
                              ))}
                              <button
                                onClick={() => scrapItem(equippedItem.id)}
                                style={{ padding: "7px 10px", borderRadius: 7, fontSize: 10, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", border: "1px solid #3a1a1a", background: "#120808", color: "#aa4444" }}>
                                🗑<div style={{ fontSize: 9 }}>Scrap</div>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Items in inventory for this slot */}
                    <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                      Inventory ({itemsForSlot.length} items)
                    </div>
                    {itemsForSlot.length === 0
                      ? <div style={{ fontSize: 11, color: "#3a2a1a", fontStyle: "italic" }}>No {slotDef?.label?.toLowerCase()} items. Defeat bosses to find gear.</div>
                      : itemsForSlot.map(item => {
                          const itemRarity = item.rarity || getItemRarity(item.bonus);
                          const rc = RARITIES[itemRarity] || RARITIES.Common;
                          const isEquipped = item.equipped;
                          const totalBonus = item.bonus + (item.upgradeLevel || 0);
                          const stars = item.stars || 1;
                          return (
                            <div key={item.id} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4,
                              borderRadius: 8, border: `1px solid ${isEquipped ? rc.color + "66" : "#1e1810"}`,
                              background: isEquipped ? rc.color + "0d" : "#0a0908",
                              borderLeft: `3px solid ${rc.color}`,
                            }}>
                              <span style={{ fontSize: 20, filter: `drop-shadow(0 0 4px ${rc.color}66)` }}>{item.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: "bold", color: isEquipped ? rc.color : "#8a7a5a" }}>{item.name}</div>
                                <div style={{ fontSize: 10, color: "#f5c518aa", letterSpacing: 0.5 }}>{starsStr(stars)}</div>
                                <div style={{ fontSize: 9, color: "#6a5a3a" }}>+{totalBonus}% {item.label} · Z{item.zone}</div>
                              </div>
                              <RarityBadge rarity={itemRarity} />
                              <button
                                onClick={() => toggleEquip(item.id)}
                                style={{ padding: "5px 9px", borderRadius: 6, border: `1px solid ${isEquipped ? rc.color : "#3a2a10"}`, background: isEquipped ? "#2a1e08" : "#110d08", color: isEquipped ? rc.color : "#8a7a5a", fontSize: 10, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                                {isEquipped ? "✓ On" : "Equip"}
                              </button>
                            </div>
                          );
                        })
                    }
                  </div>
                );
              })()}

              {/* ── ALL LOOT (no slot selected) ── */}
              {!selectedGearSlot && (
                <div style={{ background: "#0a0908", border: "1px solid #1e1810", borderRadius: 12, padding: "12px 10px" }}>
                  <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                    📦 All Loot ({lootItems.length} items)
                  </div>
                  {lootItems.length === 0
                    ? <div style={{ fontSize: 11, color: "#3a2a1a", fontStyle: "italic" }}>Defeat zone bosses for a 10% chest drop chance.</div>
                    : [...lootItems].sort((a,b) => (b.stars||1) - (a.stars||1) || b.bonus - a.bonus).map(item => {
                        const itemRarity = item.rarity || getItemRarity(item.bonus);
                        const rc = RARITIES[itemRarity] || RARITIES.Common;
                        const isEquipped = item.equipped;
                        const totalBonus = item.bonus + (item.upgradeLevel || 0);
                        const stars = item.stars || 1;
                        const slot = item.slot || (item.type === "Armor" ? "chest" : item.type?.toLowerCase());
                        const slotDef = EQUIP_SLOTS.find(s => s.id === slot || (s.id === "ring1" && slot === "ring1") || (s.id === "ring2" && slot === "ring2"));
                        const chain = WEAPON_CHAINS[item.type];
                        const evoTier = item.evolutionTier || 0;
                        const maxTier = chain ? chain.length - 1 : 0;
                        return (
                          <div key={item.id} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", marginBottom: 4,
                            borderRadius: 8, border: `1px solid ${isEquipped ? rc.color + "55" : "#1e1810"}`,
                            background: isEquipped ? rc.color + "0a" : "transparent",
                            borderLeft: `3px solid ${rc.color}`,
                          }}>
                            <span style={{ fontSize: 18, filter: `drop-shadow(0 0 4px ${rc.color}55)` }}>{item.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: "bold", color: isEquipped ? rc.color : "#8a7a5a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.name}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 10, color: stars >= 5 ? "#f5c518" : "#c0900088", letterSpacing: 0.5 }}>{starsStr(stars)}</span>
                                {chain && <span style={{ fontSize: 8, color: "#5a3a7a", letterSpacing: 0.5 }}>Tier {evoTier+1}/{maxTier+1}</span>}
                                <span style={{ fontSize: 9, color: "#5a4a2a" }}>+{totalBonus}% · {slotDef ? slotDef.label : slot}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleEquip(item.id)}
                              style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${isEquipped ? rc.color : "#2a2010"}`, background: isEquipped ? "#2a1e08" : "#110d08", color: isEquipped ? rc.color : "#6a5a3a", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
                              {isEquipped ? "✓" : "Equip"}
                            </button>
                          </div>
                        );
                      })
                  }
                </div>
              )}
            </div>
          );
        })()}

        {/* ── STATS ── */}
        {tab === "stats" && (
          <div style={S.statsView}>
            {/* Soul Crystal balance + panel toggles */}
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              <button style={{ ...S.shopBtn, flex: 1, ...(activePanel === "artifacts" ? S.shopBtnActive : S.shopBtnDisabled), justifyContent: "center" }}
                onClick={() => setActivePanel(p => p === "artifacts" ? null : "artifacts")}>
                <span>💎 Artifacts</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: "#c0a0ff" }}>{soulCrystals} crystals</span>
              </button>
              <button style={{ ...S.shopBtn, flex: 1, ...(activePanel === "loot" ? S.shopBtnActive : S.shopBtnDisabled), justifyContent: "center" }}
                onClick={() => setActivePanel(p => p === "loot" ? null : "loot")}>
                <span>🎒 Loot</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: "#f5c518" }}>{lootItems.length} items</span>
              </button>
            </div>

            {/* Artifact Tree Panel */}
            {activePanel === "artifacts" && (
              <div style={{ ...S.statCard, borderColor: "#4a2a8a" }}>
                <div style={{ ...S.statCardTitle, color: "#c0a0ff" }}>Artifact Tree · 💎 {soulCrystals} Soul Crystals</div>
                <div style={{ fontSize: 11, color: "#6a5a8a", marginBottom: 10, fontStyle: "italic" }}>Permanent upgrades. Survive Rebirth.</div>
                {ARTIFACT_UPGRADES.map(art => {
                  const owned     = artifactOwned.includes(art.id);
                  const canAfford = !owned && soulCrystals >= art.cost;
                  return (
                    <button key={art.id} style={{ ...S.shopBtn, ...(owned ? S.shopBtnBought : canAfford ? S.shopBtnActive : S.shopBtnDisabled), marginBottom: 5 }}
                      onClick={() => buyArtifact(art)} disabled={owned || !canAfford}>
                      <span style={S.shopEmoji}>{art.emoji}</span>
                      <div style={S.shopInfo}>
                        <span style={S.shopName}>{art.name}</span>
                        <span style={S.shopSub}>{art.desc}</span>
                      </div>
                      {owned
                        ? <span style={{ ...S.shopCost, color: "#5a7a5a" }}>✓</span>
                        : <span style={{ ...S.shopCost, color: canAfford ? "#c0a0ff" : "#4a3a6a" }}>💎{art.cost}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Loot Panel */}
            {activePanel === "loot" && (
              <div style={{ ...S.statCard, borderColor: "#5a3a10" }}>
                <div style={{ ...S.statCardTitle, color: "#f5c518", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Loot · {lootItems.filter(i=>i.equipped).length} equipped</span>
                  <span style={{ color: "#8a6aaa", fontSize: 12 }}>🌌 {voidDust} Void Dust</span>
                </div>
                {/* Sort controls + bulk scrap */}
                {lootItems.length > 0 && (
                  <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                    {[["zone","Zone"],["bonus","Bonus ↓"],["equipped","Equipped"]].map(([val, label]) => (
                      <button key={val}
                        style={{ padding: "4px 8px", borderRadius: 5, fontSize: 10, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer",
                          border: `1px solid ${lootSort === val ? "#f5c51888" : "#2a2010"}`,
                          background: lootSort === val ? "#2a1e08" : "#110d08",
                          color: lootSort === val ? "#f5c518" : "#6a5a3a" }}
                        onClick={() => setLootSort(val)}>{label}</button>
                    ))}
                    {lootItems.some(i => !i.equipped) && (
                      <button
                        style={{ marginLeft: "auto", padding: "4px 8px", borderRadius: 5, fontSize: 10, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer",
                          border: "1px solid #3a1a1a", background: "#180808", color: "#cc4444" }}
                        onClick={() => {
                          const unequipped = lootItems.filter(i => !i.equipped);
                          const totalDust = unequipped.reduce((s, i) => {
                            const rm = { Common: 1, Rare: 2, Epic: 4, Legendary: 8 }[i.rarity || getItemRarity(i.bonus)] || 1;
                            return s + Math.max(1, Math.floor(i.bonus / 5)) * rm;
                          }, 0);
                          setVoidDust(d => d + totalDust);
                          setLootItems(prev => prev.filter(i => i.equipped));
                        }}
                      >🗑 Scrap All Unequipped</button>
                    )}
                  </div>
                )}
                {lootItems.length === 0
                  ? <div style={{ fontSize: 12, color: "#4a3a2a", fontStyle: "italic" }}>No loot yet. Defeat zone bosses for a 10% drop chance.</div>
                  : [...lootItems]
                    .sort((a, b) =>
                      lootSort === "bonus"    ? b.bonus - a.bonus :
                      lootSort === "equipped" ? (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0) :
                      b.zone - a.zone
                    )
                    .map(item => {
                    const itemRarity = item.rarity || getItemRarity(item.bonus);
                    const scrapYield = Math.max(1, Math.floor(item.bonus / 5)) * ({ Common: 1, Rare: 2, Epic: 4, Legendary: 8 }[itemRarity] || 1);
                    const rc = RARITIES[itemRarity] || RARITIES.Common;
                    return (
                      <div key={item.id} style={{
                        padding: "10px 0 10px 10px",
                        borderBottom: "1px solid #1e1810",
                        borderLeft: `3px solid ${rc.color}`,
                        marginBottom: 2,
                      }}>
                        {/* Top row: icon + name + rarity + equip */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                          <span style={{ fontSize: 22 }}>{item.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <div style={{ fontSize: 13, fontWeight: "bold", color: item.equipped ? rc.color : "#8a7a5a" }}>{item.name}</div>
                              <RarityBadge rarity={itemRarity} />
                            </div>
                            <div style={{ fontSize: 11, color: "#6a5a3a" }}>+{item.bonus}% {item.label} · Zone {item.zone}</div>
                          </div>
                          <button style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                            background: item.equipped ? "#2a1e08" : "#110d08",
                            borderColor: item.equipped ? "#f5c518" : "#3a2a10",
                            color: item.equipped ? "#f5c518" : "#8a7a5a" }}
                            onClick={() => toggleEquip(item.id)}>
                            {item.equipped ? "Unequip" : "Equip"}
                          </button>
                        </div>
                        {/* Bottom row: Reforge + Scrap */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid", fontSize: 10, fontWeight: "bold", cursor: voidDust >= 3 ? "pointer" : "not-allowed", fontFamily: "inherit",
                              background: voidDust >= 3 ? "#0f0a18" : "#0a0808",
                              borderColor: voidDust >= 3 ? "#7a40cc88" : "#1e1810",
                              color: voidDust >= 3 ? "#c0a0ff" : "#4a3a5a" }}
                            onClick={() => reforgeItem(item.id, 1, 3)}
                            disabled={voidDust < 3}
                          >
                            🔨 +1% · 🌌3
                          </button>
                          <button
                            style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid", fontSize: 10, fontWeight: "bold", cursor: voidDust >= 5 ? "pointer" : "not-allowed", fontFamily: "inherit",
                              background: voidDust >= 5 ? "#0f0a18" : "#0a0808",
                              borderColor: voidDust >= 5 ? "#7a40cc" : "#1e1810",
                              color: voidDust >= 5 ? "#e0c0ff" : "#4a3a5a" }}
                            onClick={() => reforgeItem(item.id, 2, 5)}
                            disabled={voidDust < 5}
                          >
                            ⚡ +2% · 🌌5
                          </button>
                          <button
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #3a1a1a", fontSize: 10, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit",
                              background: "#120808", color: "#aa4444" }}
                            onClick={() => scrapItem(item.id)}
                          >
                            🗑 +🌌{scrapYield}
                          </button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            <div style={S.statCard}>
              <div style={S.statCardTitle}>Combat</div>
              <StatRow label="Click Damage"   value={fmt(effectiveDmg)} highlight={isBerserk || isBattleCry} />
              <StatRow label="Hero DPS"        value={fmt(idleDps)} highlight={isBattleCry} />
              <StatRow label="Companion DPS"   value={fmt(companionDps)} />
              <StatRow label="Total DPS"       value={fmt(idleDps + companionDps)} highlight />
              {rebirthCount > 0 && <StatRow label="Soul Bonus" value={`×${rebirthMult.toFixed(1)}`} highlight />}
              {(artBonuses.clickMult + lootBonuses.clickMult) > 0 &&
                <StatRow label="Click Art+Loot" value={`+${Math.round((artBonuses.clickMult + lootBonuses.clickMult)*100)}%`} />}
              {artBonuses.synergyPct > 0 &&
                <StatRow label="Companion Synergy" value={`${artBonuses.synergyPct*100}% of click`} highlight />}
              {cdReduction > 0 &&
                <StatRow label="CD Reduction" value={`-${Math.round(cdReduction*100)}%`} />}
              {heroPassives.clickAdd > 0 &&
                <StatRow label="Hero Passive Click" value={`+${heroPassives.clickAdd}`} />}
              {heroPassives.dmgMult > 0 &&
                <StatRow label="Hero Passive Dmg" value={`+${Math.round(heroPassives.dmgMult*100)}%`} />}
              {heroPassives.goldMult > 0 &&
                <StatRow label="Hero Passive Gold" value={`+${Math.round(heroPassives.goldMult*100)}%`} />}
            </div>
            <div style={S.statCard}>
              <div style={S.statCardTitle}>Progress</div>
              <StatRow label="Zone" value={zone} />
              <div style={{ marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={S.dim}>Area progress</span>
                  <span style={S.dim}>{killCount % 10}/10</span>
                </div>
                <div style={S.zonePrgBar}>
                  <div style={{ ...S.zonePrgFill, width: `${(killCount % 10) * 10}%` }} />
                </div>
              </div>
            </div>

            {/* Hero Milestones reference */}
            <div style={S.statCard}>
              <div style={S.statCardTitle}>Hero Milestones</div>
              <div style={{ fontSize: 11, color: "#6a5a3a", marginBottom: 8, fontStyle: "italic" }}>Landmark levels multiply a hero's damage permanently.</div>
              {HERO_MILESTONES.map(ms => (
                <div key={ms.level} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={S.dim}>Level {ms.level}</span>
                  <strong style={{ color: "#f5c518" }}>{ms.label} damage</strong>
                </div>
              ))}
              <div style={{ marginTop: 8, borderTop: "1px solid #1e1810", paddingTop: 8 }}>
                {HEROES.filter(h => (heroLevels[h.id] || 0) > 0).map(hero => {
                  const lv = heroLevels[hero.id];
                  const mm = getHeroMilestoneMult(lv);
                  const next = HERO_MILESTONES.find(m => m.level > lv);
                  return (
                    <div key={hero.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={S.dim}>{hero.emoji} {hero.name} <span style={S.lvlBadge}>Lv {lv}</span></span>
                      <span style={{ color: mm > 1 ? "#f5c518" : "#6a5a3a" }}>
                        {mm > 1 ? `${mm}× active` : next ? `→ Lv ${next.level}` : "max"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={S.statCard}>
              <div style={S.statCardTitle}>Rebirth</div>
              {rebirthCount > 0 && <div style={S.rebirthCrystals}>{"💎".repeat(Math.min(rebirthCount, 10))}{rebirthCount > 10 ? ` ×${rebirthCount}` : ""}</div>}
              <div style={S.rebirthDesc}>
                {rebirthCount === 0
                  ? "Rebirth resets progress but grants a permanent Soul Bonus multiplying all DPS and gold, plus 1 Soul Crystal for the Artifact Tree."
                  : `Reborn ${rebirthCount}× — current bonus: ×${rebirthMult.toFixed(1)} to all DPS & gold. ${soulCrystals} Soul Crystals available.`}
              </div>
              {/* Offline earnings cap */}
              {(() => {
                const unlockedMs = REBIRTH_MILESTONES.filter(m => rebirthCount >= m.count);
                const offlineHours = unlockedMs.filter(m => m.type === "offlineCap").reduce((best, m) => Math.max(best, m.value), 4);
                return (
                  <div style={{ fontSize: 11, color: "#44aacc", marginBottom: 10, background: "#080e12", border: "1px solid #1a3a4a", borderRadius: 6, padding: "5px 10px" }}>
                    ⏳ Offline earnings cap: <strong style={{ color: "#66ccee" }}>{offlineHours} hours</strong>
                    {offlineHours < 8 && <span style={{ color: "#4a6a6a", marginLeft: 6 }}>(raise via Rebirth milestones)</span>}
                  </div>
                );
              })()}
              <div style={S.rebirthNextBonus}>Next rebirth: ×{(1 + (rebirthCount + 1) * 0.5).toFixed(1)} bonus + 💎1 Soul Crystal</div>

              {/* Milestone unlock list */}
              <div style={{ borderTop: "1px solid #1e1810", paddingTop: 10, marginTop: 4, marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Rebirth Milestones</div>
                {REBIRTH_MILESTONES.map(ms => {
                  const unlocked = rebirthCount >= ms.count;
                  return (
                    <div key={ms.count} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, opacity: unlocked ? 1 : 0.45 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{ms.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: "bold", color: unlocked ? "#e8dcc8" : "#4a3a2a" }}>
                          {ms.title}
                          <span style={{ fontSize: 9, marginLeft: 6, color: "#6a5a3a" }}>@ Rebirth {ms.count}</span>
                        </div>
                        <div style={{ fontSize: 10, color: unlocked ? "#44cc88" : "#3a2a1a" }}>{ms.desc}</div>
                      </div>
                      {unlocked && <span style={{ fontSize: 10, color: "#44cc88" }}>✓</span>}
                    </div>
                  );
                })}
              </div>

              {zone >= 50
                ? <button style={S.rebirthBtn} onClick={() => setRebirthConfirm(true)}>🔁 Rebirth Now</button>
                : <div style={S.rebirthLocked}>🔒 Reach Zone 50 to unlock · Zone {zone}/50</div>}

              {/* Danger zone — reset */}
              <div style={{ marginTop: 18, borderTop: "1px solid #1e1810", paddingTop: 12 }}>
                <button
                  style={{ width: "100%", padding: "9px 0", background: "transparent", border: "1px solid #3a1a1a", borderRadius: 8, color: "#6a3a3a", fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5 }}
                  onClick={() => setResetConfirm(true)}
                >
                  🗑 Reset All Progress
                </button>
              </div>
            </div>

            {/* ── ACHIEVEMENTS ── */}
            <div style={{ ...S.statCard, borderColor: "#3a2060" }}>
              <div style={{ ...S.statCardTitle, color: "#a060ee" }}>
                Achievements
                <span style={{ float: "right", color: "#44cc88", fontWeight: "bold" }}>
                  {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#6a5a7a", fontStyle: "italic", marginBottom: 10 }}>
                Lifetime goals that grant permanent multipliers. Survive rebirth.
              </div>
              {/* Active bonuses summary */}
              {unlockedAchievements.length > 0 && (() => {
                const b = achBonuses;
                return (
                  <div style={{ background: "#0f0a18", border: "1px solid #3a2060", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#7a50bb", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Active Bonuses</div>
                    {b.clickMult > 0    && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>⚔️ +{Math.round(b.clickMult * 100)}% Click Damage</div>}
                    {b.goldMult > 0     && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>🪙 +{Math.round(b.goldMult * 100)}% Gold Dropped</div>}
                    {b.dpsMult > 0      && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>📯 +{Math.round(b.dpsMult * 100)}% Hero DPS</div>}
                    {b.upgradeCostReduce > 0 && <div style={{ fontSize: 12, color: "#e0c8ff", marginBottom: 3 }}>🏷️ −{Math.round(b.upgradeCostReduce * 100)}% Hero Costs</div>}
                  </div>
                );
              })()}
              {/* Achievement list */}
              {ACHIEVEMENTS.map(ach => {
                const unlocked = unlockedAchievements.includes(ach.id);
                // Compute progress for the stat
                const statCurrent = ach.stat === "totalClicks"    ? totalClicks
                                  : ach.stat === "totalKills"     ? totalKills
                                  : ach.stat === "totalGoldEarned"? totalGoldEarned
                                  : ach.stat === "totalGoldSpent" ? totalGoldSpent
                                  : ach.stat === "maxZone"        ? maxZoneReached
                                  : ach.stat === "maxCombo"       ? maxComboReached
                                  : ach.stat === "totalRebirths"  ? rebirthCount
                                  : 0;
                const pct = Math.min(100, (statCurrent / ach.threshold) * 100);
                return (
                  <div key={ach.id} style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #1e1810",
                    opacity: unlocked ? 1 : 0.7,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <span style={{ fontSize: 22, flexShrink: 0, filter: unlocked ? "none" : "grayscale(1)" }}>{ach.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: "bold", color: unlocked ? "#c0a0ff" : "#8a7a9a" }}>{ach.name}</span>
                          {unlocked && <span style={{ fontSize: 9, background: "#2a1a4a", color: "#a060ee", border: "1px solid #6a30cc", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>DONE</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#6a5a7a" }}>{ach.desc}</div>
                        <div style={{ fontSize: 10, color: "#44cc88", marginTop: 2 }}>{ach.rewardText}</div>
                      </div>
                    </div>
                    {!unlocked && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6a5a7a", marginBottom: 3 }}>
                          <span>{fmt(statCurrent)} / {fmt(ach.threshold)}</span>
                          <span>{Math.floor(pct)}%</span>
                        </div>
                        <div style={{ height: 4, background: "#1e1810", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#5a20aa,#a060ee)", borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                      </div>
                    )}
                    {unlocked && (
                      <div style={{ fontSize: 10, color: "#6a5a7a", fontStyle: "italic" }}>{ach.flavor}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PETS TAB ── */}
        {tab === "pets" && (
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#0d0a1a,#0a1008)", border: "1px solid #2a1a3a", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#e8dcc8", marginBottom: 4 }}>🐾 Companion Spirits</div>
              <div style={{ fontSize: 11, color: "#6a5a7a", lineHeight: 1.5 }}>
                Pets survive every Rebirth and grow stronger through evolution. Only one pet can be active at a time.
              </div>
              {activePet && petOwned[activePet] && (() => {
                const pet = PETS.find(p => p.id === activePet);
                if (!pet) return null;
                const tier = petOwned[activePet].tier || 0;
                return (
                  <div style={{ marginTop: 8, padding: "6px 10px", background: pet.color + "18", border: `1px solid ${pet.color}55`, borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{pet.tiers[tier].emoji}</span>
                    <span style={{ fontSize: 12, color: pet.color, fontWeight: "bold" }}>Active: {pet.name} · {pet.tiers[tier].name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: pet.color + "cc" }}>{pet.tiers[tier].desc}</span>
                  </div>
                );
              })()}
            </div>

            {/* Pet cards */}
            {PETS.map(pet => {
              const owned      = !!petOwned[pet.id];
              const isActive   = activePet === pet.id;
              const tier       = owned ? (petOwned[pet.id].tier || 0) : 0;
              const tierDat    = pet.tiers[tier];
              const isMaxTier  = tierDat.evolveCost === null;
              const locked     = zone < pet.unlockZone;

              // Affordability checks for buy button
              const canBuy = !owned && !locked && (
                pet.unlockCurrency === "gold"         ? gold >= pet.unlockCost :
                pet.unlockCurrency === "voidDust"     ? voidDust >= pet.unlockCost :
                pet.unlockCurrency === "soulCrystals" ? soulCrystals >= pet.unlockCost : false
              );

              // Currency label for buy cost
              const costLabel =
                pet.unlockCurrency === "gold"         ? `🪙 ${fmt(pet.unlockCost)}` :
                pet.unlockCurrency === "voidDust"     ? `🌌 ${pet.unlockCost} Void Dust` :
                pet.unlockCurrency === "soulCrystals" ? `💎 ${pet.unlockCost} SC` : "";

              // Evolve affordability
              const canEvolve = owned && !isMaxTier && (
                tierDat.evolveCurrency === "voidDust" ? voidDust >= tierDat.evolveCost : false
              );
              const evolveCostLabel = tierDat.evolveCost !== null
                ? (tierDat.evolveCurrency === "voidDust" ? `🌌 ${tierDat.evolveCost} Void Dust` : "")
                : "";

              return (
                <div key={pet.id} style={{
                  background: owned ? (isActive ? pet.color + "12" : "#13100a") : "#0d0b08",
                  border: `1px solid ${owned ? (isActive ? pet.color + "88" : pet.color + "33") : "#1e1810"}`,
                  borderRadius: 14, padding: "14px",
                  opacity: locked ? 0.6 : 1,
                }}>
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      fontSize: 32, width: 52, height: 52, borderRadius: 12,
                      background: owned ? pet.color + "22" : "#1a1410",
                      border: `1px solid ${owned ? pet.color + "55" : "#2a2010"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                      className={owned && isActive ? "pet-idle" : ""}
                    >
                      {owned ? tierDat.emoji : pet.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: "bold", color: owned ? pet.color : "#6a5a4a" }}>{pet.name}</span>
                        {owned && (
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: pet.color + "22", border: `1px solid ${pet.color}55`, color: pet.color, fontWeight: "bold" }}>
                            {isMaxTier ? "MAX" : `Tier ${tier + 1}/3`}
                          </span>
                        )}
                        {locked && (
                          <span style={{ fontSize: 9, color: "#4a3a2a" }}>🔒 Zone {pet.unlockZone}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#6a5a4a", fontStyle: "italic", lineHeight: 1.4, marginBottom: 4 }}>{pet.lore}</div>
                      {/* Tier ladder */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {pet.tiers.map((t, i) => (
                          <span key={i} style={{
                            fontSize: 9, padding: "1px 6px", borderRadius: 4,
                            background: owned && tier >= i ? pet.color + "22" : "#0d0b08",
                            border: `1px solid ${owned && tier >= i ? pet.color + "55" : "#2a2010"}`,
                            color: owned && tier >= i ? pet.color : "#3a2a1a",
                            fontWeight: "bold",
                          }}>
                            {t.emoji} {t.name}: {t.desc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {!owned ? (
                      <button
                        style={{
                          flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${canBuy ? pet.color + "88" : "#2a2010"}`,
                          background: canBuy ? pet.color + "22" : "#0d0b08",
                          color: canBuy ? pet.color : "#4a3a2a", fontSize: 12, fontWeight: "bold", fontFamily: "inherit",
                          cursor: canBuy ? "pointer" : "not-allowed",
                        }}
                        onClick={() => canBuy && buyPet(pet)}
                        disabled={!canBuy || locked}
                      >
                        {locked ? `🔒 Zone ${pet.unlockZone}` : `Adopt · ${costLabel}`}
                      </button>
                    ) : (
                      <>
                        <button
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${isActive ? pet.color : pet.color + "44"}`,
                            background: isActive ? pet.color + "33" : "#0d0b08",
                            color: isActive ? pet.color : pet.color + "99", fontSize: 12, fontWeight: "bold", fontFamily: "inherit",
                            cursor: isActive ? "default" : "pointer",
                          }}
                          onClick={() => !isActive && setActivePet(pet.id)}
                        >
                          {isActive ? `✦ Active` : `Deploy`}
                        </button>
                        {!isMaxTier && (
                          <button
                            style={{
                              flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${canEvolve ? "#aa55ff88" : "#2a2010"}`,
                              background: canEvolve ? "#2a1040" : "#0d0b08",
                              color: canEvolve ? "#cc88ff" : "#4a3a2a", fontSize: 12, fontWeight: "bold", fontFamily: "inherit",
                              cursor: canEvolve ? "pointer" : "not-allowed",
                            }}
                            onClick={() => canEvolve && evolvePet(pet)}
                            disabled={!canEvolve}
                          >
                            ✦ Evolve · {evolveCostLabel}
                          </button>
                        )}
                        {isMaxTier && (
                          <div style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${pet.color}66`, background: pet.color + "11", color: pet.color, fontSize: 11, fontWeight: "bold", textAlign: "center", letterSpacing: 1 }}>
                            🌟 FULLY EVOLVED
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SUMMON / GACHA TAB ── */}
        {tab === "summon" && (() => {
          const RARITY_COLORS = { Common:"#8a8a8a", Rare:"#3a8aee", Epic:"#9944dd", Legendary:"#f5c518" };
          const RARITY_RATES  = { Common:"70%", Rare:"20%", Epic:"8%", Legendary:"2%" };
          const bannerPity    = gachaPity[activeBanner] || 0;
          const pityToLegend  = GACHA_PITY_LEGEND - bannerPity;
          const pityToRare    = Math.max(0, GACHA_PITY_RARE - (bannerPity % GACHA_PITY_RARE));
          const canPull1      = eclipseShards >= GACHA_PULL_COST;
          const canPull10     = eclipseShards >= GACHA_PULL_COST * 10;

          return (
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Currency strip */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d0a18", border: "1px solid #3a2a5a", borderRadius: 10, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#6a5a7a", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>Eclipse Shards</div>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: "#cc88ff" }}>🌑 {eclipseShards}</div>
                  <div style={{ fontSize: 9, color: "#5a4a6a", marginTop: 2 }}>Earned from boss kills & zone milestones</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#6a5a7a", letterSpacing: 1 }}>PITY</div>
                  <div style={{ fontSize: 13, color: "#aa77ee", fontWeight: "bold" }}>{bannerPity}/{GACHA_PITY_LEGEND}</div>
                  <div style={{ fontSize: 9, color: "#4a3a5a" }}>Legend in {pityToLegend}</div>
                  {pityToRare > 0 && <div style={{ fontSize: 9, color: "#3a8aee" }}>Rare+ in {pityToRare}</div>}
                </div>
              </div>

              {/* Banner selector */}
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "hero",   label: "Hero Summon",  emoji: "⚔️",  desc: "Recruit heroes for your army" },
                  { id: "spirit", label: "Spirit Egg",   emoji: "🥚",  desc: "Hatch spirit companions" },
                ].map(b => (
                  <button
                    key={b.id}
                    style={{
                      flex: 1, padding: "10px 6px", borderRadius: 10, fontFamily: "inherit",
                      border: `2px solid ${activeBanner === b.id ? "#aa55ff" : "#2a2010"}`,
                      background: activeBanner === b.id ? "#1a0840" : "#0d0b08",
                      color: activeBanner === b.id ? "#cc88ff" : "#6a5a4a",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onClick={() => setActiveBanner(b.id)}
                  >
                    <div style={{ fontSize: 22, marginBottom: 3 }}>{b.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: "bold" }}>{b.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{b.desc}</div>
                  </button>
                ))}
              </div>

              {/* Pull buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 12, fontFamily: "inherit",
                    border: `2px solid ${canPull1 ? "#7a40cc88" : "#2a2010"}`,
                    background: canPull1 ? "linear-gradient(135deg,#1a0840,#2a1060)" : "#0d0b08",
                    color: canPull1 ? "#e0c8ff" : "#4a3a5a", fontSize: 14, fontWeight: "bold",
                    cursor: canPull1 ? "pointer" : "not-allowed",
                    boxShadow: canPull1 ? "0 0 20px #7a40cc33" : "none",
                    transition: "all 0.2s",
                  }}
                  onClick={() => canPull1 && performPull(activeBanner, 1)}
                  disabled={!canPull1}
                >
                  <div style={{ fontSize: 20, marginBottom: 2 }}>🌑</div>
                  <div>Summon ×1</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{GACHA_PULL_COST} Shards</div>
                </button>
                <button
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 12, fontFamily: "inherit",
                    border: `2px solid ${canPull10 ? "#f5c51888" : "#2a2010"}`,
                    background: canPull10 ? "linear-gradient(135deg,#2a1608,#4a2808)" : "#0d0b08",
                    color: canPull10 ? "#f5c518" : "#4a3a5a", fontSize: 14, fontWeight: "bold",
                    cursor: canPull10 ? "pointer" : "not-allowed",
                    boxShadow: canPull10 ? "0 0 24px #f5c51822" : "none",
                    transition: "all 0.2s",
                  }}
                  onClick={() => canPull10 && performPull(activeBanner, 10)}
                  disabled={!canPull10}
                >
                  <div style={{ fontSize: 20, marginBottom: 2 }}>✨</div>
                  <div>Summon ×10</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{GACHA_PULL_COST * 10} Shards</div>
                </button>
              </div>

              {/* Rates card */}
              <div style={{ background: "#0d0b08", border: "1px solid #2a2010", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Drop Rates</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(RARITY_RATES).map(([r, pct]) => (
                    <div key={r} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 5, background: RARITY_COLORS[r] + "15", border: `1px solid ${RARITY_COLORS[r]}44` }}>
                      <span style={{ fontSize: 10, fontWeight: "bold", color: RARITY_COLORS[r] }}>{r}</span>
                      <span style={{ fontSize: 11, color: RARITY_COLORS[r] + "cc" }}>{pct}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: "#5a4a2a", marginTop: 8 }}>
                  Guaranteed Rare+ every {GACHA_PITY_RARE} pulls · Legendary guaranteed by pull {GACHA_PITY_LEGEND}
                </div>
                <div style={{ fontSize: 9, color: "#5a4a4a", marginTop: 3 }}>
                  Duplicate heroes convert to 🌌 Void Dust · Duplicate spirits also convert
                </div>
              </div>

              {/* Pull history */}
              {pullHistory.length > 0 && (
                <div style={{ background: "#0d0b08", border: "1px solid #1e1810", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Recent Pulls</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {pullHistory.slice(0, 20).map((p, i) => (
                      <div key={i} title={`${p.name} (${p.rarity})`} style={{
                        width: 28, height: 28, borderRadius: 6, fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: (RARITY_COLORS[p.rarity] || "#888") + "22",
                        border: `1px solid ${RARITY_COLORS[p.rarity] || "#888"}55`,
                        boxShadow: p.rarity === "Legendary" ? `0 0 8px ${RARITY_COLORS.Legendary}88` : "none",
                      }}>
                        {p.emoji}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collection preview */}
              <div style={{ background: "#0d0b08", border: "1px solid #1e1810", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                  {activeBanner === "hero" ? "Hero Collection" : "Spirit Collection"} · {
                    activeBanner === "hero"
                      ? `${HERO_BANNER_POOL.filter(h => (heroLevels[h.id]||0)>0).length}/${HERO_BANNER_POOL.length}`
                      : `${SPIRIT_EGG_POOL.filter(p => petOwned[p.id]).length}/${SPIRIT_EGG_POOL.length}`
                  }
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(activeBanner === "hero" ? HERO_BANNER_POOL : SPIRIT_EGG_POOL).map(item => {
                    const heroData = activeBanner === "hero" ? HEROES.find(h => h.id === item.id) : null;
                    const owned = activeBanner === "hero" ? (heroLevels[item.id]||0)>0 : !!petOwned[item.id];
                    const emoji = heroData ? heroData.emoji : item.emoji;
                    const name  = heroData ? heroData.name  : item.name;
                    const rc    = RARITY_COLORS[item.rarity] || "#888";
                    return (
                      <div key={item.id} title={`${name} · ${item.rarity}`} style={{
                        width: 44, height: 54, borderRadius: 8, fontSize: 22,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                        background: owned ? rc + "18" : "#0a0808",
                        border: `1px solid ${owned ? rc + "55" : "#1a1810"}`,
                        opacity: owned ? 1 : 0.35,
                        boxShadow: owned && item.rarity === "Legendary" ? `0 0 10px ${rc}44` : "none",
                      }}>
                        {emoji}
                        <span style={{ fontSize: 7, color: rc, fontWeight: "bold", letterSpacing: 0.5 }}>
                          {item.rarity.slice(0,1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })()}

      </div>

      {/* NAV */}
      <nav style={S.nav}>
        {[
          { id: "battle",     emoji: "⚔️",  label: "Battle", badge: 0 },
          { id: "gear",       emoji: "🎒",  label: "Gear",   badge: newLootCount },
          { id: "lore",       emoji: "🗺️",  label: "Map",    badge: 0 },
          { id: "companions", emoji: "👥",  label: "Allies", badge: 0 },
          { id: "pets",       emoji: "🐾",  label: "Pets",   badge: newPetCount },
          { id: "summon",     emoji: "🌑",  label: "Summon", badge: 0 },
          { id: "shop",       emoji: "🏪",  label: "City",   badge: 0 },
          { id: "stats",      emoji: "📊",  label: "Stats",  badge: newAchievementCount },
        ].map(t => (
          <button key={t.id}
            style={{ ...S.navBtn, ...(tab === t.id ? S.navBtnActive : {}), position: "relative", padding: "7px 0 9px" }}
            onClick={() => {
              setTab(t.id);
              if (t.id === "gear")  setNewLootCount(0);
              if (t.id === "stats") setNewAchievementCount(0);
              if (t.id === "pets")  setNewPetCount(0);
            }}>
            <span style={{ ...S.navEmoji, fontSize: 15 }}>{t.emoji}</span>
            <span style={{ ...S.navLabel, fontSize: 7 }}>{t.label}</span>
            {t.badge > 0 && (
              <span style={{ position: "absolute", top: 4, right: "50%", transform: "translateX(10px)", minWidth: 13, height: 13, background: "#cc2200", borderRadius: 7, fontSize: 8, fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── SUMMON REVEAL MODAL ── */}
      {summonModal && (() => {
        const { phase, banner, results, revealIdx } = summonModal;
        const RARITY_COLORS = { Common:"#8a8a8a", Rare:"#3a8aee", Epic:"#9944dd", Legendary:"#f5c518" };
        const RARITY_GLOW   = { Common:"#8a8a8a33", Rare:"#3a8aee55", Epic:"#9944dd66", Legendary:"#f5c518aa" };
        const hasLegendary  = results.some(r => r.rarity === "Legendary");
        const currentCard   = phase === "revealing" && revealIdx < results.length ? results[revealIdx] : null;
        const isLegendaryMoment = currentCard?.rarity === "Legendary";
        const is10Pull      = results.length === 10;
        const heroData      = (r) => banner === "hero" ? HEROES.find(h => h.id === r.id) : null;
        const getEmoji      = (r) => heroData(r)?.emoji ?? r.emoji;
        const getName       = (r) => heroData(r)?.name  ?? r.name;

        return (
          <div
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: isLegendaryMoment
                ? "radial-gradient(ellipse at center, #1a0a0022 0%, #000000ff 100%)"
                : "rgba(0,0,0,0.92)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              transition: "background 0.6s ease",
            }}
            onClick={() => {
              // Allow tap-to-skip through cards
              if (phase === "revealing" && revealIdx < results.length) {
                setSummonModal(m => m ? { ...m, revealIdx: results.length } : null);
              } else if (phase === "done") {
                setSummonModal(null);
              }
            }}
          >
            {/* ── PORTAL PHASE ── */}
            {phase === "portal" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 24px" }}>
                  <div className="summon-portal-outer" style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: hasLegendary
                      ? "radial-gradient(circle, #f5c51822 0%, #aa5500cc 40%, transparent 70%)"
                      : "radial-gradient(circle, #cc88ff22 0%, #4a10cccc 40%, transparent 70%)",
                    border: `3px solid ${hasLegendary ? "#f5c518" : "#aa55ff"}`,
                    boxShadow: hasLegendary
                      ? "0 0 40px #f5c518aa, 0 0 80px #f5c51844, inset 0 0 40px #aa550044"
                      : "0 0 40px #aa55ffaa, 0 0 80px #7722ff44, inset 0 0 40px #3300aa44",
                  }} />
                  <div className="summon-portal-inner" style={{
                    position: "absolute", inset: 20, borderRadius: "50%",
                    background: hasLegendary
                      ? "radial-gradient(circle, #f5c51844, #aa550088)"
                      : "radial-gradient(circle, #cc88ff44, #7722cc88)",
                    border: `2px solid ${hasLegendary ? "#f5c51888" : "#cc88ff88"}`,
                  }} />
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 52,
                  }}>
                    {hasLegendary ? "🌟" : banner === "hero" ? "⚔️" : "🥚"}
                  </div>
                </div>
                <div style={{
                  fontSize: hasLegendary ? 18 : 15,
                  fontWeight: "bold",
                  color: hasLegendary ? "#f5c518" : "#cc88ff",
                  letterSpacing: hasLegendary ? 3 : 2,
                  textTransform: "uppercase",
                  textShadow: hasLegendary ? "0 0 20px #f5c518" : "0 0 12px #cc88ff",
                  marginBottom: 8,
                }}>
                  {hasLegendary ? "✦ Something Awakens... ✦" : "Summoning..."}
                </div>
                {hasLegendary && (
                  <div style={{ fontSize: 11, color: "#f5c51888", letterSpacing: 2, animation: "portalPulseText 0.8s ease-in-out infinite" }}>
                    LEGENDARY DETECTED
                  </div>
                )}
                <div style={{ marginTop: 20, fontSize: 9, color: "#4a3a5a" }}>Portal opening...</div>
              </div>
            )}

            {/* ── REVEALING PHASE ── */}
            {(phase === "revealing" || phase === "done") && (() => {
              const revealed = results.slice(0, revealIdx);

              return (
                <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
                  {/* Legendary flash overlay */}
                  {isLegendaryMoment && (
                    <div className="legendary-flash" style={{
                      position: "fixed", inset: 0, zIndex: -1,
                      background: "radial-gradient(ellipse at center, #f5c51811 0%, transparent 70%)",
                      pointerEvents: "none",
                    }} />
                  )}

                  {/* Cards grid */}
                  {is10Pull ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 }}>
                      {results.map((r, i) => {
                        const isRevealed  = i < revealIdx;
                        const isCurrent   = i === revealIdx - 1;
                        const rColor      = RARITY_COLORS[r.rarity] || "#888";
                        const isLegend    = r.rarity === "Legendary";
                        return (
                          <div
                            key={i}
                            className={isRevealed ? (isLegend && isCurrent ? "legendary-reveal" : "card-flip") : ""}
                            style={{
                              width: 68, height: 84, borderRadius: 10,
                              background: isRevealed
                                ? (isLegend ? "linear-gradient(145deg,#2a1a00,#4a3000)" : `linear-gradient(145deg,${rColor}18,${rColor}08)`)
                                : "#1a1410",
                              border: `2px solid ${isRevealed ? rColor : "#2a2010"}`,
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              gap: 3, opacity: isRevealed ? 1 : 0.35, transition: "opacity 0.2s",
                              boxShadow: isRevealed && isLegend ? `0 0 16px ${rColor}88, 0 0 32px ${rColor}44` : "none",
                            }}
                          >
                            {isRevealed ? (
                              <>
                                <span style={{ fontSize: 26 }}>{getEmoji(r)}</span>
                                <span style={{ fontSize: 8, fontWeight: "bold", color: rColor, textAlign: "center", lineHeight: 1.2, padding: "0 3px" }}>
                                  {getName(r).length > 12 ? getName(r).slice(0, 11) + "…" : getName(r)}
                                </span>
                                <span style={{ fontSize: 7, color: rColor + "cc", letterSpacing: 0.5 }}>{r.rarity}</span>
                                {r.isNew && <span style={{ fontSize: 7, color: "#44cc88", fontWeight: "bold" }}>NEW</span>}
                              </>
                            ) : (
                              <span style={{ fontSize: 22, opacity: 0.3 }}>❓</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single pull — large center card */
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                      {revealIdx > 0 && results[0] && (() => {
                        const r      = results[0];
                        const rColor = RARITY_COLORS[r.rarity] || "#888";
                        const isLeg  = r.rarity === "Legendary";
                        return (
                          <div
                            className={isLeg ? "legendary-reveal" : "card-flip"}
                            style={{
                              width: 160, height: 200, borderRadius: 20,
                              background: isLeg
                                ? "linear-gradient(145deg,#3a2200,#6a4000)"
                                : `linear-gradient(145deg,${rColor}22,${rColor}08)`,
                              border: `3px solid ${rColor}`,
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              gap: 8,
                              boxShadow: `0 0 30px ${RARITY_GLOW[r.rarity]}, 0 0 60px ${RARITY_GLOW[r.rarity]}`,
                            }}
                          >
                            <span style={{ fontSize: 56 }}>{getEmoji(r)}</span>
                            <div style={{ textAlign: "center", padding: "0 10px" }}>
                              <div style={{ fontSize: 14, fontWeight: "bold", color: rColor, marginBottom: 4 }}>{getName(r)}</div>
                              <div style={{ fontSize: 11, padding: "2px 10px", borderRadius: 5, background: rColor + "22", color: rColor, fontWeight: "bold", display: "inline-block" }}>{r.rarity}</div>
                              {r.isNew && <div style={{ fontSize: 11, color: "#44cc88", fontWeight: "bold", marginTop: 6 }}>✦ NEW UNLOCK ✦</div>}
                              {!r.isNew && <div style={{ fontSize: 10, color: "#6a5a4a", marginTop: 4 }}>Duplicate → Void Dust</div>}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Legendary big reveal banner */}
                  {isLegendaryMoment && (
                    <div className="legendary-banner" style={{
                      textAlign: "center", marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 28, fontWeight: "bold", color: "#f5c518", letterSpacing: 4, textTransform: "uppercase", textShadow: "0 0 30px #f5c518, 0 0 60px #f5c518aa", marginBottom: 4 }}>
                        ✦ LEGENDARY ✦
                      </div>
                      <div style={{ fontSize: 15, color: "#e8c888", letterSpacing: 1 }}>
                        {getName(currentCard)} appears!
                      </div>
                    </div>
                  )}

                  {/* Phase done — summary */}
                  {phase === "done" && (
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      {results.some(r => r.rarity === "Legendary") && (
                        <div style={{ fontSize: 13, color: "#f5c518", fontWeight: "bold", marginBottom: 8, textShadow: "0 0 12px #f5c51888" }}>
                          ✦ LEGENDARY ACQUIRED ✦
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "#6a5a4a", marginBottom: 16 }}>
                        {(() => {
                          const newCount = results.filter(r => r.isNew).length;
                          if (newCount === 0) return "All duplicates — Void Dust awarded.";
                          const word = banner === "hero"
                            ? (newCount > 1 ? "heroes" : "hero")
                            : (newCount > 1 ? "spirits" : "spirit");
                          return `${newCount} new ${word} unlocked!`;
                        })()}
                      </div>
                      <button
                        style={{
                          padding: "12px 40px", borderRadius: 12, border: "2px solid #7a40cc",
                          background: "linear-gradient(135deg,#1a0840,#2a1060)",
                          color: "#e0c8ff", fontSize: 14, fontWeight: "bold", fontFamily: "inherit",
                          cursor: "pointer", letterSpacing: 1,
                        }}
                        onClick={(e) => { e.stopPropagation(); setSummonModal(null); }}
                      >
                        Continue
                      </button>
                      {revealIdx < results.length ? null : (
                        <div style={{ fontSize: 9, color: "#3a2a4a", marginTop: 8 }}>Tap anywhere to close</div>
                      )}
                    </div>
                  )}

                  {phase === "revealing" && revealIdx < results.length && (
                    <div style={{ textAlign: "center", fontSize: 9, color: "#3a2a4a", marginTop: 8 }}>
                      {is10Pull ? `${revealIdx}/${results.length} revealed` : "Revealing..."} · Tap to skip
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* OFFLINE MODAL */}
      {offlineModal && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalIcon}>⏳</div>
            <div style={S.modalTitle}>Welcome Back!</div>
            <div style={S.modalBody}>Your companions held the line while you were away.</div>
            <div style={S.modalTime}>
              {offlineModal.seconds >= 3600
                ? `${Math.floor(offlineModal.seconds / 3600)}h ${Math.floor((offlineModal.seconds % 3600) / 60)}m`
                : `${Math.floor(offlineModal.seconds / 60)}m ${offlineModal.seconds % 60}s`} offline
            </div>
            <div style={S.modalGold}>🪙 +{fmt(offlineModal.gold)}</div>
            <button style={S.modalBtn} onClick={() => setOfflineModal(null)}>Claim Earnings</button>
          </div>
        </div>
      )}

      {/* REBIRTH MODAL */}
      {rebirthConfirm && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalIcon}>💎</div>
            <div style={S.modalTitle}>Rebirth?</div>
            <div style={S.modalBody}>Time fractures. You die. You return. Your companions will forget — but the Eclipse will fear you more.</div>
            <div style={{ ...S.modalGold, fontSize: 18, marginBottom: 8 }}>Soul Crystal #{rebirthCount + 1}</div>
            <div style={{ fontSize: 13, color: "#44cc88", marginBottom: 24 }}>
              New bonus: ×{(1 + (rebirthCount + 1) * 0.5).toFixed(1)} to all DPS & gold — forever
            </div>
            <button style={S.modalBtn} onClick={doRebirth}>🔁 Confirm Rebirth</button>
            <button style={{ ...S.modalBtn, marginTop: 10, background: "#1e1810", border: "1px solid #3a2d1a", color: "#8a7a5a" }} onClick={() => setRebirthConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* RESET ALL PROGRESS MODAL */}
      {resetConfirm && (
        <div style={S.modalOverlay}>
          <div style={{ ...S.modalBox, borderColor: "#6a1a1a" }}>
            <div style={S.modalIcon}>🗑</div>
            <div style={{ ...S.modalTitle, color: "#cc4444" }}>Reset All Progress?</div>
            <div style={S.modalBody}>This will permanently erase every hero, zone, gold, loot item, artifact, achievement, and rebirth. The save file will be cleared. There is no undo.</div>
            <button
              style={{ ...S.modalBtn, background: "linear-gradient(90deg,#6a0808,#cc1010)", marginBottom: 10 }}
              onClick={() => {
                window.storage.delete('crusade_save').catch(() => {});
                window.location.reload();
              }}
            >
              ☠ Confirm Reset
            </button>
            <button
              style={{ ...S.modalBtn, background: "#1e1810", border: "1px solid #3a2d1a", color: "#8a7a5a" }}
              onClick={() => setResetConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* CHRONICLE MODAL */}
      {activeChronicle && (
        <div style={S.modalOverlay} onClick={() => setActiveChronicle(null)}>
          <div style={S.chronicleBox} onClick={e => e.stopPropagation()}>
            <div style={S.chronicleIcon}>{activeChronicle.icon}</div>
            <div style={S.chronicleEra}>Chronicle</div>
            <div style={S.chronicleTitle}>{activeChronicle.title}</div>
            <div style={S.chronicleText}>{activeChronicle.text}</div>
            <button style={S.modalBtn} onClick={() => setActiveChronicle(null)}>Continue</button>
          </div>
        </div>
      )}

      {/* LOOT DROP / CHEST MODAL */}
      {lootModal && (
        <div style={S.modalOverlay}>
          <div
            style={{
              ...S.modalBox,
              borderColor: lootModal.chest ? (lootModal.chestKind === "hero" ? "#5a4010" : "#c8900a") : "#c8900a",
            }}
          >
            <div style={S.modalIcon}>{lootModal.emoji}</div>
            <div
              style={{
                fontSize: 10,
                color: "#8a6a3a",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {lootModal.chest ? `Chest Unsealed · Zone ${lootModal.zone}` : `Boss Drop · Zone ${lootModal.zone}`}
            </div>

            <div style={S.modalTitle}>{lootModal.name}</div>

            {lootModal.chest ? (
              <div style={S.modalBody}>
                {lootModal.chestKind === "hero"
                  ? (() => {
                      const isDupe = (heroLevels[lootModal.heroId] || 0) > 0;
                      return isDupe
                        ? <span style={{ color: "#aa8855" }}>You already march with this hero. Their contract dissolves into raw void energy.</span>
                        : "A hero contract was sealed into the chest. Will you claim it?";
                    })()
                  : "Inside the chest, multiple loot fragments flicker with eclipse-energy."}
              </div>
            ) : (
              <div style={S.modalBody}>A rare item fallen from the eclipse-touched boss.</div>
            )}

            {lootModal.chest && lootModal.chestKind === "hero" && (() => {
              const isDupe = (heroLevels[lootModal.heroId] || 0) > 0;
              const dustReward = 25 + Math.floor(lootModal.zone * 2);
              const hero = HEROES.find(h => h.id === lootModal.heroId);
              return isDupe
                ? <div style={{ ...S.modalGold, fontSize: 22, color: "#8a6aaa" }}>🌌 +{dustReward} Void Dust</div>
                : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 16 }}>
                    {hero && <RarityBadge rarity={hero.rarity} style={{ fontSize: 11, padding: "3px 10px" }} />}
                    <div style={{ ...S.modalGold, fontSize: 22, color: "#44cc88", margin: 0 }}>Hero Unlocked ✦</div>
                  </div>;
            })()}

            {lootModal.chest && lootModal.chestKind === "loot" ? (
              <div style={{ marginTop: -6, marginBottom: 14 }}>
                {(lootModal.items || []).map((it, idx) => {
                  const ir = it.rarity || getItemRarity(it.bonus);
                  const rc = RARITIES[ir] || RARITIES.Common;
                  return (
                    <div
                      key={it.id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 12,
                        color: "#8a7a5a",
                        padding: "6px 0",
                        borderBottom: "1px solid #1e1810",
                        borderLeft: `3px solid ${rc.color}`,
                        paddingLeft: 8,
                        marginBottom: 2,
                      }}
                    >
                      <span>{it.emoji} {it.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#f5c518aa" }}>{starsStr(it.stars || 1)}</span>
                        <RarityBadge rarity={ir} style={{ fontSize: 8 }} />
                        <span style={{ color: rc.color, fontWeight: "bold" }}>+{it.bonus}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !lootModal.chest ? (
              <div style={{ ...S.modalGold, fontSize: 22, color: "#44cc88" }}>+{lootModal.bonus}% {lootModal.label}</div>
            ) : null}

            <button
              style={S.modalBtn}
              onClick={async () => {
                claimLoot();
              }}
            >
              {lootModal.chest ? "🎁 Open Chest" : "⚔ Equip & Claim"}
            </button>

            <button
              style={{ ...S.modalBtn, marginTop: 8, background: "#1e1810", border: "1px solid #3a2d1a", color: "#6a5a3a" }}
              onClick={() => {
                if (!lootModal) return;
                // "Skip" / "Store in Bag" — items are stored UNEQUIPPED rather than lost.
                // Chest hero: still unlocks the hero (or awards dust on dupe).
                // Chest loot: adds items to bag unequipped so the player can equip later.
                if (lootModal.chest && lootModal.chestKind === "hero") {
                  // Reuse claimLoot for hero unlocks — no equip concept applies
                  claimLoot();
                  return;
                }
                if (lootModal.chest && lootModal.chestKind === "loot") {
                  // Store items in bag but leave them unequipped
                  const items = (lootModal.items || []).map(it => ({ ...it, equipped: false }));
                  setLootItems(prev => [...prev, ...items]);
                  setLootModal(null);
                  return;
                }
                // Non-chest single item: store unequipped
                setLootItems(prev => [...prev, { ...lootModal, equipped: false }]);
                setLootModal(null);
              }}
            >
              {lootModal.chest ? "Store in Bag" : "Store in Bag"}
            </button>
          </div>
        </div>
      )}

      {/* MILESTONE TOAST */}
      {milestoneToast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none",
          background: "linear-gradient(135deg,#1a1008,#2a1a08)", border: "2px solid #f5c518",
          borderRadius: 12, padding: "10px 18px", textAlign: "center", boxShadow: "0 0 30px #f5c51844" }}>
          <div style={{ fontSize: 20 }}>{milestoneToast.hero.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#f5c518" }}>{milestoneToast.hero.name} Milestone!</div>
          <div style={{ fontSize: 11, color: "#44cc88" }}>Level {milestoneToast.level} · Damage {milestoneToast.mult}</div>
        </div>
      )}

      {/* BOSS FAIL TOAST */}
      {bossFailToast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none",
          background: "linear-gradient(135deg,#1a0808,#2a0808)", border: "2px solid #cc2200",
          borderRadius: 12, padding: "12px 20px", textAlign: "center", boxShadow: "0 0 30px #cc220044",
          whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>💀</div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#ff4444" }}>Boss Timer Expired!</div>
          <div style={{ fontSize: 11, color: "#8a5a5a", marginTop: 3 }}>Pushed back → Zone {bossFailToast.prevZone} · Farming</div>
        </div>
      )}

      {/* RETREAT + EXHAUSTION TOAST */}
      {retreatToast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none",
          background: "linear-gradient(135deg,#160a0a,#1e0808)",
          border: "2px solid #8a1a1a",
          borderRadius: 14, padding: "14px 22px", textAlign: "center",
          boxShadow: "0 0 40px #aa000044", whiteSpace: "nowrap",
          animation: "achieveSlide 0.3s ease",
        }}>
          <div style={{ fontSize: 26, marginBottom: 5 }}>😴</div>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#ff5555", letterSpacing: 0.5, marginBottom: 3 }}>
            Forced Retreat!
          </div>
          <div style={{ fontSize: 11, color: "#8a5a5a", marginBottom: 4 }}>
            Pushed back → Zone {retreatToast.prevZone}
          </div>
          <div style={{ fontSize: 11, fontWeight: "bold", color: "#cc3333", background: "#2a0808", border: "1px solid #6a1010", borderRadius: 6, padding: "4px 10px" }}>
            💤 Exhausted · Abilities locked {Math.round(EXHAUSTION_DURATION / 1000)}s
          </div>
        </div>
      )}

      {/* COMMANDER PATH CHOICE MODAL */}
      {pathChoiceModal && (
        <div style={S.modalOverlay}>
          <div style={{ ...S.modalBox, maxWidth: 380, padding: "24px 20px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={S.modalIcon}>👁️</div>
            <div style={S.modalTitle}>Choose Your Path</div>
            <div style={{ ...S.modalBody, marginBottom: 20 }}>
              "Time has shattered. You stand at the crossroads of your next lifetime, Eternal Commander. How will you fight?"
            </div>
            {COMMANDER_PATHS.map(path => (
              <div key={path.id} style={{ ...S.pathCard, borderColor: path.color + "66" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{path.emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: "bold", color: path.color }}>{path.name}</div>
                    <div style={{ fontSize: 10, color: "#8a7a5a", letterSpacing: 1 }}>{path.subtitle}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#6a5a4a", fontStyle: "italic", marginBottom: 10, lineHeight: 1.5 }}>
                  "{path.lore}"
                </div>
                <div style={{ marginBottom: 12 }}>
                  {path.bonuses.map((b, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#c8b888", marginBottom: 3 }}>
                      ✦ {b}
                    </div>
                  ))}
                </div>
                <button
                  style={{ ...S.modalBtn, background: `linear-gradient(90deg, ${path.color}aa, ${path.color})`, fontSize: 13, padding: "11px 0" }}
                  onClick={() => chooseCommanderPath(path.id)}
                >
                  Choose {path.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div style={S.statRow}>
      <span style={S.dim}>{label}</span>
      <strong style={{ color: highlight ? "#f5c518" : "#e8dcc8" }}>{value}</strong>
    </div>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  root: { height: "100vh", background: "#0d0b0a", color: "#e8dcc8", fontFamily: "'Georgia','Times New Roman',serif", display: "flex", flexDirection: "column", overflow: "hidden", maxWidth: 480, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "linear-gradient(90deg,#1a1108,#0d0b0a)", borderBottom: "1px solid #2a2010", flexShrink: 0 },
  logo: { fontSize: 17, fontWeight: "bold", color: "#f5c518", letterSpacing: 2, textShadow: "0 0 16px #f5c51855" },
  subtitle: { fontSize: 10, color: "#6a5a3a", letterSpacing: 1 },
  goldPill: { background: "#1e1710", border: "1px solid #3a2d1a", borderRadius: 20, padding: "5px 14px", fontSize: 15, display: "flex", alignItems: "center", gap: 6 },
  goldNum: { color: "#f5c518", fontWeight: "bold" },

  abilityBar: { display: "flex", gap: 8, padding: "8px 12px", background: "#0f0c08", borderBottom: "1px solid #2a2010", flexShrink: 0 },
  abilityBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 6px", borderRadius: 10, border: "2px solid", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", gap: 3 },
  abilityEmoji: { fontSize: 26 },
  abilityName:  { fontSize: 10, fontWeight: "bold", color: "#e8dcc8", letterSpacing: 0.5 },
  abilityTimer: { fontSize: 10, fontWeight: "bold" },

  content: { flex: 1, overflowY: "auto", padding: "0 0 8px 0" },

  battleView: { display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 12px", gap: 8 },
  zoneLabel: { fontSize: 11, color: "#8a7a5a", letterSpacing: 2, textTransform: "uppercase" },
  enemyCard: { position: "relative", background: "linear-gradient(145deg,#1a1108,#110d05)", border: "2px solid #3a2d1a", borderRadius: 14, padding: "14px 28px", cursor: "pointer", userSelect: "none", textAlign: "center", width: "100%", boxSizing: "border-box", boxShadow: "0 0 40px #00000088,inset 0 0 40px #00000044", display: "flex", flexDirection: "column", alignItems: "center" },
  enemyEmoji: { fontSize: 56, display: "block", marginBottom: 6 },
  enemyName:  { fontSize: 16, fontWeight: "bold", color: "#f5c518", marginBottom: 8, width: "100%", textAlign: "center" },
  hpBar: { height: 7, background: "#1e1710", borderRadius: 4, border: "1px solid #3a2d1a", overflow: "hidden", marginBottom: 4, width: "100%" },
  hpFill: { height: "100%", background: "linear-gradient(90deg,#8b0000,#cc2200)", borderRadius: 4, transition: "width 0.1s linear" },
  hpText: { fontSize: 10, color: "#8a7a5a", marginBottom: 6, width: "100%", textAlign: "center" },
  tapHint: { fontSize: 10, color: "#4a3a2a", letterSpacing: 1, width: "100%", textAlign: "center" },
  activeBadges: { display: "flex", gap: 4, justifyContent: "center", marginBottom: 8, flexWrap: "wrap", width: "100%" },
  badge: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, padding: "2px 6px", borderRadius: 4 },
  rewardRow: { display: "flex", justifyContent: "space-between", width: "100%", fontSize: 12 },

  // Combo meter
  comboWrap:    { width: "100%", padding: "6px 10px", background: "#0d0b0a", border: "1px solid #1e1810", borderRadius: 8, boxSizing: "border-box" },
  comboBarTrack: { position: "relative", height: 6, background: "#1a1510", borderRadius: 3, border: "1px solid #2a2010", overflow: "visible" },
  comboBarFill:  { height: "100%", borderRadius: 3, transition: "width 0.1s ease, background 0.3s ease, box-shadow 0.3s ease", minWidth: 0 },
  zoneProgressWrap: { width: "100%" },
  zonePrgBar: { height: 6, background: "#1e1710", borderRadius: 3, border: "1px solid #2a2010", overflow: "hidden" },
  zonePrgFill: { height: "100%", background: "linear-gradient(90deg,#3a7a20,#6acc30)", borderRadius: 3, transition: "width 0.3s ease" },

  // Mode toggle
  modeToggleWrap: { display: "flex", width: "100%", background: "#0f0c08", border: "1px solid #2a2010", borderRadius: 7, overflow: "hidden" },
  modeBtn:    { flex: 1, padding: "6px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: "bold", letterSpacing: 0.5, transition: "all 0.2s" },
  modeBtnOn:  { background: "#1e2a10", color: "#6acc30", borderBottom: "2px solid #4a8a20" },
  modeBtnOff: { background: "transparent", color: "#4a3a2a" },

  // Boss stage timer bar
  bossTimerBar:  { height: 7, background: "#1e1208", borderRadius: 4, border: "1px solid #3a1a08", overflow: "hidden" },
  bossTimerFill: { height: "100%", borderRadius: 4, transition: "width 0.2s linear, background 0.5s" },

  loreCard: { width: "100%", background: "#0a0808", border: "1px solid #1e1410", borderRadius: 10, padding: "12px 14px" },
  loreZone: { fontSize: 9, color: "#5a4a2a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  loreText: { fontSize: 12, color: "#8a7a5a", fontStyle: "italic", lineHeight: 1.6 },

  shopView: { padding: "12px 14px" },
  sectionLabel: { fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #1e1810" },

  // Story banner in companions tab
  storyBanner: { background: "linear-gradient(135deg,#0f0a18,#130d08)", border: "1px solid #2a1a3a", borderRadius: 12, padding: "14px 16px", marginBottom: 16 },
  storyTitle: { fontSize: 14, fontWeight: "bold", color: "#c0a0ff", letterSpacing: 1, marginBottom: 8 },
  storyBody: { fontSize: 12, color: "#8a7a9a", lineHeight: 1.65, fontStyle: "italic" },

  // Companion cards
  companionCard: { background: "#13100a", border: "1px solid", borderRadius: 12, padding: "12px 14px", marginBottom: 10 },
  companionTop: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  companionEmoji: { fontSize: 28, flexShrink: 0 },
  companionInfo: { flex: 1 },
  companionName: { fontSize: 14, fontWeight: "bold", color: "#e8dcc8" },
  companionTitle: { fontSize: 10, color: "#8a6a3a", letterSpacing: 1, marginBottom: 2 },
  companionDps: { fontSize: 11, color: "#44cc88" },
  companionLore: { fontSize: 11, color: "#6a5a4a", fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 },
  companionBtn: { width: "100%", padding: "9px 0", borderRadius: 8, border: "1px solid", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 },
  companionBtnActive:   { background: "#1e1608", borderColor: "#5a4010", color: "#f5c518" },
  companionBtnDisabled: { background: "#110d08", borderColor: "#1e1810", color: "#4a3a2a", cursor: "not-allowed" },

  // Buy-mode toggle (Companions tab)
  buyToggleWrap:      { display: "flex", alignItems: "center", gap: 5, marginBottom: 10, padding: "8px 2px" },
  buyToggleBtn:       { flex: 1, padding: "7px 0", borderRadius: 7, border: "1px solid #2a2010", background: "#110d08", color: "#6a5a3a", fontSize: 12, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s" },
  buyToggleBtnActive: { background: "#2a1e08", borderColor: "#f5c518", color: "#f5c518", boxShadow: "0 0 8px #f5c51833" },

  shopBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px", marginBottom: 6, borderRadius: 8, border: "1px solid", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s", boxSizing: "border-box" },
  shopBtnActive:   { background: "#1e1608", borderColor: "#5a4010", color: "#e8dcc8" },
  shopBtnDisabled: { background: "#110d08", borderColor: "#1e1810", color: "#4a3a2a", cursor: "not-allowed" },
  shopBtnBought:   { background: "#0d1208", borderColor: "#1e2a10", color: "#5a7a5a", cursor: "default" },
  shopEmoji: { fontSize: 22, flexShrink: 0 },
  shopInfo:  { display: "flex", flexDirection: "column", flex: 1 },
  shopName:  { fontSize: 13, fontWeight: "bold" },
  shopSub:   { fontSize: 11, color: "#6a5a3a" },
  shopCost:  { fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" },
  lvlBadge: { fontSize: 10, background: "#f5c51822", color: "#f5c518", border: "1px solid #f5c51844", borderRadius: 4, padding: "1px 5px", marginLeft: 6 },

  statsView: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 },
  statCard: { background: "#13100a", border: "1px solid #2a2010", borderRadius: 10, padding: 14 },
  statCardTitle: { fontSize: 10, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #1e1810" },
  statRow: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 },
  dim: { color: "#6a5a3a", fontSize: 12 },

  rebirthCrystals: { fontSize: 22, marginBottom: 8, letterSpacing: 2 },
  rebirthDesc: { fontSize: 12, color: "#8a7a5a", lineHeight: 1.5, marginBottom: 10 },
  rebirthNextBonus: { fontSize: 12, color: "#44cc88", marginBottom: 14 },
  rebirthBtn: { width: "100%", padding: "13px 0", background: "linear-gradient(90deg,#2a0a6a,#5a10cc)", border: "1px solid #7a30ff88", borderRadius: 10, color: "#e0d0ff", fontSize: 15, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", letterSpacing: 1, boxShadow: "0 0 20px #5a10cc44" },
  rebirthLocked: { fontSize: 12, color: "#4a3a2a", textAlign: "center", padding: "10px 0", border: "1px solid #1e1810", borderRadius: 8 },

  nav: { display: "flex", background: "#0f0c08", borderTop: "1px solid #2a2010", flexShrink: 0 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "9px 0 11px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", gap: 2, borderTop: "2px solid transparent" },
  navBtnActive: { borderTop: "2px solid #f5c518", background: "#1a1408" },
  navEmoji: { fontSize: 18 },
  navLabel: { fontSize: 9, color: "#8a7a5a", letterSpacing: 1 },

  modalOverlay: { position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 },
  modalBox: { background: "linear-gradient(160deg,#1e1608,#110d05)", border: "2px solid #5a4010", borderRadius: 18, padding: "32px 28px", textAlign: "center", width: "100%", maxWidth: 340, boxShadow: "0 0 60px #f5c51822" },
  modalIcon:  { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#f5c518", marginBottom: 8 },
  modalBody:  { fontSize: 13, color: "#8a7a5a", marginBottom: 16, lineHeight: 1.5 },
  modalTime:  { fontSize: 12, color: "#6a5a3a", marginBottom: 8 },
  modalGold:  { fontSize: 32, fontWeight: "bold", color: "#f5c518", marginBottom: 24, textShadow: "0 0 20px #f5c51888" },
  modalBtn: { width: "100%", padding: "14px 0", background: "linear-gradient(90deg,#8a6010,#c8900a)", border: "none", borderRadius: 10, color: "#fff", fontSize: 16, fontWeight: "bold", fontFamily: "inherit", cursor: "pointer", letterSpacing: 1 },

  // Region header in battle tab
  regionHeader: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "#0d0b0a", border: "1px solid", borderRadius: 10, padding: "10px 14px" },
  regionEmoji:  { fontSize: 28, flexShrink: 0 },
  regionName:   { fontSize: 13, fontWeight: "bold", letterSpacing: 0.5, marginBottom: 2 },

  // Hero lore in shop
  heroLore: { fontSize: 10, color: "#5a4a2a", fontStyle: "italic", lineHeight: 1.4, marginTop: 3 },

  // Chronicle modal
  chronicleBox:   { background: "linear-gradient(160deg,#0f0818,#0d0a14)", border: "2px solid #4a2a8a", borderRadius: 18, padding: "32px 28px", textAlign: "center", width: "100%", maxWidth: 340, boxShadow: "0 0 60px #5a10cc44" },
  chronicleIcon:  { fontSize: 52, marginBottom: 10 },
  chronicleEra:   { fontSize: 9, color: "#6a4a9a", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 },
  chronicleTitle: { fontSize: 20, fontWeight: "bold", color: "#c0a0ff", marginBottom: 14 },
  chronicleText:  { fontSize: 13, color: "#8a7a9a", lineHeight: 1.65, fontStyle: "italic", marginBottom: 24 },

  // Commander path card inside path choice modal
  pathCard: { background: "#13100a", border: "1px solid", borderRadius: 12, padding: "14px", marginBottom: 12, textAlign: "left" },

  heroCollectionCard: {
    background: "#13100a",
    border: "1px solid #2a2010",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 10,
  },
};

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  @keyframes shake {
    0%   { transform: translate(0,0) rotate(0deg); }
    25%  { transform: translate(-4px,2px) rotate(-1deg); }
    50%  { transform: translate(4px,-2px) rotate(1deg); }
    75%  { transform: translate(-2px,4px) rotate(-0.5deg); }
    100% { transform: translate(0,0) rotate(0deg); }
  }
  .shake { animation: shake 0.15s ease; }
  @keyframes enemy-float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-8px); }
  }
  .enemy-idle { animation: enemy-float 3s ease-in-out infinite; display: block; }

  .enemy-sprite {
    width: 160px;
    height: 160px;
    object-fit: contain;
    image-rendering: pixelated;
    pointer-events: none;
    user-select: none;
    display: block;
    margin: 0 auto;
  }

  /* float alias (use enemy-float keyframes so idleAnim === "float" works like the pasted animation) */
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-8px); }
  }
  .float {
    animation: float 3s ease-in-out infinite;
    display: block;
    margin: 0 auto;
  }


  @keyframes dragonHover {
    0%,100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-15px) scale(1.04); }
  }
  .dragonHover {
    animation: dragonHover 4s ease-in-out infinite;
    display: block;
    margin: 0 auto;
  }

  @keyframes hitFlash {
    0% { filter: brightness(2); }
    100% { filter: brightness(1); }
  }
  .enemy-hit {
    animation: hitFlash 0.15s ease;
  }

  @keyframes floatUp {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-60px) scale(1.4); }
  }
  .float-dmg {
    position: absolute;
    pointer-events: none;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 8px currentColor;
    animation: floatUp 0.9s ease-out forwards;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    font-family: Georgia, serif;
  }
  @keyframes weakPulse {
    0%,100% { transform: translate(-50%,-50%) scale(1);   box-shadow: 0 0 12px #ff440088; }
    50%     { transform: translate(-50%,-50%) scale(1.35); box-shadow: 0 0 24px #ff6600cc; }
  }
  .weak-point { animation: weakPulse 0.45s ease-in-out infinite !important; }

  @keyframes bossGlow {
    0%,100% { box-shadow: 0 0 20px var(--boss-accent, #f5c51844), inset 0 0 30px var(--boss-accent, #f5c51811); }
    50%     { box-shadow: 0 0 40px var(--boss-accent, #f5c51888), inset 0 0 60px var(--boss-accent, #f5c51822); }
  }
  .boss-card { animation: bossGlow 2s ease-in-out infinite; }
  @keyframes bossEntrance {
    0%   { opacity: 0; transform: scale(0.8) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  .boss-entrance { animation: bossEntrance 0.5s ease-out forwards; }
  @keyframes bossBlink {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.4; }
  }
  @keyframes achieveSlide {
    0%   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes exhaustionPulse {
    0%,100% { opacity: 1; box-shadow: 0 0 6px #cc333344; }
    50%     { opacity: 0.7; box-shadow: 0 0 14px #cc333388; }
  }
  @keyframes partyGlow {
    0%,100% { filter: brightness(1.1); }
    50%     { filter: brightness(1.6) saturate(1.4); }
  }
  .party-glow {
    animation: partyGlow 0.7s ease-in-out infinite;
  }
  @keyframes gearSlotGlow {
    0%,100% { box-shadow: 0 0 6px var(--slot-color, #f5c51844); }
    50%     { box-shadow: 0 0 14px var(--slot-color, #f5c51888); }
  }
  .gear-slot-equipped { animation: gearSlotGlow 2.5s ease-in-out infinite; }

  @keyframes petFloat {
    0%,100% { transform: translateY(0) rotate(0deg) scale(1); }
    30%     { transform: translateY(-5px) rotate(-4deg) scale(1.06); }
    70%     { transform: translateY(-3px) rotate(3deg) scale(1.04); }
  }
  .pet-idle {
    animation: petFloat 2.5s ease-in-out infinite;
    display: inline-block;
  }

  /* ── GACHA ANIMATIONS ─────────────────────────── */
  @keyframes portalSpinOuter {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.08); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes portalSpinInner {
    0%   { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(-360deg) scale(1); }
  }
  .summon-portal-outer { animation: portalSpinOuter 2s linear infinite; }
  .summon-portal-inner { animation: portalSpinInner 1.4s linear infinite; }

  @keyframes cardFlip {
    0%   { transform: rotateY(90deg) scale(0.85); opacity: 0; }
    55%  { transform: rotateY(-8deg) scale(1.04); opacity: 1; }
    100% { transform: rotateY(0deg) scale(1); opacity: 1; }
  }
  .card-flip { animation: cardFlip 0.38s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }

  @keyframes legendaryReveal {
    0%   { transform: scale(0.4) rotateY(90deg); opacity: 0; filter: brightness(3); }
    40%  { transform: scale(1.18) rotateY(-6deg); opacity: 1; filter: brightness(2); }
    70%  { transform: scale(0.96) rotateY(2deg); filter: brightness(1.4); }
    100% { transform: scale(1) rotateY(0deg); opacity: 1; filter: brightness(1); }
  }
  .legendary-reveal { animation: legendaryReveal 0.85s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }

  @keyframes legendaryFlashBg {
    0%   { opacity: 0; }
    20%  { opacity: 1; }
    100% { opacity: 0.6; }
  }
  .legendary-flash { animation: legendaryFlashBg 0.5s ease forwards; }

  @keyframes legendaryBannerIn {
    0%   { transform: translateY(20px) scale(0.9); opacity: 0; }
    60%  { transform: translateY(-4px) scale(1.02); }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  .legendary-banner { animation: legendaryBannerIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }

  @keyframes portalPulseText {
    0%,100% { opacity: 0.5; letter-spacing: 2px; }
    50%     { opacity: 1;   letter-spacing: 4px; }
  }

`;
