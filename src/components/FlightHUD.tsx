import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  Compass,
  FastForward,
  Flame,
  Home,
  Layers,
  Microscope,
  Navigation,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SimControlInput } from './SpaceSimCanvas';
import {
  CameraMode,
  DESTINATIONS,
  DestinationId,
  FlightTelemetry,
  GameScreen,
  GameSettings,
  LandingTelemetry,
  MissionFailureState,
  RolloutTelemetry,
  RoverTelemetry,
  SpacecraftConfig,
  TransitTelemetry,
} from '../types/mission';

interface FlightHUDProps {
  screen: GameScreen;
  destinationId: DestinationId;
  spacecraftConfig: SpacecraftConfig;
  settings: GameSettings;
  cameraMode: CameraMode;
  credits: number;
  rewardBanner: string | null;
  missionFailure: MissionFailureState | null;
  flightTelemetry: FlightTelemetry;
  rolloutTelemetry: RolloutTelemetry;
  transitTelemetry: TransitTelemetry;
  landingTelemetry: LandingTelemetry;
  roverTelemetry: RoverTelemetry;
  onCameraModeChange: (mode: CameraMode) => void;
  onOpenSettings: () => void;
  onOpenShop: () => void;
  onToggleMute: () => void;
  onToggleAutoLand: () => void;
  onReturnLevels: () => void;
  onRetryMission: () => void;
  onMainMenu: () => void;
  onSkipRollout: () => void;
  onLaunch: () => void;
  onSeparateStage: () => void;
  onThrottleChange: (val: number) => void;
  onTogglePause: () => void;
  onResetPhase: () => void;
  onFireTransferBurn: () => void;
  onSkipTransit: () => void;
  onLandingThrottleChange: (val: number) => void;
  onCollectSample: () => void;
  onHoldControl: (key: keyof SimControlInput, active: boolean | number) => void;
}

