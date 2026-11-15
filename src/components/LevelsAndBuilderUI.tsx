import React from 'react';
import { ArrowLeft, ArrowRight, Check, Wrench } from 'lucide-react';
import {
  BoosterStyle,
  DESTINATIONS,
  DestinationId,
  FairingStyle,
  LanderFinish,
  PlumeStyle,
  SpacecraftConfig,
} from '../types/mission';

interface LevelsScreenProps {
  selectedId: DestinationId;
  onSelect: (id: DestinationId) => void;
  onContinueToBuilder: () => void;
  onBack: () => void;
}

export const LevelsScreen: React.FC<LevelsScreenProps> = ({
  selectedId,
  onSelect,
  onContinueToBuilder,
  onBack,
}) => {
  const orderedIds: DestinationId[] = ['moon', 'mars', 'mercury', 'venus', 'titan', 'europa'];
  const activeDest = DESTINATIONS[selectedId];

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
        <div className="text-right">
          <div className="font-display text-lg md:text-xl font-bold text-white">
            Select Planetary Mission
          </div>
          <div className="text-[11px] text-slate-400">
            Surfaces modeled from NASA orbital altimetry and lander telemetry
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
                <div className="mt-3 flex items-center gap-3 text-[11px] font-mono-tabular text-slate-400">
                  <span>{d.gravityMps2.toFixed(2)} m/s²</span>
                  <span aria-hidden="true">·</span>
                  <span>{d.distanceLabel}</span>
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

            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs border-t border-b border-slate-800 py-3">
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

            <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">
              {activeDest.nasaSummary}
            </p>

            <div className="mt-4">
              <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1.5">
                Rover Science Objectives ({activeDest.samples.length})
              </div>
              <ul className="space-y-1 text-xs text-slate-300">
                {activeDest.samples.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span className="truncate">{s.title}</span>
                    <span className="font-mono-tabular text-[11px] text-amber-300 shrink-0 ml-2">
                      +{s.points} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueToBuilder}
            className="mt-5 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>Build Spacecraft for {activeDest.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto text-xs font-mono-tabular text-slate-400">
        Mission Flow: Select Planet · Build Spacecraft · Warehouse Rollout · Earth Orbit · Transit · Landing · Rover
      </div>
    </div>
  );
};

interface SpacecraftBuilderUIProps {
  destinationId: DestinationId;
  config: SpacecraftConfig;
  onChange: (next: SpacecraftConfig) => void;
  onRollout: () => void;
  onBack: () => void;
}

const HULL_COLORS = [
  { label: 'Aerospace White', hex: '#eef2f6' },
  { label: 'Stealth Graphite', hex: '#334155' },
  { label: 'Cobalt Navy', hex: '#1e3a8a' },
  { label: 'Mars Crimson', hex: '#991b1b' },
  { label: 'Titanium Silver', hex: '#94a3b8' },
  { label: 'Solar Gold', hex: '#ca8a04' },
];

const ACCENT_COLORS = [
  { label: 'Launch Amber', hex: '#ea580c' },
  { label: 'Telemetry Cyan', hex: '#0284c7' },
  { label: 'Signal Emerald', hex: '#10b981' },
  { label: 'Solar Yellow', hex: '#eab308' },
  { label: 'Crimson Red', hex: '#ef4444' },
];

export const SpacecraftBuilderUI: React.FC<SpacecraftBuilderUIProps> = ({
  destinationId,
  config,
  onChange,
  onRollout,
  onBack,
}) => {
  const dest = DESTINATIONS[destinationId];
  const twr = config.boosterStyle === 'quad' ? '3.45' : config.boosterStyle === 'twin' ? '3.05' : '2.35';
  const deltaV = config.boosterStyle === 'quad' ? '12,600' : config.boosterStyle === 'twin' ? '11,400' : '9,900';

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

        <div className="pointer-events-auto hidden sm:block text-xs font-mono-tabular text-slate-300 bg-[#070d1a]/88 border border-slate-700/65 rounded-lg px-3.5 py-1.5">
          Drag or WASD to roam warehouse · Scroll to zoom
        </div>
      </div>

      {/* Left Compact Customizer Panel (fits 720p laptop screens while leaving 3D rocket unobstructed) */}
      <div className="pointer-events-auto w-full max-w-[308px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl p-3.5 shadow-2xl space-y-2.5 my-auto">
        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Hull Primary Color
          </label>
          <div className="flex items-center gap-2">
            {HULL_COLORS.map((c) => {
              const active = config.hullColor === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => onChange({ ...config, hullColor: c.hex })}
                  className={`w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer ${
                    active ? 'border-white scale-110' : 'border-slate-600 opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {active && <Check className="w-3.5 h-3.5 text-slate-950 drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Accent & Rover Chassis Color
          </label>
          <div className="flex items-center gap-2">
            {ACCENT_COLORS.map((c) => {
              const active = config.accentColor === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => onChange({ ...config, accentColor: c.hex })}
                  className={`w-7 h-7 rounded-md border flex items-center justify-center cursor-pointer ${
                    active ? 'border-white scale-110' : 'border-slate-600 opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Strap-On Booster Configuration
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['twin', 'quad', 'none'] as BoosterStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onChange({ ...config, boosterStyle: style })}
                className={`py-1.5 px-2 rounded text-xs font-medium border cursor-pointer ${
                  config.boosterStyle === style
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {style === 'twin' ? 'Twin S200' : style === 'quad' ? 'Quad Heavy' : 'Single Core'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
            Payload Fairing Profile
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['ogive', 'hammerhead', 'needle'] as FairingStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onChange({ ...config, fairingStyle: style })}
                className={`py-1.5 px-2 rounded text-xs font-medium border capitalize cursor-pointer ${
                  config.fairingStyle === style
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
              Lander Foil
            </label>
            <select
              value={config.landerFinish}
              onChange={(e) => onChange({ ...config, landerFinish: e.target.value as LanderFinish })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
            >
              <option value="gold">Gold MLI</option>
              <option value="silver">Silver Thermal</option>
              <option value="copper">Copper Kapton</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-1">
              Engine Plume
            </label>
            <select
              value={config.plumeStyle}
              onChange={(e) => onChange({ ...config, plumeStyle: e.target.value as PlumeStyle })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100"
            >
              <option value="amber">Amber Kerolox</option>
              <option value="cryo">Cyan Cryo</option>
              <option value="violet">Violet Plasma</option>
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
