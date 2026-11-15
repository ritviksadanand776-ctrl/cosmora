import React from 'react';
import { ArrowLeft, ArrowRight, Check, Coins, Lock, ShoppingBag, Sparkles, Wrench } from 'lucide-react';
import {
  BoosterStyle,
  CATALOG_ITEMS,
  DESTINATIONS,
  DestinationId,
  FairingStyle,
  LanderFinish,
  PlumeStyle,
  SpacecraftConfig,
} from '../types/mission';

interface LevelsScreenProps {
  selectedId: DestinationId;
  credits: number;
  unlockedIds: string[];
  onSelect: (id: DestinationId) => void;
  onContinueToBuilder: () => void;
  onOpenShop: () => void;
  onBack: () => void;
}

export const LevelsScreen: React.FC<LevelsScreenProps> = ({
  selectedId,
  credits,
  unlockedIds,
  onSelect,
  onContinueToBuilder,
  onOpenShop,
  onBack,
}) => {
  const orderedIds: DestinationId[] = ['moon', 'mars', 'mercury', 'venus', 'titan', 'europa'];
  const activeDest = DESTINATIONS[selectedId];
  const rareRewardItem = CATALOG_ITEMS.find((i) => i.id === activeDest.rareSample.unlocksItemId);
  const rareUnlocked = rareRewardItem ? unlockedIds.includes(rareRewardItem.id) : false;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 max-w-6xl w-full mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070d1a]/90 border border-slate-700/70 text-xs font-medium text-slate-200 hover:border-slate-500 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070d1a]/90 border border-amber-500/40 text-xs font-mono-tabular font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            <span>${credits.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={onOpenShop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-xs font-medium text-sky-200 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Parts Shop</span>
          </button>
          <div className="hidden md:block text-right">
            <div className="font-display text-lg font-bold text-white leading-tight">
              Select Planetary Mission
            </div>
            <div className="text-[11px] text-slate-400">
              NASA altimetry terrain · Rare Sample Part Unlocks
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl w-full mx-auto my-2 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Destination Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {orderedIds.map((id) => {
            const d = DESTINATIONS[id];
            const isSelected = id === selectedId;
            const dRareUnlocked = d.rareSample.unlocksItemId
              ? unlockedIds.includes(d.rareSample.unlocksItemId)
              : false;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0b1529]/95 border-amber-400/80 shadow-lg'
                    : 'bg-[#070d1a]/88 border-slate-700/60 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: d.planetColorHex }}
                    />
                    <span className="font-display text-base font-bold text-white">{d.name}</span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    {d.difficulty}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-300 truncate">{d.subtitle}</div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                  <span className="text-slate-400">
                    {d.gravityMps2.toFixed(2)} m/s² · {d.distanceLabel}
                  </span>
                  <span className={dRareUnlocked ? 'text-emerald-400' : 'text-purple-300'}>
                    {dRareUnlocked ? 'Relic Found' : 'Rare Relic'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Planet NASA Briefing Panel */}
        <div className="lg:col-span-5 bg-[#070d1a]/92 border border-slate-700/65 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-wider text-amber-400">
              Target Dossier
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">{activeDest.name}</h2>
            <p className="text-xs text-slate-400">{activeDest.subtitle}</p>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-xs border-t border-b border-slate-800 py-2.5">
              <div>
                <div className="text-slate-400">Surface Gravity</div>
                <div className="font-mono-tabular font-semibold text-white">
                  {activeDest.gravityMps2.toFixed(2)} m/s²
                </div>
              </div>
              <div>
                <div className="text-slate-400">Target Orbit</div>
                <div className="font-mono-tabular font-semibold text-sky-300">
                  {activeDest.orbitTargetKm} km
                </div>
              </div>
              <div>
                <div className="text-slate-400">Temperature</div>
                <div className="font-mono-tabular font-semibold text-slate-200">
                  {activeDest.surfaceTemp}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Atmosphere</div>
                <div className="font-mono-tabular font-semibold text-slate-200 truncate">
                  {activeDest.atmosphereLabel}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed">{activeDest.nasaSummary}</p>

            <div className="mt-3.5">
              <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1.5">
                Rover Science Objectives ({activeDest.samples.length})
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {activeDest.samples.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span className="truncate">{s.title}</span>
                    <span className="font-mono-tabular text-[11px] text-amber-300 shrink-0 ml-2">
                      +${s.creditReward}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {rareRewardItem && (
              <div className="mt-3 p-2.5 rounded-lg bg-purple-950/35 border border-purple-500/40 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rare Sample Search Unlock</span>
                  </span>
                  <span
                    className={`font-mono-tabular text-[10px] font-bold ${
                      rareUnlocked ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {rareUnlocked ? 'UNLOCKED' : `+$${activeDest.rareSample.creditReward}`}
                  </span>
                </div>
                <div className="mt-1 text-slate-200 font-medium">
                  {activeDest.rareSample.title} →{' '}
                  <span className="text-sky-300">{rareRewardItem.label}</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onContinueToBuilder}
            className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Build Spacecraft for {activeDest.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto text-xs font-mono-tabular text-slate-400">
        Mission Flow: Select Planet · Build Spacecraft · Rollout · Ascent (Free Cam) · Earth Orbit · Transit · Safe Landing · Rare Sample Search
      </div>
    </div>
  );
};

interface SpacecraftBuilderUIProps {
  destinationId: DestinationId;
  config: SpacecraftConfig;
  credits: number;
  unlockedIds: string[];
  onChange: (next: SpacecraftConfig) => void;
  onOpenShop: () => void;
  onRollout: () => void;
  onBack: () => void;
}

export const SpacecraftBuilderUI: React.FC<SpacecraftBuilderUIProps> = ({
  destinationId,
  config,
  credits,
  unlockedIds,
  onChange,
  onOpenShop,
  onRollout,
  onBack,
}) => {
  const dest = DESTINATIONS[destinationId];
  const twr =
    config.boosterStyle === 'heavy6'
      ? '3.95'
      : config.boosterStyle === 'quad'
        ? '3.45'
        : config.boosterStyle === 'twin'
          ? '3.05'
          : '2.35';
  const deltaV =
    config.boosterStyle === 'heavy6'
      ? '13,900'
      : config.boosterStyle === 'quad'
        ? '12,600'
        : config.boosterStyle === 'twin'
          ? '11,400'
          : '9,900';

  const hullItems = CATALOG_ITEMS.filter((i) => i.category === 'hull');
  const accentItems = CATALOG_ITEMS.filter((i) => i.category === 'accent');
  const boosterItems = CATALOG_ITEMS.filter((i) => i.category === 'booster');
  const fairingItems = CATALOG_ITEMS.filter((i) => i.category === 'fairing');
  const foilItems = CATALOG_ITEMS.filter((i) => i.category === 'foil');
  const plumeItems = CATALOG_ITEMS.filter((i) => i.category === 'plume');

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#070d1a]/90 border border-slate-700/65 rounded-lg px-4 py-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Levels</span>
          </button>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-display text-sm font-bold text-white">
            Vehicle Assembly Hangar
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-xs font-mono-tabular text-amber-400">Target: {dest.name}</span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070d1a]/90 border border-amber-500/40 text-xs font-mono-tabular font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            <span>${credits.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={onOpenShop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-xs font-semibold text-sky-200 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Parts Shop</span>
          </button>
          <div className="hidden lg:block text-xs font-mono-tabular text-slate-300 bg-[#070d1a]/88 border border-slate-700/65 rounded-lg px-3.5 py-1.5">
            Drag or WASD to roam warehouse · Scroll to zoom
          </div>
        </div>
      </div>

      {/* Left Compact Customizer Panel */}
      <div className="pointer-events-auto w-full max-w-[332px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl p-3.5 shadow-2xl space-y-2.5 my-auto max-h-[82vh] overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
              Hull Primary Coat
            </label>
            <button
              type="button"
              onClick={onOpenShop}
              className="text-[10px] font-mono-tabular text-sky-300 hover:underline cursor-pointer"
            >
              Buy More
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {hullItems.map((c) => {
              const unlocked = unlockedIds.includes(c.id);
              const active = config.hullColor === c.value;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={unlocked ? c.label : `${c.label} (Locked — Open Shop)`}
                  onClick={() => (unlocked ? onChange({ ...config, hullColor: c.value }) : onOpenShop())}
                  className={`relative w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer ${
                    active
                      ? 'border-white scale-110'
                      : unlocked
                        ? 'border-slate-600 opacity-85 hover:opacity-100'
                        : 'border-slate-700 opacity-45 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: c.swatchHex }}
                >
                  {active && <Check className="w-3.5 h-3.5 text-slate-950 drop-shadow" />}
                  {!unlocked && <Lock className="w-3 h-3 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Accent &amp; Rover Trim
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {accentItems.map((c) => {
              const unlocked = unlockedIds.includes(c.id);
              const active = config.accentColor === c.value;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={unlocked ? c.label : `${c.label} (Locked — Open Shop)`}
                  onClick={() => (unlocked ? onChange({ ...config, accentColor: c.value }) : onOpenShop())}
                  className={`relative w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer ${
                    active
                      ? 'border-white scale-110'
                      : unlocked
                        ? 'border-slate-600 opacity-85 hover:opacity-100'
                        : 'border-slate-700 opacity-45 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: c.swatchHex }}
                >
                  {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                  {!unlocked && <Lock className="w-3 h-3 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Strap-On Booster Array
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {boosterItems.map((b) => {
              const unlocked = unlockedIds.includes(b.id);
              const active = config.boosterStyle === (b.value as BoosterStyle);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    unlocked
                      ? onChange({ ...config, boosterStyle: b.value as BoosterStyle })
                      : onOpenShop()
                  }
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border flex items-center justify-between gap-1 cursor-pointer ${
                    active
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                      : unlocked
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <span className="truncate">{b.label}</span>
                  {!unlocked && <Lock className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Payload Fairing Profile
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {fairingItems.map((f) => {
              const unlocked = unlockedIds.includes(f.id);
              const active = config.fairingStyle === (f.value as FairingStyle);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    unlocked
                      ? onChange({ ...config, fairingStyle: f.value as FairingStyle })
                      : onOpenShop()
                  }
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border flex items-center justify-between gap-1 cursor-pointer ${
                    active
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                      : unlocked
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <span className="truncate">{f.label}</span>
                  {!unlocked && <Lock className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
              Lander Foil
            </label>
            <select
              value={config.landerFinish}
              onChange={(e) => {
                const val = e.target.value as LanderFinish;
                const item = foilItems.find((i) => i.value === val);
                if (item && !unlockedIds.includes(item.id)) {
                  onOpenShop();
                  return;
                }
                onChange({ ...config, landerFinish: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
            >
              {foilItems.map((f) => {
                const unlocked = unlockedIds.includes(f.id);
                return (
                  <option key={f.id} value={f.value}>
                    {unlocked ? f.label : `🔒 ${f.label}`}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
              Engine Plume
            </label>
            <select
              value={config.plumeStyle}
              onChange={(e) => {
                const val = e.target.value as PlumeStyle;
                const item = plumeItems.find((i) => i.value === val);
                if (item && !unlockedIds.includes(item.id)) {
                  onOpenShop();
                  return;
                }
                onChange({ ...config, plumeStyle: val });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
            >
              {plumeItems.map((p) => {
                const unlocked = unlockedIds.includes(p.id);
                return (
                  <option key={p.id} value={p.value}>
                    {unlocked ? p.label : `🔒 ${p.label}`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Liftoff TWR</div>
            <div className="font-mono-tabular font-semibold text-emerald-300">{twr} : 1</div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Total Delta-V</div>
            <div className="font-mono-tabular font-semibold text-sky-300">{deltaV} m/s</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRollout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide transition-colors cursor-pointer"
        >
          <span>Roll Out to Launchpad</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div />
    </div>
  );
};