function formatMissionTime(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  return `T+${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  screen,
  destinationId,
  spacecraftConfig,
  settings,
  cameraMode,
  credits,
  rewardBanner,
  missionFailure,
  flightTelemetry,
  rolloutTelemetry,
  transitTelemetry,
  landingTelemetry,
  roverTelemetry,
  onCameraModeChange,
  onOpenSettings,
  onOpenShop,
  onToggleMute,
  onToggleAutoLand,
  onReturnLevels,
  onRetryMission,
  onMainMenu,
  onSkipRollout,
  onLaunch,
  onSeparateStage,
  onThrottleChange,
  onTogglePause,
  onResetPhase,
  onFireTransferBurn,
  onSkipTransit,
  onLandingThrottleChange,
  onCollectSample,
  onHoldControl,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const dest = DESTINATIONS[destinationId];
  const cameraButtons: { id: CameraMode; label: string }[] = [
    { id: 'rear-chase', label: 'Rear Chase' },
    { id: 'booster-cam', label: 'Booster Cam' },
    { id: 'wide-ascent', label: 'Wide Ascent' },
    { id: 'free-orbit', label: 'Free Orbit' },
  ];

  // Keyboard shortcut H to collapse/expand bottom dock
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const phaseLabel =
    screen === 'rollout'
      ? 'PAD ROLLOUT'
      : screen === 'flight'
        ? flightTelemetry.atmosphereLayer
        : screen === 'earth-orbit'
          ? 'EARTH ORBIT'
          : screen === 'transit'
            ? 'TRANSIT'
            : screen === 'landing'
              ? 'DESCENT'
              : 'ROVER OPS';

  const allSamplesDone = roverTelemetry.samplesCollected.length >= dest.samples.length;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      {/* TOP BAR: Mission Ribbon (left) + Utility Actions (right) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Telemetry Ribbon */}
        <div className="pointer-events-auto bg-[#070d1a]/92 border border-slate-700/65 rounded-lg px-3.5 py-2 shadow-lg max-w-[620px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-display font-bold tracking-wider text-slate-100 whitespace-nowrap">
              COSMORA
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-semibold text-amber-400 whitespace-nowrap">{dest.name}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-tabular text-sky-300 whitespace-nowrap">{phaseLabel}</span>
            {screen === 'flight' && (
              <>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-300 whitespace-nowrap">
                  {formatMissionTime(flightTelemetry.missionElapsedSec)}
                </span>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-200 whitespace-nowrap">
                  Score {flightTelemetry.score.toLocaleString()}
                </span>
              </>
            )}
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono-tabular font-bold text-amber-300 whitespace-nowrap">
              <Coins className="w-3 h-3" />
              ${credits.toLocaleString()}
            </span>
            {screen === 'rover' && (
              <>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="font-mono-tabular text-emerald-300 whitespace-nowrap">
                  Samples {roverTelemetry.samplesCollected.length} / {dest.samples.length + 1}
                </span>
              </>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2.5 text-xs text-slate-400">
            <span className="font-medium text-slate-200 truncate">{spacecraftConfig.name}</span>
            <span className="text-slate-600" aria-hidden="true">/</span>
            <span className="truncate">
              {screen === 'flight' ? flightTelemetry.stageName : dest.subtitle}
            </span>
          </div>
        </div>

        {/* Top-Right Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {screen === 'landing' && (
            <button
              type="button"
              onClick={onToggleAutoLand}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.autoLandAssist
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : 'bg-[#070d1a]/92 border-slate-700/60 text-slate-300 hover:border-slate-500'
              }`}
            >
              {settings.autoLandAssist ? 'Auto-Land: On' : 'Auto-Land: Manual'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenShop}
            title="Spacecraft Parts Shop"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070d1a]/92 border border-sky-500/40 text-xs font-medium text-sky-200 hover:border-sky-400 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Shop</span>
          </button>

          <button
            type="button"
            onClick={onReturnLevels}
            title="Return to mission selection"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070d1a]/92 border border-slate-700/60 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Missions</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings"
            className="p-2 rounded-lg bg-[#070d1a]/92 border border-slate-700/60 text-slate-200 hover:border-slate-500 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 rounded-lg bg-[#070d1a]/92 border border-slate-700/60 text-slate-200 hover:border-slate-500 transition-colors cursor-pointer"
          >
            {settings.muted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-300" />
            )}
          </button>

          {screen === 'flight' && (
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={flightTelemetry.paused ? 'Resume flight' : 'Pause flight'}
              className="p-2 rounded-lg bg-[#070d1a]/92 border border-slate-700/60 text-slate-200 hover:border-slate-500 transition-colors cursor-pointer"
            >
              {flightTelemetry.paused ? (
                <Play className="w-4 h-4 text-emerald-400" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>
          )}

          {(screen === 'flight' || screen === 'landing' || screen === 'rover') && (
            <button
              type="button"
              onClick={onResetPhase}
              aria-label="Restart current phase"
              title="Restart current phase [R]"
              className="p-2 rounded-lg bg-[#070d1a]/92 border border-slate-700/60 text-slate-200 hover:border-amber-500/70 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CENTER-RIGHT FLOATING PROMPT FOR EARTH ORBIT -> FIRE LANDER TRANSFER BURN */}
      {screen === 'earth-orbit' && (
        <div className="pointer-events-auto self-end my-auto w-full max-w-sm bg-[#070d1a]/92 border border-sky-400/55 rounded-xl p-5 shadow-2xl">
          <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-sky-300">
            Parking Orbit Stabilized
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">
            Lander in Earth Orbit
          </h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Your custom {spacecraftConfig.name} lander is roaming safely above Earth&apos;s
            atmosphere. Fire the Trans-Planetary Injection engine to depart Earth orbit and
            intercept <span className="text-amber-300 font-semibold">{dest.name}</span>.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs border-t border-b border-slate-800 py-3">
            <div>
              <div className="text-slate-400">Destination</div>
              <div className="font-semibold text-white">{dest.name}</div>
            </div>
            <div>
              <div className="text-slate-400">Transfer Distance</div>
              <div className="font-mono-tabular font-semibold text-sky-300">
                {dest.distanceLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onFireTransferBurn}
            className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide shadow-lg transition-colors cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            <span>Fire Burn to {dest.name} [Space]</span>
          </button>
        </div>
      )}

      {/* REWARD / UNLOCK TOAST BANNER */}
      {rewardBanner && !missionFailure && (
        <div className="pointer-events-none self-center bg-[#070d1a]/95 border border-amber-400/75 rounded-lg px-4 py-2 shadow-xl flex items-center gap-2 text-xs font-semibold text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{rewardBanner}</span>
        </div>
      )}

      {/* MISSION UNSUCCESSFUL MODAL (Landing Hazard/Crash or Rover Rock Collision) */}
      {missionFailure && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-[#090d18] border border-red-500/70 rounded-xl p-6 shadow-2xl text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 border border-red-400/60 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="mt-3 text-xs font-mono-tabular uppercase tracking-widest text-red-400 font-bold">
              Mission Unsuccessful
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">
              {missionFailure.title}
            </h2>
            <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
              {missionFailure.reason}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRetryMission}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-display font-bold text-sm transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Main Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROVER NEARBY SCIENCE SAMPLE / RARE RELIC PROMPT */}
      {screen === 'rover' && !missionFailure && roverTelemetry.nearbySample && (
        <div
          className={`pointer-events-auto self-center mb-2 bg-[#070d1a]/95 rounded-xl px-5 py-3 shadow-2xl flex flex-wrap items-center gap-4 border ${
            roverTelemetry.nearbySample.isRare ? 'border-purple-400/80' : 'border-emerald-400/70'
          }`}
        >
          <div>
            <div
              className={`text-[10px] font-mono-tabular uppercase tracking-wider ${
                roverTelemetry.nearbySample.isRare ? 'text-purple-300' : 'text-emerald-300'
              }`}
            >
              {roverTelemetry.nearbySample.isRare
                ? 'RARE SAMPLE RELIC IN RANGE — UNLOCKS NEW PART!'
                : 'NASA Science Target In Range'}
            </div>
            <div className="font-display text-base font-bold text-white">
              {roverTelemetry.nearbySample.title} (+${roverTelemetry.nearbySample.creditReward})
            </div>
          </div>
          <button
            type="button"
            onClick={onCollectSample}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display font-bold text-xs tracking-wide cursor-pointer ${
              roverTelemetry.nearbySample.isRare
                ? 'bg-purple-500 hover:bg-purple-400 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            <Microscope className="w-4 h-4" />
            <span>Scan Sample [E]</span>
          </button>
        </div>
      )}

      {/* BOTTOM COLLAPSIBLE DOCK */}
      <div
        className={`pointer-events-none flex flex-col items-center transition-transform duration-200 ease-out ${
          dockCollapsed ? 'translate-y-[calc(100%-34px)]' : 'translate-y-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-mono-tabular tracking-wide text-slate-300 bg-[#070d1a]/92 border border-b-0 border-slate-700/60 rounded-t-md hover:text-white transition-colors cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls [H]</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls [H]</span>
            </>
          )}
        </button>

        {/* ROLLOUT DOCK */}
        {screen === 'rollout' && (
          <div className="pointer-events-auto w-full max-w-[780px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl px-5 py-3.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                  Warehouse-to-Launchpad Transfer
                </div>
                <div className="text-sm font-medium text-white mt-0.5">
                  {rolloutTelemetry.statusLabel}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right font-mono-tabular text-xs">
                  <div className="text-slate-400">Crawler Speed</div>
                  <div className="text-sky-300 font-semibold">
                    {rolloutTelemetry.speedKmh.toFixed(1)} km/h · {rolloutTelemetry.distanceMeters} m
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSkipRollout}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-100 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Skip to Pad</span>
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${rolloutTelemetry.progressPct}%` }}
                />
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-amber-300 w-10 text-right">
                {rolloutTelemetry.progressPct}%
              </span>
            </div>
          </div>
        )}

        {/* FLIGHT DOCK */}
        {screen === 'flight' && (
          <div className="pointer-events-auto w-full max-w-[900px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl px-3.5 py-2.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-xs min-w-0">
                <span className="font-mono-tabular font-semibold text-amber-400 shrink-0">
                  FLIGHT
                </span>
                <span className="text-slate-300 truncate">{flightTelemetry.guidanceText}</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  Orbit {flightTelemetry.orbitProgressPct}%
                </span>
                <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-150"
                    style={{ width: `${flightTelemetry.orbitProgressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-1.5">
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Altitude</div>
                <div className="font-mono-tabular text-sm font-semibold text-white">
                  {flightTelemetry.altitudeKm.toFixed(1)}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">km</span>
                </div>
              </div>

              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Velocity</div>
                <div className="font-mono-tabular text-sm font-semibold text-sky-300">
                  {Math.round(flightTelemetry.totalSpeed).toLocaleString()}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">m/s</span>
                </div>
              </div>

              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Vert / Horiz
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-slate-100">
                  {Math.round(flightTelemetry.verticalSpeed)} /{' '}
                  {Math.round(flightTelemetry.horizontalSpeed)}
                </div>
              </div>

              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Accel / Mach
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-amber-300">
                  {flightTelemetry.accelMps2.toFixed(1)}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">
                    m/s² · M{flightTelemetry.mach.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Pitch / Target
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-slate-100">
                  {Math.round(flightTelemetry.pitchDeg)}° /{' '}
                  <span className="text-sky-300">{Math.round(flightTelemetry.targetPitchDeg)}°</span>
                </div>
              </div>

              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
                  <span>Stage Fuel</span>
                  <span className="font-mono-tabular text-slate-200">
                    {flightTelemetry.stageFuelPct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      flightTelemetry.stageFuelPct < 20 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${flightTelemetry.stageFuelPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {!flightTelemetry.launched ? (
                  <button
                    type="button"
                    onClick={onLaunch}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Launch Rocket [Space]</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-tabular uppercase text-slate-400">
                      Throttle
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(flightTelemetry.throttle * 100)}
                      onChange={(e) => onThrottleChange(Number(e.target.value) / 100)}
                      aria-label="Engine throttle"
                      className="aero-slider w-24 sm:w-28"
                    />
                    <span className="font-mono-tabular text-xs font-semibold text-amber-300 w-9">
                      {Math.round(flightTelemetry.throttle * 100)}%
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1" role="group" aria-label="Pitch and yaw">
                  <button
                    type="button"
                    onPointerDown={() => onHoldControl('yawLeft', true)}
                    onPointerUp={() => onHoldControl('yawLeft', false)}
                    onPointerLeave={() => onHoldControl('yawLeft', false)}
                    title="Yaw Left [A]"
                    className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => onHoldControl('pitchDown', true)}
                    onPointerUp={() => onHoldControl('pitchDown', false)}
                    onPointerLeave={() => onHoldControl('pitchDown', false)}
                    title="Pitch Downrange [W / Up]"
                    className="px-2.5 py-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono-tabular cursor-pointer"
                  >
                    W · Pitch
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => onHoldControl('pitchUp', true)}
                    onPointerUp={() => onHoldControl('pitchUp', false)}
                    onPointerLeave={() => onHoldControl('pitchUp', false)}
                    title="Pitch Vertical [S / Down]"
                    className="px-2.5 py-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono-tabular cursor-pointer"
                  >
                    S · Climb
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => onHoldControl('yawRight', true)}
                    onPointerUp={() => onHoldControl('yawRight', false)}
                    onPointerLeave={() => onHoldControl('yawRight', false)}
                    title="Yaw Right [D]"
                    className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {flightTelemetry.launched && flightTelemetry.stageIndex < 2 && (
                  <button
                    type="button"
                    onClick={onSeparateStage}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      flightTelemetry.stageReadyToSeparate
                        ? 'bg-amber-500 text-slate-950 border-amber-300 hover:bg-amber-400'
                        : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Separate Stage [X]</span>
                  </button>
                )}
                {flightTelemetry.launched && flightTelemetry.stageIndex === 2 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono-tabular text-sky-300">
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Upper Stage</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
                {cameraButtons.map((btn) => {
                  const active = cameraMode === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => onCameraModeChange(btn.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* EARTH ORBIT BOTTOM STATUS STRIP */}
        {screen === 'earth-orbit' && (
          <div className="pointer-events-auto w-full max-w-[740px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl px-5 py-3 shadow-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <span className="font-mono-tabular font-semibold text-sky-300 mr-2">ORBIT</span>
              Drag viewport to inspect lander in Earth orbit · Ready for {dest.name} burn
            </div>
            <div className="font-mono-tabular text-xs text-slate-400">
              Altitude {dest.orbitTargetKm} km · Velocity 7,820 m/s
            </div>
          </div>
        )}

        {/* INTERPLANETARY TRANSIT CUTSCENE DOCK */}
        {screen === 'transit' && (
          <div className="pointer-events-auto w-full max-w-[780px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl px-5 py-3.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-sky-300">
                  Interplanetary Transfer · {dest.name}
                </div>
                <div className="text-sm font-medium text-white mt-0.5">
                  {transitTelemetry.phaseLabel}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right font-mono-tabular text-xs">
                  <div className="text-slate-400">Cruise Velocity</div>
                  <div className="text-amber-300 font-semibold">
                    {transitTelemetry.velocityKms.toFixed(1)} km/s ·{' '}
                    {transitTelemetry.distanceRemainingLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSkipTransit}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-100 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Skip Cutscene</span>
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{ width: `${transitTelemetry.progressPct}%` }}
                />
              </div>
              <span className="font-mono-tabular text-xs font-semibold text-sky-300 w-10 text-right">
                {transitTelemetry.progressPct}%
              </span>
            </div>
          </div>
        )}

        {/* PLANETARY LANDING DOCK */}
        {screen === 'landing' && (
          <div className="pointer-events-auto w-full max-w-[880px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl px-4 py-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`font-mono-tabular font-semibold shrink-0 ${
                    landingTelemetry.inSafeZone ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {landingTelemetry.inSafeZone ? 'SAFE ZONE' : 'DANGER ZONE'}
                </span>
                <span
                  className={`truncate ${
                    landingTelemetry.inSafeZone ? 'text-slate-300' : 'text-red-300 font-medium'
                  }`}
                >
                  {landingTelemetry.guidanceText}
                </span>
              </div>
              <span className="font-mono-tabular text-slate-400 shrink-0">
                g = {dest.gravityMps2.toFixed(2)} m/s²
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Radar Altitude
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-white">
                  {landingTelemetry.altitudeMeters.toFixed(1)}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">m</span>
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Descent Rate
                </div>
                <div
                  className={`font-mono-tabular text-sm font-semibold ${
                    Math.abs(landingTelemetry.verticalSpeed) > 10.5 ? 'text-red-400' : 'text-sky-300'
                  }`}
                >
                  {landingTelemetry.verticalSpeed.toFixed(1)}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">m/s</span>
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Pad Zone Dist
                </div>
                <div
                  className={`font-mono-tabular text-sm font-semibold ${
                    landingTelemetry.inSafeZone ? 'text-emerald-300' : 'text-red-400'
                  }`}
                >
                  {Math.round(landingTelemetry.distFromSafeCenter)} / {landingTelemetry.safeRadiusMeters}m
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Horiz Drift
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-slate-100">
                  {landingTelemetry.horizontalSpeed.toFixed(1)}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">m/s</span>
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
                  <span>Descent Fuel</span>
                  <span className="font-mono-tabular text-slate-200">
                    {landingTelemetry.fuelPct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-100"
                    style={{ width: `${landingTelemetry.fuelPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('landingBurn', true)}
                  onPointerUp={() => onHoldControl('landingBurn', false)}
                  onPointerLeave={() => onHoldControl('landingBurn', false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs tracking-wide cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>Hold Retro Burn [Space]</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono-tabular uppercase text-slate-400">
                    Retro
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(landingTelemetry.throttle * 100)}
                    onChange={(e) => onLandingThrottleChange(Number(e.target.value) / 100)}
                    aria-label="Landing retro throttle"
                    className="aero-slider w-24"
                  />
                  <span className="font-mono-tabular text-xs font-semibold text-amber-300 w-9">
                    {Math.round(landingTelemetry.throttle * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1" role="group" aria-label="Hover RCS">
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('landingLeft', true)}
                  onPointerUp={() => onHoldControl('landingLeft', false)}
                  onPointerLeave={() => onHoldControl('landingLeft', false)}
                  title="RCS Left [A]"
                  className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('landingFwd', true)}
                  onPointerUp={() => onHoldControl('landingFwd', false)}
                  onPointerLeave={() => onHoldControl('landingFwd', false)}
                  title="RCS Forward [W]"
                  className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('landingBack', true)}
                  onPointerUp={() => onHoldControl('landingBack', false)}
                  onPointerLeave={() => onHoldControl('landingBack', false)}
                  title="RCS Back [S]"
                  className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('landingRight', true)}
                  onPointerUp={() => onHoldControl('landingRight', false)}
                  onPointerLeave={() => onHoldControl('landingRight', false)}
                  title="RCS Right [D]"
                  className="p-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ROVER SURFACE EXPLORATION DOCK */}
        {screen === 'rover' && (
          <div className="pointer-events-auto w-full max-w-[940px] bg-[#070d1a]/92 border border-slate-700/65 rounded-xl px-4 py-3 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono-tabular font-semibold text-emerald-400 shrink-0">
                  ROVER
                </span>
                <span className="text-slate-300 truncate">
                  {roverTelemetry.lastScanMessage
                    ? roverTelemetry.lastScanMessage
                    : allSamplesDone && roverTelemetry.rareFound
                      ? `All samples & Rare Relic found on ${dest.name}!`
                      : `Avoid solid rocks (collisions destroy rover!) · Follow Rare Radar or green beacons`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!roverTelemetry.rareFound && roverTelemetry.rareSampleDistanceM !== null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/60 border border-purple-400/50 text-purple-200 font-mono-tabular text-[11px]">
                    <Compass className="w-3.5 h-3.5 text-purple-300" />
                    <span>Rare Relic: {roverTelemetry.rareSampleDistanceM} m</span>
                    {roverTelemetry.rareSampleBearingDeg !== null && (
                      <Navigation
                        className="w-3.5 h-3.5 text-amber-300 transition-transform duration-100"
                        style={{ transform: `rotate(${roverTelemetry.rareSampleBearingDeg}deg)` }}
                      />
                    )}
                  </div>
                )}
                {allSamplesDone && (
                  <button
                    type="button"
                    onClick={onReturnLevels}
                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    Next Planet
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-3 sm:grid-cols-5 gap-2">
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Speed</div>
                <div className="font-mono-tabular text-sm font-semibold text-sky-300">
                  {Math.abs(roverTelemetry.speedMps).toFixed(1)}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">m/s</span>
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Heading</div>
                <div className="font-mono-tabular text-sm font-semibold text-white">
                  {String(roverTelemetry.headingDeg).padStart(3, '0')}°
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Slope</div>
                <div className="font-mono-tabular text-sm font-semibold text-amber-300">
                  {roverTelemetry.slopeDeg}°
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Odometer</div>
                <div className="font-mono-tabular text-sm font-semibold text-slate-100">
                  {roverTelemetry.distanceTraveledM}{' '}
                  <span className="text-[11px] text-slate-400 font-normal">m</span>
                </div>
              </div>
              <div className="bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Samples + Relic
                </div>
                <div className="font-mono-tabular text-sm font-semibold text-emerald-300">
                  {roverTelemetry.samplesCollected.length} / {dest.samples.length + 1}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              {/* Holdable Rover Drive Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('roverSteer', -1)}
                  onPointerUp={() => onHoldControl('roverSteer', 0)}
                  onPointerLeave={() => onHoldControl('roverSteer', 0)}
                  title="Steer Left [A]"
                  className="px-2.5 py-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono-tabular cursor-pointer"
                >
                  A · Left
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('roverThrottle', 1)}
                  onPointerUp={() => onHoldControl('roverThrottle', 0)}
                  onPointerLeave={() => onHoldControl('roverThrottle', 0)}
                  title="Drive Forward [W]"
                  className="px-3 py-2 rounded bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/50 text-white text-xs font-mono-tabular font-semibold cursor-pointer"
                >
                  W · Drive
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('roverThrottle', -1)}
                  onPointerUp={() => onHoldControl('roverThrottle', 0)}
                  onPointerLeave={() => onHoldControl('roverThrottle', 0)}
                  title="Reverse [S]"
                  className="px-2.5 py-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono-tabular cursor-pointer"
                >
                  S · Rev
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('roverSteer', 1)}
                  onPointerUp={() => onHoldControl('roverSteer', 0)}
                  onPointerLeave={() => onHoldControl('roverSteer', 0)}
                  title="Steer Right [D]"
                  className="px-2.5 py-2 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono-tabular cursor-pointer"
                >
                  D · Right
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('roverBoost', true)}
                  onPointerUp={() => onHoldControl('roverBoost', false)}
                  onPointerLeave={() => onHoldControl('roverBoost', false)}
                  title="Turbo Boost [Shift]"
                  className="px-2.5 py-2 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-200 text-xs font-mono-tabular cursor-pointer"
                >
                  Boost [Shift]
                </button>
                <button
                  type="button"
                  onPointerDown={() => onHoldControl('roverHop', true)}
                  onPointerUp={() => onHoldControl('roverHop', false)}
                  onPointerLeave={() => onHoldControl('roverHop', false)}
                  title="Low-G Thruster Hop [Space]"
                  className="px-2.5 py-2 rounded bg-sky-500/20 hover:bg-sky-500/35 border border-sky-500/50 text-sky-200 text-xs font-mono-tabular cursor-pointer"
                >
                  Hop [Space]
                </button>
              </div>

              {/* Camera Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
                {(['rear-chase', 'free-orbit'] as CameraMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onCameraModeChange(mode)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      cameraMode === mode
                        ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {mode === 'rear-chase' ? 'Rear Chase' : 'Free Orbit'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
