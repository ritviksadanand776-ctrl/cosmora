export class RocketAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private muted = false;
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.45;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Create 2-second brown/pink rocket roar buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        output[i] = lastOut * 3.2;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      filter.Q.value = 1.2;

      const rGain = ctx.createGain();
      rGain.gain.value = 0;

      noise.connect(filter);
      filter.connect(rGain);
      rGain.connect(master);
      noise.start();

      // Sub-bass chamber resonance
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 46;
      const oscFilter = ctx.createBiquadFilter();
      oscFilter.type = 'lowpass';
      oscFilter.frequency.value = 95;
      const sGain = ctx.createGain();
      sGain.gain.value = 0;
      osc.connect(oscFilter);
      oscFilter.connect(sGain);
      sGain.connect(master);
      osc.start();

      this.noiseSource = noise;
      this.rumbleFilter = filter;
      this.rumbleGain = rGain;
      this.subOsc = osc;
      this.subGain = sGain;
      this.initialized = true;
    } catch {
      // Audio unavailable
    }
  }

  public resume(): void {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateThrust(throttle: number, atmosphereFactor: number, active: boolean, stageIndex: number): void {
    if (!this.initialized || !this.ctx || !this.rumbleGain || !this.rumbleFilter || !this.subGain || !this.subOsc) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active || throttle <= 0.01) {
      this.rumbleGain.gain.setTargetAtTime(0, now, 0.08);
      this.subGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    // In thin upper atmosphere/space, external acoustic transmission drops to subtle internal hull hum
    const acousticTransmission = 0.16 + 0.84 * atmosphereFactor;
    const stagePower = stageIndex === 0 ? 1.0 : stageIndex === 1 ? 0.72 : 0.46;
    const targetGain = throttle * acousticTransmission * stagePower * 0.68;
    const targetSub = throttle * (0.25 + 0.75 * atmosphereFactor) * stagePower * 0.24;

    this.rumbleGain.gain.setTargetAtTime(targetGain, now, 0.06);
    this.rumbleFilter.frequency.setTargetAtTime(140 + throttle * 460 * atmosphereFactor + (stageIndex === 0 ? 160 : 60), now, 0.08);
    this.subGain.gain.setTargetAtTime(targetSub, now, 0.06);
    this.subOsc.frequency.setTargetAtTime(38 + throttle * 22 + stageIndex * 8, now, 0.1);
  }

  public playIgnition(): void {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.45);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playStageSeparation(): void {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Pneumatic clunk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Pyrotechnic bolt burst
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.25), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.28));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 850;
    const nGain = this.ctx.createGain();
    nGain.gain.value = 0.28;
    src.connect(hp);
    hp.connect(nGain);
    nGain.connect(this.masterGain);
    src.start(now);
  }

  public playOrbitAchieved(): void {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  public dispose(): void {
    try {
      this.noiseSource?.stop();
      this.subOsc?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.initialized = false;
  }
}
