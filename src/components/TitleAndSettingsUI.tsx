import React from 'react';
import { Coins, Play, Power, RotateCcw, Settings, ShoppingBag, X } from 'lucide-react';
import { GameSettings } from '../types/mission';

interface TitleScreenProps {
  credits: number;
  onStart: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  credits,
  onStart,
  onOpenShop,
  onOpenSettings,
  onQuit,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div className="font-display text-sm font-bold tracking-[0.22em] text-slate-300">
          COSMORA
        </div>
        <div className="flex items-center gap-3">
          <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#070d1a]/88 border border-amber-500/40 text-xs font-mono-tabular font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5" />
            <span>${credits.toLocaleString()}</span>
          </div>
          <div className="hidden sm:block text-xs font-mono-tabular text-slate-400">
            Orbital Mechanics · NASA Planetary Surfaces
          </div>
        </div>
      </div>

      <div className="pointer-events-auto max-w-xl bg-[#070d1a]/88 border border-slate-700/65 rounded-xl p-7 shadow-2xl">
        <p className="text-xs font-mono-tabular tracking-widest uppercase text-amber-400">
          Space Mission Simulator
        </p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold text-white tracking-tight text-balance">
          Design, Launch & Explore Beyond Earth
        </h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          Assemble your custom launch vehicle in the hangar, roll out to the pad, climb into Earth
          orbit, fire your interplanetary transfer burn, land inside the safe zone on NASA-mapped
          terrain, and hunt rare samples with your 6-wheeled rover.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm tracking-wide transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start</span>
          </button>

          <button
            type="button"
            onClick={onOpenShop}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-sky-200 text-sm font-medium transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Parts Shop</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-100 text-sm font-medium transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>Quit</span>
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-400 font-mono-tabular">
        6 Worlds · Spacecraft Shop · Free Launch Camera · Powered Safe-Zone Landing · Rare Sample Search
      </div>
    </div>
  );
};

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const toggle = (key: keyof GameSettings) => {
    if (key === 'flightMode') {
      onChange({
        ...settings,
        flightMode: settings.flightMode === 'assisted' ? 'simulation' : 'assisted',
      });
    } else if (key === 'screenMode') {
      onChange({
        ...settings,
        screenMode: settings.screenMode === 'laptop' ? 'fullscreen' : 'laptop',
      });
    } else {
      onChange({ ...settings, [key]: !settings[key] });
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-md bg-[#070d1a] border border-slate-700/75 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="font-display text-xl font-bold text-white">Mission Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
            <div>
              <div className="font-medium text-slate-100">Flight Guidance</div>
              <div className="text-xs text-slate-400">
                Assisted gently steers gravity turn; Manual gives raw control
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('flightMode')}
              className="px-3 py-1.5 rounded-md text-xs font-mono-tabular font-semibold bg-slate-800 border border-slate-600 text-sky-300 hover:border-sky-400 cursor-pointer"
            >
              {settings.flightMode === 'assisted' ? 'Assisted' : 'Manual'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
            <div>
              <div className="font-medium text-slate-100">Auto-Stage Separation</div>
              <div className="text-xs text-slate-400">Automatically jettison empty stages after 1.4s</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('autoStageAssist')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-tabular font-semibold border cursor-pointer ${
                settings.autoStageAssist
                  ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {settings.autoStageAssist ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
            <div>
              <div className="font-medium text-slate-100">Auto-Landing Descent Assist</div>
              <div className="text-xs text-slate-400">Regulates retro-thrust for smooth touchdown</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('autoLandAssist')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-tabular font-semibold border cursor-pointer ${
                settings.autoLandAssist
                  ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {settings.autoLandAssist ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
            <div>
              <div className="font-medium text-slate-100">Dynamic Sun Shadows</div>
              <div className="text-xs text-slate-400">Real-time directional shadows on pad and planets</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('shadowsEnabled')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-tabular font-semibold border cursor-pointer ${
                settings.shadowsEnabled
                  ? 'bg-sky-950 border-sky-500/60 text-sky-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {settings.shadowsEnabled ? 'On' : 'Off'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-800/70">
            <div>
              <div className="font-medium text-slate-100">Simulation Audio</div>
              <div className="text-xs text-slate-400">Procedural engine roar, staging, and chimes</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('muted')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-tabular font-semibold border cursor-pointer ${
                !settings.muted
                  ? 'bg-sky-950 border-sky-500/60 text-sky-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {settings.muted ? 'Muted' : 'Active'}
            </button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium text-slate-100">Screen Resolution</div>
              <div className="text-xs text-slate-400">Laptop 1366×768 frame or Full Viewport</div>
            </div>
            <button
              type="button"
              onClick={() => toggle('screenMode')}
              className="px-3 py-1.5 rounded-md text-xs font-mono-tabular font-semibold bg-slate-800 border border-slate-600 text-amber-300 hover:border-amber-400 cursor-pointer"
            >
              {settings.screenMode === 'laptop' ? 'Laptop 1366×768' : 'Full Viewport'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuitScreenProps {
  onReturnTitle: () => void;
}

export const QuitScreen: React.FC<QuitScreenProps> = ({ onReturnTitle }) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#070d1a]/92 border border-slate-700/65 rounded-xl p-7 text-center shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-white">Mission Control Standby</h2>
        <p className="mt-2 text-sm text-slate-300">
          Flight systems powered down safely. You can return to the main mission console whenever
          you are ready to launch again.
        </p>
        <button
          type="button"
          onClick={onReturnTitle}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Title</span>
        </button>
      </div>
    </div>
  );
};
