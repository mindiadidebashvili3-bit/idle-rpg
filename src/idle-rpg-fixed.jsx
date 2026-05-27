import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  WORLDS, STORY_EVENTS, BOSSES, BOSS_ZONES,
  EXHAUSTION_DURATION, getEnemyKillWindow,
  ENEMIES, ENEMIES_BY_ZONE, HEROES, UPGRADES, HERO_MILESTONES,
  ACQ_LABEL, ACQ_EMOJI, ARTIFACT_UPGRADES,
  LOOT_PREFIXES, LOOT_TYPES, EQUIP_SLOTS, RARITIES,
  COMPANIONS, COMPANION_ABILITIES,
  ABILITIES, REBIRTH_MILESTONES, COMMANDER_PATHS,
  ZONE_LORE, REGIONS, CHRONICLES, ACHIEVEMENTS,
  SUFFIXES,
} from './gameData.js';
import {
  getHeroMilestoneMult, computeHeroPassiveBonuses, passiveDesc,
  getItemRarity, rollLootItem, getCompAbilityTier,
  computeAchievementBonuses, calcBulkHeroBuy, getCurrentRegion,
  fmt, getEnemyForZone, heroCost, companionCost, computeIdleDps,
  computeArtifactBonuses, computeLootBonuses, computeCompanionTickDmg,
  calcBulkCompanionBuy, getCurrentLore, getComboMult, getComboColor,
} from './gameHelpers.js';

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
  const idleDps         = baseIdleDps * (1 + lootBonuses.dpsMult + achBonuses.dpsMult) * (1 + heroPassives.dpsAdd) * dmgMult * rebirthMult * pathDpsMult * compBuffs.dpsMult;

  const rebirthGoldBonus = REBIRTH_MILESTONES
    .filter(m => m.type === "goldBonus" && rebirthCount >= m.count)
    .reduce((s, m) => s + m.value, 0);

  // Update computed multipliers now that derived values are available
  gsRef.current.goldMult    = isGoldRush ? 2 : 1;
  gsRef.current.rebirthMult = rebirthMult;
  gsRef.current.idleDps     = idleDps;
  gsRef.current.artGoldMult = (1 + artBonuses.goldMult + lootBonuses.gold + pathGoldBonus + heroPassives.goldMult + achBonuses.goldMult + rebirthGoldBonus) * compBuffs.goldMult;
  gsRef.current.effectiveDmg= effectiveDmg;
  gsRef.current.artSynergy  = artBonuses.synergyPct;
  gsRef.current.pathDpsMult = pathDpsMult;

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
          // Migrate old items: add slot + upgradeLevel if missing
          const migrated = sv.lootItems.map(item => {
            const withLevel = item.upgradeLevel !== undefined ? item : { ...item, upgradeLevel: 0 };
            if (withLevel.slot) return withLevel;
            const slotMap = { Sword: "weapon", Armor: "chest", Ring: "ring1", Amulet: "amulet", Helmet: "helmet", Gloves: "gloves", Boots: "boots" };
            return { ...withLevel, slot: slotMap[item.type] || item.type?.toLowerCase() || "weapon" };
          });
          setLootItems(migrated);
        }
        if (sv.voidDust        != null) setVoidDust(sv.voidDust);
        if (sv.commanderPath)          setCommanderPath(sv.commanderPath);
        if (sv.farmMode != null)       setFarmMode(sv.farmMode);
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

                    {/* Currently equipped item + upgrade */}
                    {equippedItem && (() => {
                      const rc = RARITIES[equippedItem.rarity || getItemRarity(equippedItem.bonus)] || RARITIES.Common;
                      const totalBonus = equippedItem.bonus + (equippedItem.upgradeLevel || 0);
                      return (
                        <div style={{ background: rc.color + "10", border: `1px solid ${rc.color}44`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 26 }}>{equippedItem.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: "bold", color: rc.color }}>{equippedItem.name}</span>
                                <RarityBadge rarity={equippedItem.rarity || getItemRarity(equippedItem.bonus)} />
                                {(equippedItem.upgradeLevel || 0) > 0 && (
                                  <span style={{ fontSize: 10, background: "#1a0a2a", color: "#c0a0ff", border: "1px solid #5a20aa", borderRadius: 4, padding: "1px 5px" }}>
                                    +{equippedItem.upgradeLevel} upgraded
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#8a7a5a" }}>+{totalBonus}% {equippedItem.label} · Zone {equippedItem.zone}</div>
                            </div>
                            <button
                              onClick={() => toggleEquip(equippedItem.id)}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #3a1a1a", background: "#180808", color: "#cc4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                              Unequip
                            </button>
                          </div>
                          {/* Upgrade with Void Dust */}
                          <div style={{ borderTop: `1px solid ${rc.color}22`, paddingTop: 8 }}>
                            <div style={{ fontSize: 9, color: "#8a6a9a", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>🌌 Upgrade with Void Dust</div>
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
                          return (
                            <div key={item.id} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4,
                              borderRadius: 8, border: `1px solid ${isEquipped ? rc.color + "66" : "#1e1810"}`,
                              background: isEquipped ? rc.color + "0d" : "#0a0908",
                              borderLeft: `3px solid ${rc.color}`,
                            }}>
                              <span style={{ fontSize: 20 }}>{item.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: "bold", color: isEquipped ? rc.color : "#8a7a5a" }}>{item.name}</div>
                                <div style={{ fontSize: 10, color: "#6a5a3a" }}>+{totalBonus}% {item.label} · Z{item.zone}</div>
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

              {/* ── UNSLOTTED / ALL LOOT ── */}
              {!selectedGearSlot && (
                <div style={{ background: "#0a0908", border: "1px solid #1e1810", borderRadius: 12, padding: "12px 10px" }}>
                  <div style={{ fontSize: 9, color: "#6a5a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                    📦 All Loot ({lootItems.length} items)
                  </div>
                  {lootItems.length === 0
                    ? <div style={{ fontSize: 11, color: "#3a2a1a", fontStyle: "italic" }}>Defeat zone bosses for a 10% chest drop chance.</div>
                    : [...lootItems].sort((a,b) => b.bonus - a.bonus).map(item => {
                        const itemRarity = item.rarity || getItemRarity(item.bonus);
                        const rc = RARITIES[itemRarity] || RARITIES.Common;
                        const isEquipped = item.equipped;
                        const totalBonus = item.bonus + (item.upgradeLevel || 0);
                        const slot = item.slot || (item.type === "Armor" ? "chest" : item.type?.toLowerCase());
                        const slotDef = EQUIP_SLOTS.find(s => s.id === slot || (s.id === "ring1" && slot === "ring1") || (s.id === "ring2" && slot === "ring2"));
                        return (
                          <div key={item.id} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", marginBottom: 4,
                            borderRadius: 8, border: `1px solid ${isEquipped ? rc.color + "55" : "#1e1810"}`,
                            background: isEquipped ? rc.color + "0a" : "transparent",
                            borderLeft: `3px solid ${isEquipped ? rc.color : "#2a2010"}`,
                          }}>
                            <span style={{ fontSize: 18 }}>{item.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: "bold", color: isEquipped ? rc.color : "#8a7a5a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.name} {(item.upgradeLevel||0) > 0 ? `(+${item.upgradeLevel})` : ""}
                              </div>
                              <div style={{ fontSize: 9, color: "#5a4a2a" }}>+{totalBonus}% {item.label} · {slotDef ? slotDef.label : slot}</div>
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

      </div>

      {/* NAV */}
      <nav style={S.nav}>
        {[
          { id: "battle",     emoji: "⚔️",  label: "Battle",  badge: 0 },
          { id: "gear",       emoji: "🎒",  label: "Gear",    badge: newLootCount },
          { id: "lore",       emoji: "🗺️",  label: "Map",     badge: 0 },
          { id: "companions", emoji: "👥",  label: "Allies",  badge: 0 },
          { id: "shop",       emoji: "🏪",  label: "City",    badge: 0 },
          { id: "stats",      emoji: "📊",  label: "Stats",   badge: newAchievementCount },
        ].map(t => (
          <button key={t.id}
            style={{ ...S.navBtn, ...(tab === t.id ? S.navBtnActive : {}), position: "relative", padding: "8px 0 10px" }}
            onClick={() => {
              setTab(t.id);
              if (t.id === "gear")  setNewLootCount(0);
              if (t.id === "stats") setNewAchievementCount(0);
            }}>
            <span style={{ ...S.navEmoji, fontSize: 16 }}>{t.emoji}</span>
            <span style={{ ...S.navLabel, fontSize: 8 }}>{t.label}</span>
            {t.badge > 0 && (
              <span style={{ position: "absolute", top: 5, right: "50%", transform: "translateX(10px)", minWidth: 14, height: 14, background: "#cc2200", borderRadius: 7, fontSize: 9, fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                {t.badge}
              </span>
            )}
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
`;
