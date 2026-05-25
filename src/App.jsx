import { useState, useEffect, useRef, useCallback } from "react";

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

const BOSSES = [
  {
    zone: 5,
    name: "The Hollow Beast",
    image: "/bosses/beast.gif",
    bgm: "boss-theme.mp3",
  },
  {
    zone: 10,
    name: "Eclipse Emperor",
    image: "/bosses/emperor.gif",
    bgm: "final-boss.mp3",
  },
];

const ENEMIES = [
  {
    id: "slime",
    name: "Slime",
    enemyKey: "slime",
    emoji: "",
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
    emoji: "",
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
    emoji: "",
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
    emoji: "",
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
    emoji: "",
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
    emoji: "",
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
    emoji: "",
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
    emoji: "",
    image: "/monsters/lich.png",
    idleAnim: "float",
    baseHp: 20000,
    baseGold: 2000,
    zone: 8,
  },
];

const HEROES = [
  // acquisition: { kind: 'start' | 'shop' | 'chest' | 'realmoney', note: string }
  // passive: { type: 'dmgMult'|'goldMult'|'cdReduce'|'clickAdd'|'dpsAdd', value: number }
  { id: "squire",   name: "Squire",       emoji: "🧑‍⚔️", baseDps: 1,    baseCost: 15,    costMult: 1.15, lore: "A farmboy who survived the first eclipse. He fights because nobody else will.", acquisition: { kind: "start", note: "You begin with him." }, passive: { type: "clickAdd", value: 1 } },
  { id: "archer",   name: "Archer",       emoji: "🏹",  baseDps: 5,    baseCost: 100,   costMult: 1.15, lore: "Her forest was swallowed by darkness. She shoots arrows toward a horizon she can't see.", acquisition: { kind: "chest", note: "Drops from Goblin Crags chests." }, passive: { type: "dmgMult", value: 0.05 } },
  { id: "mage",     name: "Mage",         emoji: "🧙",  baseDps: 20,   baseCost: 500,   costMult: 1.15, lore: "Refused to flee when the eclipse came. His tower is rubble, but his spells survive.", acquisition: { kind: "shop", note: "Available after unlocking Mage training." }, passive: { type: "cdReduce", value: 0.02 } },
  { id: "paladin",  name: "Paladin",      emoji: "⚔️",  baseDps: 80,   baseCost: 2000,  costMult: 1.15, lore: "One of the last who refused the Lich's offer of immortality. He fights as penance.", acquisition: { kind: "realmoney", note: "Limited Relic Store offer." }, passive: { type: "goldMult", value: 0.05 } },
  { id: "assassin", name: "Assassin",     emoji: "🗡️",  baseDps: 300,  baseCost: 8000,  costMult: 1.15, lore: "Sold her blade to the highest bidder until the eclipse swallowed them all. Now one cause remains.", acquisition: { kind: "chest", note: "Rare chest drop (Skeleton Catacombs)." }, passive: { type: "dpsAdd", value: 0.02 } },
  { id: "dragon",   name: "Dragon Rider", emoji: "🐲",  baseDps: 1200, baseCost: 35000, costMult: 1.15, lore: "The last free dragon chose a rider. Neither fully understands why. Both are grateful.", acquisition: { kind: "shop", note: "Purchasable after zone milestone." }, passive: { type: "dmgMult", value: 0.10 } },
  { id: "titan",    name: "Titan Guard",  emoji: "🗿",  baseDps: 5000, baseCost: 150000,costMult: 1.15, lore: "An ancient stone guardian reawakened by the first eclipse-quake. It has no allegiance — only purpose.", acquisition: { kind: "chest", note: "Obsidian Citadel chest reward." }, passive: { type: "goldMult", value: 0.08 } },
  { id: "seraph",   name: "Seraph",       emoji: "😇",  baseDps: 20000,baseCost: 800000,costMult: 1.15, lore: "Fell through a crack in the sky when the eclipse weakened the veil. It fights beside mortals, awed and confused.", acquisition: { kind: "realmoney", note: "Heavenbound offer." }, passive: { type: "clickAdd", value: 3 } },
];


const UPGRADES = [
  { id: "click1", name: "Sharp Blade",      desc: "+5 click dmg",    cost: 50,     type: "click", value: 5 },
  { id: "click2", name: "Battle Axe",       desc: "+20 click dmg",   cost: 500,    type: "click", value: 20 },
  { id: "click3", name: "Holy Sword",       desc: "+100 click dmg",  cost: 5000,   type: "click", value: 100 },
  { id: "click4", name: "Eclipse Breaker",  desc: "+1K click dmg",   cost: 100000, type: "click", value: 1000 },
  { id: "hero1",  name: "Squire Training",  desc: "Squire ×2 DPS",   cost: 200,    type: "hero",  heroId: "squire",   mult: 2 },
  { id: "hero2",  name: "Eagle Eye",        desc: "Archer ×2 DPS",   cost: 1000,   type: "hero",  heroId: "archer",   mult: 2 },
  { id: "hero3",  name: "Arcane Tome",      desc: "Mage ×2 DPS",     cost: 5000,   type: "hero",  heroId: "mage",     mult: 2 },
  { id: "hero4",  name: "Divine Shield",    desc: "Paladin ×2 DPS",  cost: 20000,  type: "hero",  heroId: "paladin",  mult: 2 },
  { id: "hero5",  name: "Shadow Contract",  desc: "Assassin ×2 DPS", cost: 80000,  type: "hero",  heroId: "assassin", mult: 2 },
  { id: "hero6",  name: "Dragon Pact",      desc: "Dragon Rider ×2", cost: 400000, type: "hero",  heroId: "dragon",   mult: 2 },
];

