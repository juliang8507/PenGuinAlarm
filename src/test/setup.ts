import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock File.prototype.arrayBuffer for jsdom (not implemented in jsdom)
if (!File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock Web Audio API
class MockAudioContext {
  state = 'running';
  currentTime = 0;

  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      detune: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  async decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return {
      length: buffer.byteLength,
      duration: 1,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn(() => new Float32Array(1024)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    };
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

// @ts-expect-error Mock implementation
globalThis.AudioContext = MockAudioContext;
// @ts-expect-error Mock implementation
globalThis.webkitAudioContext = MockAudioContext;
