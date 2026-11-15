import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlightHUD } from './components/FlightHUD';
import { LevelsScreen, SpacecraftBuilderUI } from './components/LevelsAndBuilderUI';
import { ShopModal } from './components/ShopModal';
import { SimControlInput, SpaceSimCanvas } from './components/SpaceSimCanvas';
import { QuitScreen, SettingsModal, TitleScreen } from './components/TitleAndSettingsUI';
import { RocketAudioEngine } from './engine/audio';
import { FlightPhysicsEngine } from './engine/flightPhysics';
import {
  BoosterStyle,
  CATALOG_ITEMS,
  CameraMode,
  CatalogItem,
  DEFAULT_SETTINGS,
  DEFAULT_SPACECRAFT,
  DestinationId,
  FairingStyle,
  FlightTelemetry,
  GameScreen,
  GameSettings,
  INITIAL_UNLOCKED_IDS,
  LanderFinish,
  LandingTelemetry,
  MissionFailureState,
  PlumeStyle,
  RolloutTelemetry,
  RoverTelemetry,
  ScienceSample,
  SpacecraftConfig,
  TransitTelemetry,
} from './types/mission';

const STORAGE_KEY = 'cosmora_progression_v1';

interface SavedProgression {
  credits: number;
  unlockedIds: string[];
}

function loadProgression(): SavedProgression {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedProgression>;
      const mergedUnlocked = Array.from(
        new Set([...INITIAL_UNLOCKED_IDS, ...(Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : [])])
      );
      return {
        credits: typeof parsed.credits === 'number' && parsed.credits >= 0 ? parsed.credits : 1200,
        unlockedIds: mergedUnlocked,
      };
    }
  } catch {
    // ignore storage failures
  }
  return { credits: 1200, unlockedIds: [...INITIAL_UNLOCKED_IDS] };
}

const INITIAL_INPUT: SimControlInput = {
  pitchUp: false,
  pitchDown: false,
  yawLeft: false,
  yawRight: false,
  landingBurn: false,
  landingLeft: false,
  landingRight: false,
  landingFwd: false,
  landingBack: false,
  roverThrottle: 0,
  roverSteer: 0,
  roverBoost: false,
  roverHop: false,
};