// Hero level milestones — landmark levels granting damage multipliers
const HERO_MILESTONES = [
  { level: 25,  mult: 2, label: "×2" },
  { level: 50,  mult: 4, label: "×4" },
  { level: 100, mult: 8, label: "×8" },
];

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
  { type: "Sword",  emoji: "🗡️", stat: "clickMult", label: "Click Dmg" },
  { type: "Armor",  emoji: "🛡️", stat: "dpsMult",   label: "Hero DPS"  },
  { type: "Ring",   emoji: "💍", stat: "gold",      label: "Gold Drop" },
  { type: "Amulet", emoji: "📿", stat: "cdReduce",  label: "CD Reduce" },
];

function rollLootItem(zone) {
  const prefix = LOOT_PREFIXES[Math.floor(Math.random() * LOOT_PREFIXES.length)];
  const t      = LOOT_TYPES[Math.floor(Math.random() * LOOT_TYPES.length)];
  // Bonus scales softly with zone: 5-40%
  const bonus  = Math.round((5 + Math.min(zone * 0.3, 35)) * (0.7 + Math.random() * 0.6));
  return {
    id:     `loot_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    name:   `${prefix} ${t.type}`,
    emoji:  t.emoji,
    type:   t.type,
    stat:   t.stat,
    label:  t.label,
    bonus,  // percentage
    zone,
    equipped: false,
  };
}

// Companions — lore characters that auto-attack, levelable
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

const ABILITIES = [
  { id: "berserk",   name: "Berserker", emoji: "💢", desc: "10× click dmg", duration: 5000,  cooldown: 15000, color: "#cc2200" },
  { id: "battlecry", name: "Battle Cry",emoji: "📯", desc: "2× all dmg",   duration: 5000,  cooldown: 30000, color: "#f5c518" },
  { id: "goldrush",  name: "Gold Rush", emoji: "✨", desc: "2× gold drops", duration: 10000, cooldown: 60000, color: "#44cc88" },
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
  { minZone: 1,  maxZone: 9,   name: "The Slime Outskirts",     emoji: "🌾", accent: "#3a6a20", desc: "Once-peaceful farmland, now overrun by acidic oozes seeping from the eclipse wounds in the earth." },
  { minZone: 10, maxZone: 19,  name: "Goblin Crags",            emoji: "⛰️", accent: "#6a5a20", desc: "A rocky labyrinth where goblin ambushers pick apart traveling merchants and lost patrols." },
  { minZone: 20, maxZone: 29,  name: "The Forgotten Catacombs", emoji: "🪦", accent: "#4a3a6a", desc: "Where the restless skeletons of ancient soldiers guard rusted armor and oaths made to dead kings." },
  { minZone: 30, maxZone: 39,  name: "Orcish Wastes",           emoji: "🏜️", accent: "#7a4a10", desc: "Scorched flatlands where orc warlords carve out kingdoms in the Lich's name, fighting for his favor." },
  { minZone: 40, maxZone: 49,  name: "The Troll Marshes",       emoji: "🌿", accent: "#2a5a3a", desc: "Fetid swamps where troll shamans commune with the darkness, growing stronger with each eclipse cycle." },
  { minZone: 50, maxZone: 59,  name: "Citadel Approach",        emoji: "🏰", accent: "#3a3a7a", desc: "The broken road to the Lich King's domain. Dark Knights patrol in unwavering, undying formation." },
  { minZone: 60, maxZone: 69,  name: "The Dragon Highlands",    emoji: "🐉", accent: "#7a2a10", desc: "Volcanic ridges where corrupted dragons circle endlessly, loyal to the Lich's call by dark sorcery." },
  { minZone: 70, maxZone: 999, name: "The Obsidian Citadel",    emoji: "🌋", accent: "#2a0a0a", desc: "The volcanic throne of the Dragon and the birthplace of the Lich King's dark magic. The air itself burns." },
];

// Chronicle milestones — pop up once when a zone threshold is first crossed
const CHRONICLES = [
  { zone: 10,  icon: "🗺️", title: "The Crags Await",           text: "You cross into the Goblin Crags. The farmlands are behind you — scorched and gone. Mira's arrows find purchase in the rocky walls. She says she has been here before. In another life, perhaps." },
  { zone: 25,  icon: "⚰️", title: "Into the Catacombs",         text: "The ground hollows beneath your boots. The Forgotten Catacombs swallow sound itself. Brother Aldric crosses himself and prays. The skeletons here were not always enemies. They had names once." },
  { zone: 50,  icon: "📜", title: "Oracle's Prophecy Unlocked", text: "Your mortal shell has reached its limit against the corrupting fog. You stand before the threshold of ancient power. To go any further, you must shatter your current timeline and scatter your gold to ascend into spirit form." },
  { zone: 75,  icon: "🌋", title: "The Obsidian Citadel",       text: "The air smells of sulfur and old magic. The Lich King's fortress rises from the volcanic rock like a wound that never healed. Vex touches the wall. 'I have died here before,' he says quietly. 'More than once.'" },
  { zone: 100, icon: "☠️", title: "The Threshold of the Lich",  text: "One hundred zones. The Eclipse pulses above like a heartbeat. The Lich King knows your name now. He has always known it. Every lifetime, every Rebirth — he has been waiting. This time, you are stronger." },
];

function getCurrentRegion(zone) {
  return REGIONS.find(r => zone >= r.minZone && zone <= r.maxZone) || REGIONS[REGIONS.length - 1];
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return "0";
  n = Math.floor(n);
  if (n < 1000) return n.toString();
  let i = 0; let v = n;
  while (v >= 1000 && i < SUFFIXES.length - 1) { v /= 1000; i++; }
  return v.toFixed(2) + SUFFIXES[i];
}

function getEnemyForZone(zone) {
  const idx  = Math.min(zone - 1, ENEMIES.length - 1);
  const base = ENEMIES[idx];
  const scale = Math.pow(1.5, Math.max(0, zone - base.zone));
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
    const upg  = UPGRADES.find(u => u.type === "hero" && u.heroId === hero.id);
    const upgMult = upg && boughtUpgrades.includes(upg.id) ? upg.mult : 1;
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
    if (a.type === "synergy")   b.synergyPct = Math.max(b.synergyPct, a.value);
  }
  return b;
}

// Compute equipped loot bonuses
function computeLootBonuses(lootItems) {
  const b = { clickMult: 0, dpsMult: 0, gold: 0, cdReduce: 0 };
  for (const item of lootItems) {
    if (!item.equipped) continue;
    if (item.stat === "clickMult") b.clickMult += item.bonus / 100;
    if (item.stat === "dpsMult")   b.dpsMult   += item.bonus / 100;
    if (item.stat === "gold")      b.gold       += item.bonus / 100;
    if (item.stat === "cdReduce")  b.cdReduce   += item.bonus / 100;
  }
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

function getCurrentLore(zone) {
  let lore = ZONE_LORE[0];
  for (const entry of ZONE_LORE) {
    if (zone >= entry.zone) lore = entry;
  }
  return lore;
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function IdleRPG() {
  // ── Audio (placeholder) ───────────────────────────────────────────────
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const musicRef = useRef(null);
  const bgmLoopRef = useRef(false);

  const playSfx = useCallback((src) => {
    if (!sfxEnabled || !src) return;
    try {
      const a = new Audio(src);
      a.volume = 0.6;
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

  const [abilityState, setAbilityState] = useState(
    Object.fromEntries(ABILITIES.map(a => [a.id, { activeUntil: 0, cdUntil: 0 }]))
  );
  const [now, setNow] = useState(Date.now());

  const [floats, setFloats] = useState([]);
  const [shake, setShake]   = useState(false);
  const [weakPoints, setWeakPoints] = useState([]); // dynamic crit hotspots on enemy

  const [storyPopup, setStoryPopup] = useState(null);
  const [seenStoryZones, setSeenStoryZones] = useState([]);

  const [enemyHitNonce, setEnemyHitNonce] = useState(0);

  const [tab, setTab] = useState("battle");

  const [offlineModal, setOfflineModal]       = useState(null);
  const [rebirthCount, setRebirthCount]       = useState(0);
  const [rebirthConfirm, setRebirthConfirm]   = useState(false);
  const [commanderPath, setCommanderPath]     = useState(null); // null | "vanguard" | "tactician" | "void_mage"
  const [pathChoiceModal, setPathChoiceModal] = useState(false);
  const [seenChronicles, setSeenChronicles]   = useState([]);
  const [activeChronicle, setActiveChronicle] = useState(null);

  // (placeholder for future world-transition polish)
  const [pendingWorldBg, setPendingWorldBg] = useState(null);



  // ── refs ──────────────────────────────────────────────────────────────────
  const floatId  = useRef(0);
  const zoneRef  = useRef(zone);
  const enemyRef = useRef(currentEnemy);
  zoneRef.current  = zone;
  enemyRef.current = currentEnemy;

  const goldRef            = useRef(gold);            goldRef.current            = gold;
  const heroLevelsRef      = useRef(heroLevels);      heroLevelsRef.current      = heroLevels;
  const companionLevelsRef = useRef(companionLevels); companionLevelsRef.current = companionLevels;
  const boughtUpgradesRef  = useRef(boughtUpgrades);  boughtUpgradesRef.current  = boughtUpgrades;
  const clickDmgRef        = useRef(clickDmg);        clickDmgRef.current        = clickDmg;
  const killCountRef       = useRef(killCount);       killCountRef.current       = killCount;
  const rebirthCountRef    = useRef(rebirthCount);    rebirthCountRef.current    = rebirthCount;
  const seenChroniclesRef  = useRef(seenChronicles);  seenChroniclesRef.current  = seenChronicles;
  const artifactOwnedRef   = useRef(artifactOwned);   artifactOwnedRef.current   = artifactOwned;
  const soulCrystalsRef    = useRef(soulCrystals);    soulCrystalsRef.current    = soulCrystals;
  const lootItemsRef       = useRef(lootItems);       lootItemsRef.current       = lootItems;
  const voidDustRef        = useRef(voidDust);        voidDustRef.current        = voidDust;
  const saveLoadedRef      = useRef(false);
  const wpIdRef            = useRef(0);
  const commanderPathRef   = useRef(commanderPath);   commanderPathRef.current   = commanderPath;
  const maxWpRef           = useRef(2);               maxWpRef.current           = commanderPath === "void_mage" ? 3 : 2;
  const seenStoryZonesRef = useRef(seenStoryZones); seenStoryZonesRef.current = seenStoryZones;


  // ── derived values ────────────────────────────────────────────────────────
  const isBerserk   = now < (abilityState.berserk?.activeUntil   || 0);
  const isBattleCry = now < (abilityState.battlecry?.activeUntil || 0);
  const isGoldRush  = now < (abilityState.goldrush?.activeUntil  || 0);

  const artBonuses  = computeArtifactBonuses(artifactOwned);
  const lootBonuses = computeLootBonuses(lootItems);
  const heroPassives = computeHeroPassiveBonuses(heroLevels);

  // Effective cooldown multiplier from artifacts + loot + hero passives
  const cdReduction = Math.min(0.7, artBonuses.cdReduce + lootBonuses.cdReduce + heroPassives.cdReduce); // cap at 70%

  const dmgMult         = isBattleCry ? 2 : 1;
  const rebirthMult     = 1 + rebirthCount * 0.5;
  const pathClickMult   = commanderPath === "vanguard"  ? 2   : 1;
  const pathDpsMult     = commanderPath === "tactician" ? 1.4 : 1;
  const pathGoldBonus   = commanderPath === "tactician" ? 0.2 : 0;
  const clickArtMult    = 1 + artBonuses.clickMult + lootBonuses.clickMult;
  const effectiveDmg    = (clickDmg + heroPassives.clickAdd) * (isBerserk ? 10 : 1) * dmgMult * clickArtMult * pathClickMult * (1 + heroPassives.dmgMult);
  const idleDps         = computeIdleDps(heroLevels, boughtUpgrades, artifactOwned) * (1 + lootBonuses.dpsMult) * (1 + heroPassives.dpsAdd) * dmgMult * rebirthMult * pathDpsMult;

  const goldMultRef    = useRef(1); goldMultRef.current    = isGoldRush ? 2 : 1;
  const rebirthMultRef = useRef(1); rebirthMultRef.current = rebirthMult;
  const idleDpsRef     = useRef(0); idleDpsRef.current     = idleDps;
  const artGoldMultRef = useRef(1); artGoldMultRef.current = 1 + artBonuses.goldMult + lootBonuses.gold + pathGoldBonus + heroPassives.goldMult;
  const effectiveDmgRef= useRef(1); effectiveDmgRef.current= effectiveDmg;
  const artSynergyRef  = useRef(0); artSynergyRef.current  = artBonuses.synergyPct;
  const pathDpsMultRef = useRef(1); pathDpsMultRef.current = pathDpsMult;

  const currentLore = getCurrentLore(zone);

  const currentWorld = WORLDS.find((w) => zone <= w.id * 5) || WORLDS[WORLDS.length - 1];
  const currentBoss = BOSSES.find((b) => b.zone === zone) || null;


  // ── clock tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  // ── spawn enemy ───────────────────────────────────────────────────────────
  const spawnEnemy = useCallback((nextZone) => {
    const e = getEnemyForZone(nextZone);
    setCurrentEnemy(e);
    setEnemyHp(e.maxHp);
    enemyRef.current = e;
  }, []);

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
          zoneRef.current = sv.zone;
          spawnEnemy(sv.zone);
        }
        if (sv.seenChronicles)         setSeenChronicles(sv.seenChronicles);
        if (sv.seenStoryZones)        setSeenStoryZones(sv.seenStoryZones);
        if (sv.soulCrystals    != null) setSoulCrystals(sv.soulCrystals);
        if (sv.artifactOwned)          setArtifactOwned(sv.artifactOwned);
        if (sv.lootItems)              setLootItems(sv.lootItems);
        if (sv.voidDust        != null) setVoidDust(sv.voidDust);
        if (sv.commanderPath)          setCommanderPath(sv.commanderPath);
        saveLoadedRef.current = true;
        if (sv.lastSeen && sv.savedDps > 0) {
          const elapsed = Math.min((Date.now() - sv.lastSeen) / 1000, 4 * 3600);
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
  useEffect(() => {
    const handle = () => {
      if (!document.hidden) return;
      window.storage.set('crusade_save', JSON.stringify({
        gold:           goldRef.current,
        heroLevels:     heroLevelsRef.current,
        companionLevels:companionLevelsRef.current,
        boughtUpgrades: boughtUpgradesRef.current,
        clickDmg:       clickDmgRef.current,
        zone:           zoneRef.current,
        killCount:      killCountRef.current,
        rebirthCount:   rebirthCountRef.current,
        seenChronicles: seenChroniclesRef.current,
        soulCrystals:   soulCrystalsRef.current,
        artifactOwned:  artifactOwnedRef.current,
        lootItems:      lootItemsRef.current,
        voidDust:       voidDustRef.current,
        commanderPath:  commanderPathRef.current,
        savedDps:       idleDpsRef.current,
        lastSeen:       Date.now(),
        seenStoryZones: seenStoryZonesRef.current,
      })).catch(() => {});

    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  // ── deal damage ───────────────────────────────────────────────────────────
  const dealDamage = useCallback((amount) => {
    setEnemyHp((prev) => {
      const next = prev - amount;
      if (next <= 0) {
        const reward = Math.floor(
          enemyRef.current.goldReward *
            goldMultRef.current *
            rebirthMultRef.current *
            artGoldMultRef.current
        );
        setGold((g) => g + reward);

        setKillCount((k) => {
          const newK = k + 1;
          const isBossKill = newK % 10 === 0; // every 10th kill advances zone

          if (isBossKill) {
            const nz = zoneRef.current + 1;
            setZone(nz);
            zoneRef.current = nz;
            spawnEnemy(nz);

            // Chest drop system:
            // - 10% chance to get a chest on boss milestone kills
            // - chest contains: (a) hero unlock from acquisition.kind === "chest" or (b) loot items
            if (Math.random() < 0.1) {
              // pick chest type based on zone/enemy flavor; kept simple for now
              const chestZone = zoneRef.current;

              // decide hero vs loot
              const chestHeroes = HEROES.filter(h => h.acquisition?.kind === "chest");
              const willDropHero = chestHeroes.length > 0 && Math.random() < Math.min(0.35, 0.12 + chestZone * 0.002);

              if (willDropHero) {
                const hero = chestHeroes[Math.floor(Math.random() * chestHeroes.length)];
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
            spawnEnemy(zoneRef.current);
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
    setFloats(f => [...f, { id, x, y, value: effectiveDmg, color: isBerserk ? "#ff8800" : "#ff4444" }]);
    setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 900);
    setShake(true);
    setTimeout(() => setShake(false), 150);
    dealDamage(effectiveDmg);
  };

  // ── idle DPS tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (idleDpsRef.current > 0) dealDamage(idleDpsRef.current / 10);
    }, 100);
    return () => clearInterval(t);
  }, [dealDamage]);

  // ── companion tick (every 500ms) ──────────────────────────────────────────
  const companionLevelsRefForTick = useRef(companionLevels);
  companionLevelsRefForTick.current = companionLevels;

  useEffect(() => {
    const t = setInterval(() => {
      const dmg = computeCompanionTickDmg(companionLevelsRefForTick.current, artSynergyRef.current, effectiveDmgRef.current) * rebirthMultRef.current * pathDpsMultRef.current;
      if (dmg > 0) dealDamage(dmg);
    }, 500);
    return () => clearInterval(t);
  }, [dealDamage]);

  // ── weak point spawner — every 2.5s, up to 2/3 active hotspots ──────────
  useEffect(() => {
    const t = setInterval(() => {
      setWeakPoints(prev => {
        if (prev.length >= maxWpRef.current) return prev;
        const id = wpIdRef.current++;
        const x = 12 + Math.random() * 76;
        const y = 12 + Math.random() * 55;
        setTimeout(() => setWeakPoints(p => p.filter(w => w.id !== id)), 1500);
        return [...prev, { id, x, y }];
      });
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // ── chronicle trigger — fires once per threshold, skips on initial save-load ──
  useEffect(() => {
    if (!saveLoadedRef.current) return; // suppress on restore
    const entry = CHRONICLES.find(c => c.zone === zone);
    if (!entry) return;
    if (seenChroniclesRef.current.includes(zone)) return;
    setSeenChronicles((prev) => [...prev, zone]);
    setActiveChronicle(entry);
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── story popup trigger — based on STORY_EVENTS, once per zone ──
  useEffect(() => {
    if (!saveLoadedRef.current) return;
    const ev = STORY_EVENTS.find((e) => e.zone === zone);
    if (!ev) return;
    if (seenStoryZonesRef.current.includes(zone)) return;
    setSeenStoryZones((prev) => {
      const next = [...prev, zone];
      seenStoryZonesRef.current = next;
      return next;
    });
    setStoryPopup(ev);
  }, [zone]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── buy hero ──────────────────────────────────────────────────────────────
  const buyHero = (hero) => {
    const level = heroLevels[hero.id] || 0;
    const cost  = heroCost(hero, level);
    if (gold < cost) return;

    const acquisitionKind = hero.acquisition?.kind || "shop";

    // Chest / real-money heroes cannot be bought via gold.
    // (They become available when found via chests/real-money grants.)
    if (level === 0 && (acquisitionKind === "chest" || acquisitionKind === "realmoney")) return;

    setGold(g => g - cost);

    const newLevel = level + 1;
    setHeroLevels(prev => ({ ...prev, [hero.id]: newLevel }));

    // Check for milestone crossing
    const ms = HERO_MILESTONES.find(m => m.level === newLevel);
    if (ms) {
      setMilestoneToast({ hero, level: newLevel, mult: ms.label });
      setTimeout(() => setMilestoneToast(null), 3000);
    }
  };

  // ── buy companion ─────────────────────────────────────────────────────────
  const buyCompanion = (comp) => {
    const level = companionLevels[comp.id] || 0;
    const cost  = companionCost(comp, level);
    if (gold < cost) return;
    setGold(g => g - cost);
    setCompanionLevels(prev => ({ ...prev, [comp.id]: (prev[comp.id] || 0) + 1 }));
  };

  // ── buy upgrade ───────────────────────────────────────────────────────────
  const buyUpgrade = (upg) => {
    if (gold < upg.cost || boughtUpgrades.includes(upg.id)) return;
    setGold(g => g - upg.cost);
    setBoughtUpgrades(prev => [...prev, upg.id]);
    if (upg.type === "click") setClickDmg(d => d + upg.value);
  };

  // ── use ability ───────────────────────────────────────────────────────────
  const useAbility = (ab) => {
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

  // ── equip / unequip loot ──────────────────────────────────────────────────
  const toggleEquip = (itemId) => {
    setLootItems(prev => prev.map(it => it.id === itemId ? { ...it, equipped: !it.equipped } : it));
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
      // If already unlocked, convert to loot as consolation
      setHeroLevels(prev => {
        const current = prev[heroId] || 0;
        if (current > 0) return prev;
        return { ...prev, [heroId]: 1 };
      });
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
      const dust = Math.max(1, Math.floor(item.bonus / 5));
      setVoidDust(d => d + dust);
      return prev.filter(i => i.id !== itemId);
    });
  };

  // ── reforge item → spend Void Dust for +bonus% ────────────────────────────
  const reforgeItem = (itemId, amount, cost) => {
    if (voidDust < cost) return;
    setVoidDust(d => d - cost);
    setLootItems(prev => prev.map(i => i.id === itemId ? { ...i, bonus: i.bonus + amount } : i));
  };

  // ── weak point crit click ─────────────────────────────────────────────────
  const handleWeakPointClick = (e, wp) => {
    e.stopPropagation();
    const critMult = commanderPath === "void_mage" ? 4 : 3;
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
    setRebirthCount(c => c + 1);
    setSoulCrystals(c => c + 1);
    setGold(0);
    setHeroLevels({});
    setCompanionLevels({});
    setBoughtUpgrades([]);
    setClickDmg(1);
    setKillCount(0);
    setZone(1);
    zoneRef.current = 1;
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
  const companionDps = computeCompanionTickDmg(companionLevels, artBonuses.synergyPct, effectiveDmg) * 2 * rebirthMult * pathDpsMult;
  const activePath = COMMANDER_PATHS.find(p => p.id === commanderPath) || null;

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
      </header>

      {/* ABILITY BAR */}
      <div style={S.abilityBar}>
        {ABILITIES.map(ab => {
          const st     = abilityState[ab.id];
          const active = now < st.activeUntil;
          const onCd   = now < st.cdUntil && !active;
          const cdSec  = onCd   ? Math.ceil((st.cdUntil - now) / 1000) : 0;
          const actSec = active ? Math.ceil((st.activeUntil - now) / 1000) : 0;
          return (
            <button key={ab.id} style={{ ...S.abilityBtn, borderColor: active ? ab.color : onCd ? "#2a2010" : ab.color + "88", background: active ? ab.color + "22" : "#110d08", opacity: onCd ? 0.5 : 1 }} onClick={() => useAbility(ab)} disabled={onCd}>
              <span style={S.abilityEmoji}>{ab.emoji}</span>
              <span style={S.abilityName}>{ab.name}</span>
              <span style={{ ...S.abilityTimer, color: active ? ab.color : "#6a5a3a" }}>
                {active ? `${actSec}s` : onCd ? `${cdSec}s` : ab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      <div style={S.content}>

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
            {/* Region header */}
            {(() => { const r = getCurrentRegion(zone); return (
              <div style={{ ...S.regionHeader, borderColor: r.accent + "88" }}>
                <span style={S.regionEmoji}>{r.emoji}</span>
                <div>
                  <div style={{ ...S.regionName, color: r.accent }}>{r.name}</div>
                  <div style={S.zoneLabel}>Zone {zone} · {currentEnemy.name} Territory</div>
                </div>
              </div>
            ); })()}

            <div
              data-enemycard
              style={{
                ...S.enemyCard,
                backgroundImage: `url(${currentWorld.bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              onClick={handleClick}
              className={shake ? "shake" : ""}
            >
              {currentBoss ? (
                <>
                  <div style={{ fontSize: 10, color: "#44cc88", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                    BOSS FIGHT
                  </div>
                  <img
                    key={currentBoss.image}
                    src={currentBoss.image}
                    alt={currentBoss.name}
                    className={`enemy-sprite ${currentBoss.zone === 10 ? "dragonHover" : "float"}`}
                    style={{ marginBottom: 8 }}
                    onError={(e) => { e.currentTarget.hidden = true; const fb = e.currentTarget.nextSibling; if (fb) fb.hidden = false; }}
                  />
                  <div hidden className="enemy-idle" style={{ ...S.enemyEmoji, marginBottom: 8 }}>👑</div>
                  <div style={S.enemyName}>{currentBoss.name}</div>
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

              <div style={S.hpBar}><div style={{ ...S.hpFill, width: `${hpPct}%` }} /></div>
              <div style={S.hpText}>{fmt(enemyHp)} / {fmt(currentEnemy.maxHp)}</div>
              {(isBerserk || isBattleCry || isGoldRush) && (
                <div style={S.activeBadges}>
                  {isBerserk   && <span style={{ ...S.badge, background: "#cc220033", color: "#ff6644" }}>💢 BERSERK</span>}
                  {isBattleCry && <span style={{ ...S.badge, background: "#f5c51833", color: "#f5c518" }}>📯 BATTLE CRY</span>}
                  {isGoldRush  && <span style={{ ...S.badge, background: "#44cc8833", color: "#44cc88" }}>✨ GOLD RUSH</span>}
                </div>
              )}
              <div style={S.tapHint}>Tap to attack · {fmt(effectiveDmg)} dmg</div>


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

            <div style={S.rewardRow}>
              <span style={S.dim}>🪙 {fmt(currentEnemy.goldReward)}{isGoldRush ? " ×2" : ""}</span>
              <span style={S.dim}>⚡ {fmt(idleDps + companionDps)} DPS</span>
            </div>

            {/* Zone progress */}
            <div style={S.zoneProgressWrap}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={S.dim}>Zone progress</span>
                <span style={S.dim}>{killCount % 10} / 10</span>
              </div>
              <div style={S.zonePrgBar}>
                <div style={{ ...S.zonePrgFill, width: `${(killCount % 10) * 10}%` }} />
              </div>
            </div>

            {/* Region description + story lore */}
            {(() => { const r = getCurrentRegion(zone); return (
              <div style={{ ...S.loreCard, borderColor: r.accent + "55" }}>
                <div style={{ ...S.loreZone, color: r.accent + "cc" }}>{r.emoji} {r.name.toUpperCase()}</div>
                <div style={{ ...S.loreText, marginBottom: 10 }}>{r.desc}</div>
                <div style={{ ...S.loreZone, marginTop: 6 }}>— Chronicle —</div>
                <div style={S.loreText}>"{currentLore.text}"</div>
              </div>
            ); })()}
          </div>
        )}

        {/* ── COMPANIONS ── */}
        {tab === "companions" && (
          <div style={S.shopView}>
            <div style={S.storyBanner}>
              <div style={S.storyTitle}>☀️ The Eternal Eclipse</div>
              <div style={S.storyBody}>
                The world has been plunged into an endless eclipse by the Lich King. Time itself is fractured. As the Eternal Commander, you rally fallen heroes through multiple lifetimes — each Rebirth a new dawn against the darkness.
              </div>
            </div>

            <div style={S.sectionLabel}>Your Companions</div>
            {COMPANIONS.map(comp => {
              const level    = companionLevels[comp.id] || 0;
              const cost     = companionCost(comp, level);
              const canAfford = gold >= cost;
              const hired    = level > 0;
              const dps      = hired ? (comp.baseDmg * level * (1000 / comp.interval) * rebirthMult * pathDpsMult).toFixed(1) : null;
              return (
                <div key={comp.id} style={{ ...S.companionCard, borderColor: hired ? "#3a2d1a" : "#1e1810" }}>
                  <div style={S.companionTop}>
                    <span style={S.companionEmoji}>{comp.emoji}</span>
                    <div style={S.companionInfo}>
                      <div style={S.companionName}>
                        {comp.name}
                        {hired && <span style={S.lvlBadge}>Lv {level}</span>}
                      </div>
                      <div style={S.companionTitle}>{comp.title}</div>
                      {hired && <div style={S.companionDps}>⚡ {fmt(dps)} DPS</div>}
                    </div>
                  </div>
                  <div style={S.companionLore}>"{comp.lore}"</div>
                  <button
                    style={{ ...S.companionBtn, ...(canAfford ? S.companionBtnActive : S.companionBtnDisabled) }}
                    onClick={() => buyCompanion(comp)}
                    disabled={!canAfford}
                  >
                    {hired ? `Lvl Up · 🪙${fmt(cost)}` : `Recruit · 🪙${fmt(cost)}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SHOP ── */}
        {tab === "shop" && (
          <div style={S.shopView}>
            <div style={S.sectionLabel}>Idle Heroes</div>
            {HEROES.map(hero => {
              const level        = heroLevels[hero.id] || 0;
              const cost         = heroCost(hero, level);
              const canAfford    = gold >= cost;
              const acqKind      = hero.acquisition?.kind || "shop";
              const isGoldBuyable = acqKind === "start" || acqKind === "shop";
              const isLocked     = level === 0 && !isGoldBuyable;
              const btnStyle     = isLocked
                ? S.shopBtnDisabled
                : canAfford ? S.shopBtnActive : S.shopBtnDisabled;
              return (
                <button key={hero.id}
                  style={{ ...S.shopBtn, ...btnStyle, ...(isLocked ? { opacity: 0.55 } : {}) }}
                  onClick={() => buyHero(hero)}
                  disabled={isLocked || (!canAfford && !isLocked)}
                >
                  <span style={S.shopEmoji}>{hero.emoji}</span>
                  <div style={S.shopInfo}>
                    <span style={S.shopName}>{hero.name}{level > 0 && <span style={S.lvlBadge}>Lv {level}</span>}</span>
                    <span style={S.shopSub}>{fmt(hero.baseDps)} DPS base</span>
                    <span style={S.heroLore}>{hero.lore}</span>
                  </div>
                  {isLocked
                    ? <span style={{ ...S.shopCost, fontSize: 10, color: "#8a6a3a", textAlign: "right", whiteSpace: "normal", maxWidth: 60 }}>{ACQ_EMOJI[acqKind]}<br/>{ACQ_LABEL[acqKind]}</span>
                    : <span style={{ ...S.shopCost, color: canAfford ? "#f5c518" : "#666" }}>🪙{fmt(cost)}</span>}
                </button>
              );
            })}

            <div style={{ ...S.sectionLabel, marginTop: 12 }}>Upgrades</div>
            {UPGRADES.map(upg => {
              const bought    = boughtUpgrades.includes(upg.id);
              const canAfford = !bought && gold >= upg.cost;
              return (
                <button key={upg.id} style={{ ...S.shopBtn, ...(bought ? S.shopBtnBought : canAfford ? S.shopBtnActive : S.shopBtnDisabled) }} onClick={() => buyUpgrade(upg)} disabled={bought || !canAfford}>
                  <span style={S.shopEmoji}>{bought ? "✅" : "🔮"}</span>
                  <div style={S.shopInfo}>
                    <span style={S.shopName}>{upg.name}</span>
                    <span style={S.shopSub}>{upg.desc}</span>
                  </div>
                  {bought
                    ? <span style={{ ...S.shopCost, color: "#444" }}>Owned</span>
                    : <span style={{ ...S.shopCost, color: canAfford ? "#f5c518" : "#666" }}>🪙{fmt(upg.cost)}</span>}
                </button>
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

            {HEROES.map((hero, i) => {
              const rarity = i < 2 ? "Common" : i < 4 ? "Rare" : i < 6 ? "Epic" : "Legendary";
              const rarityColor = rarity === "Common" ? "#6a5a3a" : rarity === "Rare" ? "#3a6a90" : rarity === "Epic" ? "#8844cc" : "#f5c518";

              const level = heroLevels[hero.id] || 0;
              const unlocked = level > 0;
              const acquisitionKind = hero.acquisition?.kind || "shop";
              const pDesc = passiveDesc(hero.passive);

              return (
                <div key={hero.id} style={{ ...S.heroCollectionCard, borderColor: unlocked ? rarityColor + "88" : "#1e1810" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{hero.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: "bold", color: unlocked ? "#e8dcc8" : "#6a5a3a" }}>
                          {hero.name}
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, border: `1px solid ${rarityColor}44`, color: rarityColor }}>
                          {rarity}
                        </span>
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
                {lootItems.length === 0
                  ? <div style={{ fontSize: 12, color: "#4a3a2a", fontStyle: "italic" }}>No loot yet. Defeat zone bosses for a 10% drop chance.</div>
                  : lootItems.map(item => {
                    const scrapYield = Math.max(1, Math.floor(item.bonus / 5));
                    return (
                      <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid #1e1810" }}>
                        {/* Top row: icon + name + equip */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                          <span style={{ fontSize: 22 }}>{item.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: "bold", color: item.equipped ? "#f5c518" : "#8a7a5a" }}>{item.name}</div>
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
              <div style={S.rebirthNextBonus}>Next rebirth: ×{(1 + (rebirthCount + 1) * 0.5).toFixed(1)} bonus + 💎1 Soul Crystal</div>
              {zone >= 50
                ? <button style={S.rebirthBtn} onClick={() => setRebirthConfirm(true)}>🔁 Rebirth Now</button>
                : <div style={S.rebirthLocked}>🔒 Reach Zone 50 to unlock · Zone {zone}/50</div>}
            </div>
          </div>
        )}

      </div>

      {/* NAV */}
      <nav style={S.nav}>
        {[
          { id: "battle",     emoji: "⚔️",  label: "Battle"    },
          { id: "companions", emoji: "👥",  label: "Allies"    },
          { id: "shop",       emoji: "🏪",  label: "Shop"      },
          { id: "collection",emoji: "🃏",  label: "Collection" },
          { id: "stats",      emoji: "📊",  label: "Stats"     },
        ].map(t => (
          <button key={t.id} style={{ ...S.navBtn, ...(tab === t.id ? S.navBtnActive : {}) }} onClick={() => setTab(t.id)}>
            <span style={S.navEmoji}>{t.emoji}</span>
            <span style={S.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

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
                  ? "A hero contract was sealed into the chest. Will you claim it?"
                  : "Inside the chest, multiple loot fragments flicker with eclipse-energy."}
              </div>
            ) : (
              <div style={S.modalBody}>A rare item fallen from the eclipse-touched boss.</div>
            )}

            {lootModal.chest && lootModal.chestKind === "loot" ? (
              <div style={{ marginTop: -6, marginBottom: 14 }}>
                {(lootModal.items || []).map((it, idx) => (
                  <div
                    key={it.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 12,
                      color: "#8a7a5a",
                      padding: "4px 0",
                      borderBottom: "1px solid #1e1810",
                    }}
                  >
                    <span>
                      {it.emoji} {it.name}
                    </span>
                    <span style={{ color: "#f5c518" }}>+{it.bonus}%</span>
                  </div>
                ))}
              </div>
            ) : !lootModal.chest ? (
              <div style={{ ...S.modalGold, fontSize: 22, color: "#44cc88" }}>+{lootModal.bonus}% {lootModal.label}</div>
            ) : (
              <div style={{ ...S.modalGold, fontSize: 22, color: "#44cc88" }}>Hero Unlocked</div>
            )}

            <button
              style={S.modalBtn}
              onClick={async () => {
                if (lootModal.chest) {
                  const ok = await watchAd();
                  if (!ok) return;
                  claimLoot();
                  return;
                }
                claimLoot();
              }}
            >
              {lootModal.chest ? "🎁 Watch Ad to Open" : "⚔ Equip & Claim"}
            </button>

            <button
              style={{ ...S.modalBtn, marginTop: 8, background: "#1e1810", border: "1px solid #3a2d1a", color: "#6a5a3a" }}
              onClick={() => {
                // For chest hero/loot, always claim immediately (ads-required behavior can be added later).
                // Keeping this button for consistent UX; it just closes modal.
                setLootModal(null);
              }}
            >
              {lootModal.chest ? "Skip" : "Store in Bag"}
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

  battleView: { display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 16px", gap: 12 },
  zoneLabel: { fontSize: 11, color: "#8a7a5a", letterSpacing: 2, textTransform: "uppercase" },
  enemyCard: { position: "relative", background: "linear-gradient(145deg,#1a1108,#110d05)", border: "2px solid #3a2d1a", borderRadius: 16, padding: "24px 40px", cursor: "pointer", userSelect: "none", textAlign: "center", width: "100%", boxSizing: "border-box", boxShadow: "0 0 40px #00000088,inset 0 0 40px #00000044", display: "flex", flexDirection: "column", alignItems: "center" },
  enemyEmoji: { fontSize: 68, display: "block", marginBottom: 8 },
  enemyName:  { fontSize: 20, fontWeight: "bold", color: "#f5c518", marginBottom: 12, width: "100%", textAlign: "center" },
  hpBar: { height: 10, background: "#1e1710", borderRadius: 5, border: "1px solid #3a2d1a", overflow: "hidden", marginBottom: 5, width: "100%" },
  hpFill: { height: "100%", background: "linear-gradient(90deg,#8b0000,#cc2200)", borderRadius: 5, transition: "width 0.1s linear" },
  hpText: { fontSize: 11, color: "#8a7a5a", marginBottom: 8, width: "100%", textAlign: "center" },
  tapHint: { fontSize: 10, color: "#4a3a2a", letterSpacing: 1, width: "100%", textAlign: "center" },
  activeBadges: { display: "flex", gap: 4, justifyContent: "center", marginBottom: 8, flexWrap: "wrap", width: "100%" },
  badge: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, padding: "2px 6px", borderRadius: 4 },
  rewardRow: { display: "flex", justifyContent: "space-between", width: "100%", fontSize: 12 },
  zoneProgressWrap: { width: "100%" },
  zonePrgBar: { height: 8, background: "#1e1710", borderRadius: 4, border: "1px solid #2a2010", overflow: "hidden" },
  zonePrgFill: { height: "100%", background: "linear-gradient(90deg,#3a7a20,#6acc30)", borderRadius: 4, transition: "width 0.3s ease" },

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
`;
