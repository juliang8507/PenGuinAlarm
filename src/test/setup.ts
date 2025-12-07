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

// Mock Notification API
class MockNotification {
    static permission: NotificationPermission = 'granted';
    static requestPermission = vi.fn().mockResolvedValue('granted');

    title: string;
    options?: NotificationOptions;

    constructor(title: string, options?: NotificationOptions) {
        this.title = title;
        this.options = options;
    }

    close = vi.fn();
}

// @ts-expect-error Mock implementation
globalThis.Notification = MockNotification;

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
    configurable: true,
});

// Mock navigator.wakeLock
const mockWakeLockSentinel = {
    released: false,
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
};

Object.defineProperty(navigator, 'wakeLock', {
    value: {
        request: vi.fn().mockResolvedValue(mockWakeLockSentinel),
    },
    writable: true,
    configurable: true,
});

// Mock Service Worker
const mockServiceWorkerRegistration = {
    active: {
        postMessage: vi.fn(),
    },
    waiting: null,
    installing: null,
    showNotification: vi.fn().mockResolvedValue(undefined),
    getNotifications: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
};

Object.defineProperty(navigator, 'serviceWorker', {
    value: {
        register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
        ready: Promise.resolve(mockServiceWorkerRegistration),
        controller: { postMessage: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
    writable: true,
    configurable: true,
});

// Export mocks for test access
export { MockNotification, mockServiceWorkerRegistration, mockWakeLockSentinel };
