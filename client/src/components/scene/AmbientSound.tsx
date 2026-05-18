/**
 * AmbientSound.tsx - Sprint 8
 * Web Audio API ambient sound system
 * Generates procedural sounds: office hum, rain, thunder, keyboard, server fans
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { AmbientSoundType } from '../../types/game';

// Web Audio API sound generators
function createOfficeHum(ctx: AudioContext): { node: AudioNode; stop: () => void } {
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  let phase = 0;

  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      phase += 0.0003;
      // Subtle low-frequency hum with harmonics
      output[i] =
        Math.sin(phase * 55) * 0.008 +
        Math.sin(phase * 110) * 0.004 +
        Math.sin(phase * 165) * 0.002 +
        (Math.random() - 0.5) * 0.003;
    }
  };

  return { node, stop: () => node.disconnect() };
}

function createRainSound(ctx: AudioContext, intensity: number): { node: AudioNode; stop: () => void } {
  const bufferSize = 2048;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);

  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Filtered noise simulating rain
      const sample = (Math.random() - 0.5) * 2;
      // Simple low-pass by averaging
      output[i] = sample * 0.03 * intensity;
    }
  };

  // Add a low-pass-like effect by connecting through a biquad filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  node.connect(filter);

  return { node: filter, stop: () => { node.disconnect(); filter.disconnect(); } };
}

function createThunderSound(ctx: AudioContext): { node: AudioNode; stop: () => void; trigger: () => void } {
  const bufferSize = 4096;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  let active = false;
  let t = 0;

  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      if (active) {
        // Low rumbling thunder
        output[i] =
          Math.sin(t * 10 + Math.sin(t * 3) * 5) * Math.exp(-t * 0.5) * 0.15 +
          (Math.random() - 0.5) * Math.exp(-t * 0.8) * 0.1;
        t += 1 / ctx.sampleRate;
        if (t > 4) { active = false; t = 0; }
      } else {
        output[i] = 0;
      }
    }
  };

  return {
    node,
    stop: () => node.disconnect(),
    trigger: () => { active = true; t = 0; },
  };
}

function createKeyboardSound(ctx: AudioContext): { node: AudioNode; stop: () => void } {
  const bufferSize = 1024;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  let nextClickAt = 0;

  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    const now = ctx.currentTime;
    for (let i = 0; i < bufferSize; i++) {
      if (now + i / ctx.sampleRate > nextClickAt) {
        // Random keyboard click
        output[i] = (Math.random() - 0.5) * 0.02;
        nextClickAt = now + i / ctx.sampleRate + 0.05 + Math.random() * 0.3;
      } else {
        output[i] = output[Math.max(0, i - 1)] * 0.5;
      }
    }
  };

  return { node, stop: () => node.disconnect() };
}

function createServerFans(ctx: AudioContext): { node: AudioNode; stop: () => void } {
  const bufferSize = 2048;
  const node = ctx.createScriptProcessor(bufferSize, 1, 1);
  let phase = 0;

  node.onaudioprocess = (e) => {
    const output = e.outputBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      phase += 0.0005;
      // Fan whine with harmonics
      output[i] =
        Math.sin(phase * 200) * 0.003 +
        Math.sin(phase * 400) * 0.001 +
        Math.sin(phase * 600) * 0.0005 +
        (Math.random() - 0.5) * 0.002;
    }
  };

  return { node, stop: () => node.disconnect() };
}

export function AmbientSound() {
  const soundEnabled = useGameStore((state) => state.ambientSound.enabled);
  const activeSounds = useGameStore((state) => state.ambientSound.activeSounds);
  const weather = useGameStore((state) => state.weather);
  const currentFloor = useGameStore((state) => state.currentFloor);
  const settings = useGameStore((state) => state.settings);
  const ctxRef = useRef<AudioContext | null>(null);
  const soundsRef = useRef<Map<string, { stop: () => void; trigger?: () => void }>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);

  // Auto-manage sounds based on floor and weather
  useEffect(() => {
    const floorSounds: AmbientSoundType[] = [];

    // Always have office hum
    floorSounds.push('office_hum');

    // Weather-based
    if (weather.current === 'rain') floorSounds.push('rain');
    if (weather.current === 'storm') { floorSounds.push('rain'); floorSounds.push('thunder'); }

    // Floor-specific
    if (currentFloor === 'basement') floorSounds.push('keyboard');
    if (currentFloor === 'floor3') floorSounds.push('server_fans');

    useGameStore.getState().setActiveSounds(floorSounds);
  }, [currentFloor, weather.current]);

  // Initialize AudioContext
  useEffect(() => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gain = ctxRef.current.createGain();
        gain.gain.value = soundEnabled ? (settings.sfxVolume || 0.3) * 0.5 : 0;
        gain.connect(ctxRef.current.destination);
        masterGainRef.current = gain;
      } catch (e) {
        console.warn('Web Audio API not available');
      }
    }

    return () => {
      soundsRef.current.forEach(s => s.stop());
      soundsRef.current.clear();
    };
  }, []);

  // Update master volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = soundEnabled ? (settings.sfxVolume || 0.3) * 0.5 : 0;
    }
  }, [soundEnabled, settings.sfxVolume]);

  // Manage active sounds
  useEffect(() => {
    if (!ctxRef.current || !masterGainRef.current) return;
    const ctx = ctxRef.current;
    const currentSounds = soundsRef.current;

    // Remove sounds that are no longer active
    for (const [key, sound] of currentSounds.entries()) {
      if (!activeSounds.includes(key as AmbientSoundType)) {
        sound.stop();
        currentSounds.delete(key);
      }
    }

    // Add new sounds
    for (const soundType of activeSounds) {
      if (!currentSounds.has(soundType)) {
        let sound: { node: AudioNode; stop: () => void; trigger?: () => void };
        switch (soundType) {
          case 'office_hum': sound = createOfficeHum(ctx); break;
          case 'rain': sound = createRainSound(ctx, weather.intensity); break;
          case 'thunder': sound = createThunderSound(ctx); break;
          case 'keyboard': sound = createKeyboardSound(ctx); break;
          case 'server_fans': sound = createServerFans(ctx); break;
          default: return;
        }
        (sound.node as AudioNode).connect(masterGainRef.current!);
        currentSounds.set(soundType, { stop: sound.stop, trigger: sound.trigger });
      }
    }

    // Trigger thunder randomly during storms
    if (activeSounds.includes('thunder')) {
      const thunderSound = currentSounds.get('thunder');
      if (thunderSound?.trigger && Math.random() < 0.002) {
        thunderSound.trigger();
      }
    }
  }, [activeSounds, weather.intensity]);

  return null; // No visual output
}

export default AmbientSound;