export default function App() {
  const physics = useMemo(() => new FlightPhysicsEngine(), []);
  const audio = useMemo(() => new RocketAudioEngine(), []);

  const initialProg = useMemo(() => loadProgression(), []);
  const [credits, setCredits] = useState<number>(initialProg.credits);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(initialProg.unlockedIds);
  const [shopOpen, setShopOpen] = useState(false);
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);
  const [missionFailure, setMissionFailure] = useState<MissionFailureState | null>(null);

  const [screen, setScreen] = useState<GameScreen>('title');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [destinationId, setDestinationId] = useState<DestinationId>('mars');
  const [spacecraftConfig, setSpacecraftConfig] = useState<SpacecraftConfig>(DEFAULT_SPACECRAFT);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [cameraMode, setCameraMode] = useState<CameraMode>('rear-chase');
  const [resetToken, setResetToken] = useState(0);

  const [flightTelemetry, setFlightTelemetry] = useState<FlightTelemetry>(() =>
    physics.getTelemetry()
  );
  const [rolloutTelemetry, setRolloutTelemetry] = useState<RolloutTelemetry>({
    progressPct: 0,
    distanceMeters: 0,
    speedKmh: 0,
    statusLabel: 'Opening Vehicle Assembly Bay Doors',
  });
  const [transitTelemetry, setTransitTelemetry] = useState<TransitTelemetry>({
    progressPct: 0,
    phaseLabel: 'Trans-Planetary Injection Burn',
    distanceRemainingLabel: '100% Remaining',
    velocityKms: 11.4,
  });
  const [landingTelemetry, setLandingTelemetry] = useState<LandingTelemetry>({
    altitudeMeters: 118,
    verticalSpeed: -10.5,
    horizontalSpeed: 0,
    distFromSafeCenter: 11.4,
    inSafeZone: true,
    safeRadiusMeters: 24,
    fuelPct: 100,
    throttle: 0.35,
    touchdown: false,
    safeLanding: true,
    guidanceText: 'Descent guidance initialized',
  });
  const [roverTelemetry, setRoverTelemetry] = useState<RoverTelemetry>({
    speedMps: 0,
    headingDeg: 0,
    distanceTraveledM: 0,
    batteryPct: 100,
    samplesCollected: [],
    nearbySample: null,
    lastScanMessage: null,
    slopeDeg: 0,
    rareSampleDistanceM: null,
    rareSampleBearingDeg: null,
    rareFound: false,
  });

  const inputRef = useRef<SimControlInput>({ ...INITIAL_INPUT });
  const landingThrottleRef = useRef<number>(0.35);
  const collectTriggerRef = useRef<(() => void) | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const screenRef = useRef<GameScreen>(screen);
  screenRef.current = screen;

  // Persist progression
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ credits, unlockedIds }));
    } catch {
      // ignore
    }
  }, [credits, unlockedIds]);

  const showRewardToast = useCallback((msg: string) => {
    setRewardBanner(msg);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setRewardBanner(null), 4600);
  }, []);

  const clearInputs = useCallback(() => {
    Object.assign(inputRef.current, INITIAL_INPUT);
  }, []);

  const applyItemToConfig = useCallback((item: CatalogItem) => {
    setSpacecraftConfig((prev) => {
      switch (item.category) {
        case 'hull':
          return { ...prev, hullColor: item.value };
        case 'accent':
          return { ...prev, accentColor: item.value };
        case 'booster':
          return { ...prev, boosterStyle: item.value as BoosterStyle };
        case 'fairing':
          return { ...prev, fairingStyle: item.value as FairingStyle };
        case 'foil':
          return { ...prev, landerFinish: item.value as LanderFinish };
        case 'plume':
          return { ...prev, plumeStyle: item.value as PlumeStyle };
      }
    });
  }, []);

  const handleBuyItem = useCallback(
    (item: CatalogItem) => {
      if (unlockedIds.includes(item.id) || item.rarePlanet) return;
      if (credits < item.price) return;
      audio.playPurchase();
      setCredits((c) => c - item.price);
      setUnlockedIds((prev) => [...prev, item.id]);
      applyItemToConfig(item);
      showRewardToast(`Purchased & Equipped: ${item.label}`);
    },
    [applyItemToConfig, audio, credits, showRewardToast, unlockedIds]
  );

  const handleEquipItem = useCallback(
    (item: CatalogItem) => {
      if (!unlockedIds.includes(item.id)) return;
      audio.playPurchase();
      applyItemToConfig(item);
    },
    [applyItemToConfig, audio, unlockedIds]
  );

  const enterFlightPad = useCallback(() => {
    clearInputs();
    setMissionFailure(null);
    physics.reset(destinationId);
    setFlightTelemetry(physics.getTelemetry());
    setCameraMode('rear-chase');
    setScreen('flight');
  }, [clearInputs, destinationId, physics]);

  const handleLaunch = useCallback(() => {
    audio.resume();
    audio.playIgnition();
    physics.igniteAndLaunch();
    setFlightTelemetry(physics.getTelemetry());
  }, [audio, physics]);

  const handleSeparateStage = useCallback(() => {
    physics.separateStage(true);
    setFlightTelemetry(physics.getTelemetry());
  }, [physics]);

  const handleThrottleChange = useCallback(
    (val: number) => {
      physics.throttle = Math.max(0, Math.min(1, val));
      setFlightTelemetry(physics.getTelemetry());
    },
    [physics]
  );

  const handleTogglePause = useCallback(() => {
    physics.paused = !physics.paused;
    setFlightTelemetry(physics.getTelemetry());
  }, [physics]);

  const handleResetPhase = useCallback(() => {
    clearInputs();
    setMissionFailure(null);
    if (screenRef.current === 'flight') {
      physics.reset(destinationId);
      setFlightTelemetry(physics.getTelemetry());
    }
    setResetToken((t) => t + 1);
  }, [clearInputs, destinationId, physics]);

  const handleMainMenu = useCallback(() => {
    clearInputs();
    setMissionFailure(null);
    setScreen('title');
  }, [clearInputs]);

  const handleOrbitAchieved = useCallback(() => {
    setCredits((c) => c + 800);
    showRewardToast('Earth Orbit Achieved! +$800 Credits');
    setScreen('earth-orbit');
  }, [showRewardToast]);

  const handleFireTransferBurn = useCallback(() => {
    audio.resume();
    audio.playIgnition();
    clearInputs();
    setScreen('transit');
  }, [audio, clearInputs]);

  const handleSkipTransit = useCallback(() => {
    clearInputs();
    setMissionFailure(null);
    setScreen('landing');
  }, [clearInputs]);

  const handleTouchdownComplete = useCallback(() => {
    clearInputs();
    setMissionFailure(null);
    setCredits((c) => c + 1000);
    showRewardToast('Safe Pad Touchdown! +$1,000 Credits');
    setCameraMode('rear-chase');
    setScreen('rover');
  }, [clearInputs, showRewardToast]);

  const handleSampleCollected = useCallback(
    (sample: ScienceSample) => {
      setCredits((c) => c + sample.creditReward);
      if (sample.unlocksItemId) {
        const unlockedItem = CATALOG_ITEMS.find((i) => i.id === sample.unlocksItemId);
        setUnlockedIds((prev) =>
          prev.includes(sample.unlocksItemId!) ? prev : [...prev, sample.unlocksItemId!]
        );
        showRewardToast(
          `RARE PART UNLOCKED: ${unlockedItem ? unlockedItem.label : sample.title} (+$${sample.creditReward})`
        );
      } else {
        showRewardToast(`Sample Analyzed: ${sample.title} (+$${sample.creditReward})`);
      }
    },
    [showRewardToast]
  );

  const handleLandingThrottleChange = useCallback((val: number) => {
    landingThrottleRef.current = Math.max(0, Math.min(1, val));
  }, []);

  const handleCollectSample = useCallback(() => {
    collectTriggerRef.current?.();
  }, []);

  const handleHoldControl = useCallback(
    (key: keyof SimControlInput, active: boolean | number) => {
      (inputRef.current[key] as boolean | number) = active;
    },
    []
  );

  const handleToggleMute = useCallback(() => {
    audio.resume();
    setSettings((prev) => ({ ...prev, muted: !prev.muted }));
  }, [audio]);

  const handleToggleAutoLand = useCallback(() => {
    setSettings((prev) => ({ ...prev, autoLandAssist: !prev.autoLandAssist }));
  }, []);

  // Unified keyboard listener across Flight, Earth Orbit, Landing, and Rover
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      const cur = screenRef.current;

      if (cur === 'builder') {
        if (key === 'w' || e.key === 'ArrowUp') inputRef.current.pitchDown = true;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.pitchUp = true;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.yawLeft = true;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.yawRight = true;
      } else if (cur === 'flight') {
        if (key === 'w' || e.key === 'ArrowUp') inputRef.current.pitchDown = true;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.pitchUp = true;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.yawLeft = true;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.yawRight = true;
        else if (e.code === 'Space') {
          e.preventDefault();
          if (!physics.launched) handleLaunch();
        } else if (key === 'x') handleSeparateStage();
        else if (key === 'r') handleResetPhase();
        else if (key === 'p') handleTogglePause();
        else if (key === 'z') handleThrottleChange(1.0);
        else if (key === 'c') {
          setCameraMode((prev) => {
            const order: CameraMode[] = ['rear-chase', 'booster-cam', 'wide-ascent', 'free-orbit'];
            return order[(order.indexOf(prev) + 1) % order.length];
          });
        }
      } else if (cur === 'earth-orbit') {
        if (e.code === 'Space') {
          e.preventDefault();
          handleFireTransferBurn();
        }
      } else if (cur === 'landing') {
        if (e.code === 'Space') {
          e.preventDefault();
          inputRef.current.landingBurn = true;
        } else if (key === 'w' || e.key === 'ArrowUp') inputRef.current.landingFwd = true;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.landingBack = true;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.landingLeft = true;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.landingRight = true;
        else if (key === 'r') handleResetPhase();
      } else if (cur === 'rover') {
        if (key === 'w' || e.key === 'ArrowUp') inputRef.current.roverThrottle = 1;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.roverThrottle = -1;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.roverSteer = -1;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.roverSteer = 1;
        else if (e.key === 'Shift') inputRef.current.roverBoost = true;
        else if (e.code === 'Space') {
          e.preventDefault();
          inputRef.current.roverHop = true;
        } else if (key === 'e') {
          handleCollectSample();
        } else if (key === 'r') {
          handleResetPhase();
        } else if (key === 'c') {
          setCameraMode((prev) => (prev === 'rear-chase' ? 'free-orbit' : 'rear-chase'));
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const cur = screenRef.current;

      if (cur === 'builder') {
        if (key === 'w' || e.key === 'ArrowUp') inputRef.current.pitchDown = false;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.pitchUp = false;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.yawLeft = false;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.yawRight = false;
      } else if (cur === 'flight') {
        if (key === 'w' || e.key === 'ArrowUp') inputRef.current.pitchDown = false;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.pitchUp = false;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.yawLeft = false;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.yawRight = false;
      } else if (cur === 'landing') {
        if (e.code === 'Space') inputRef.current.landingBurn = false;
        else if (key === 'w' || e.key === 'ArrowUp') inputRef.current.landingFwd = false;
        else if (key === 's' || e.key === 'ArrowDown') inputRef.current.landingBack = false;
        else if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.landingLeft = false;
        else if (key === 'd' || e.key === 'ArrowRight') inputRef.current.landingRight = false;
      } else if (cur === 'rover') {
        if (key === 'w' || e.key === 'ArrowUp' || key === 's' || e.key === 'ArrowDown') {
          inputRef.current.roverThrottle = 0;
        } else if (key === 'a' || e.key === 'ArrowLeft' || key === 'd' || e.key === 'ArrowRight') {
          inputRef.current.roverSteer = 0;
        } else if (e.key === 'Shift') {
          inputRef.current.roverBoost = false;
        } else if (e.code === 'Space') {
          inputRef.current.roverHop = false;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    handleCollectSample,
    handleFireTransferBurn,
    handleLaunch,
    handleResetPhase,
    handleSeparateStage,
    handleThrottleChange,
    handleTogglePause,
    physics,
  ]);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
      audio.dispose();
    };
  }, [audio]);

  const showInMissionHUD =
    screen === 'rollout' ||
    screen === 'flight' ||
    screen === 'earth-orbit' ||
    screen === 'transit' ||
    screen === 'landing' ||
    screen === 'rover';

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#01040a] flex items-center justify-center">
      <main
        className={`relative overflow-hidden bg-[#020711] ${
          settings.screenMode === 'laptop'
            ? 'w-full h-full max-w-[1366px] max-h-[768px] border border-slate-800/80 shadow-2xl'
            : 'w-full h-full'
        }`}
      >
        <SpaceSimCanvas
          screen={screen}
          destinationId={destinationId}
          spacecraftConfig={spacecraftConfig}
          settings={settings}
          cameraMode={cameraMode}
          physics={physics}
          audio={audio}
          inputRef={inputRef}
          resetToken={resetToken}
          landingThrottleRef={landingThrottleRef}
          onFlightTelemetry={setFlightTelemetry}
          onRolloutTelemetry={setRolloutTelemetry}
          onTransitTelemetry={setTransitTelemetry}
          onLandingTelemetry={setLandingTelemetry}
          onRoverTelemetry={setRoverTelemetry}
          onRolloutComplete={enterFlightPad}
          onOrbitAchieved={handleOrbitAchieved}
          onTransitComplete={() => {
            setMissionFailure(null);
            setScreen('landing');
          }}
          onTouchdownComplete={handleTouchdownComplete}
          onCameraModeChange={setCameraMode}
          onSampleCollected={handleSampleCollected}
          onMissionFailed={setMissionFailure}
          collectTriggerRef={collectTriggerRef}
        />

        {screen === 'title' && (
          <TitleScreen
            credits={credits}
            onStart={() => {
              audio.resume();
              setScreen('levels');
            }}
            onOpenShop={() => setShopOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onQuit={() => setScreen('quit')}
          />
        )}

        {screen === 'quit' && <QuitScreen onReturnTitle={() => setScreen('title')} />}

        {screen === 'levels' && (
          <LevelsScreen
            selectedId={destinationId}
            credits={credits}
            unlockedIds={unlockedIds}
            onSelect={setDestinationId}
            onContinueToBuilder={() => setScreen('builder')}
            onOpenShop={() => setShopOpen(true)}
            onBack={() => setScreen('title')}
          />
        )}

        {screen === 'builder' && (
          <SpacecraftBuilderUI
            destinationId={destinationId}
            config={spacecraftConfig}
            credits={credits}
            unlockedIds={unlockedIds}
            onChange={setSpacecraftConfig}
            onOpenShop={() => setShopOpen(true)}
            onRollout={() => {
              audio.resume();
              clearInputs();
              setMissionFailure(null);
              setScreen('rollout');
            }}
            onBack={() => setScreen('levels')}
          />
        )}

        {showInMissionHUD && (
          <FlightHUD
            screen={screen}
            destinationId={destinationId}
            spacecraftConfig={spacecraftConfig}
            settings={settings}
            cameraMode={cameraMode}
            credits={credits}
            rewardBanner={rewardBanner}
            missionFailure={missionFailure}
            flightTelemetry={flightTelemetry}
            rolloutTelemetry={rolloutTelemetry}
            transitTelemetry={transitTelemetry}
            landingTelemetry={landingTelemetry}
            roverTelemetry={roverTelemetry}
            onCameraModeChange={setCameraMode}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenShop={() => setShopOpen(true)}
            onToggleMute={handleToggleMute}
            onToggleAutoLand={handleToggleAutoLand}
            onReturnLevels={() => {
              clearInputs();
              setMissionFailure(null);
              setScreen('levels');
            }}
            onRetryMission={handleResetPhase}
            onMainMenu={handleMainMenu}
            onSkipRollout={enterFlightPad}
            onLaunch={handleLaunch}
            onSeparateStage={handleSeparateStage}
            onThrottleChange={handleThrottleChange}
            onTogglePause={handleTogglePause}
            onResetPhase={handleResetPhase}
            onFireTransferBurn={handleFireTransferBurn}
            onSkipTransit={handleSkipTransit}
            onLandingThrottleChange={handleLandingThrottleChange}
            onCollectSample={handleCollectSample}
            onHoldControl={handleHoldControl}
          />
        )}

        {shopOpen && (
          <ShopModal
            credits={credits}
            unlockedIds={unlockedIds}
            config={spacecraftConfig}
            onBuyItem={handleBuyItem}
            onEquipItem={handleEquipItem}
            onClose={() => setShopOpen(false)}
          />
        )}

        {settingsOpen && (
          <SettingsModal
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
