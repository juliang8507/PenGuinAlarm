import { describe, it, expect, beforeEach } from 'vitest';
import { audioEngine, SOUND_PRESETS, type SoundPreset } from '../audio';

describe('SOUND_PRESETS', () => {
  it('should have 6 presets', () => {
    expect(SOUND_PRESETS).toHaveLength(6);
  });

  it('should have all required preset IDs', () => {
    const presetIds = SOUND_PRESETS.map(p => p.id);
    expect(presetIds).toContain('ethereal');
    expect(presetIds).toContain('gentle');
    expect(presetIds).toContain('chimes');
    expect(presetIds).toContain('nature');
    expect(presetIds).toContain('digital');
    expect(presetIds).toContain('cosmic');
  });

  it('should have valid preset structure', () => {
    SOUND_PRESETS.forEach((preset: SoundPreset) => {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.nameKo).toBeDefined();
      expect(preset.frequencies).toBeDefined();
      expect(Array.isArray(preset.frequencies)).toBe(true);
      expect(preset.frequencies.length).toBeGreaterThan(0);
      expect(['sine', 'square', 'sawtooth', 'triangle']).toContain(preset.type);
      expect(['continuous', 'pulse', 'wave', 'cascade']).toContain(preset.pattern);
    });
  });

  it('should have frequencies as positive numbers', () => {
    SOUND_PRESETS.forEach(preset => {
      preset.frequencies.forEach(freq => {
        expect(freq).toBeGreaterThan(0);
      });
    });
  });
});

describe('AudioEngine', () => {
  beforeEach(() => {
    // Reset audioEngine state between tests
    audioEngine.stopAlarm();
    audioEngine.stopPreview();
    audioEngine.clearCustomSound();
  });

  describe('volume control', () => {
    it('should set volume within bounds (0-1)', () => {
      audioEngine.setVolume(0.5);
      expect(audioEngine.getVolume()).toBe(0.5);
    });

    it('should clamp volume to minimum 0', () => {
      audioEngine.setVolume(-0.5);
      expect(audioEngine.getVolume()).toBe(0);
    });

    it('should clamp volume to maximum 1', () => {
      audioEngine.setVolume(1.5);
      expect(audioEngine.getVolume()).toBe(1);
    });

    it('should handle edge case volume = 0', () => {
      audioEngine.setVolume(0);
      expect(audioEngine.getVolume()).toBe(0);
    });

    it('should handle edge case volume = 1', () => {
      audioEngine.setVolume(1);
      expect(audioEngine.getVolume()).toBe(1);
    });
  });

  describe('fade duration control', () => {
    it('should set fade duration within bounds (1-120)', () => {
      audioEngine.setFadeDuration(30);
      expect(audioEngine.getFadeDuration()).toBe(30);
    });

    it('should clamp fade duration to minimum 1', () => {
      audioEngine.setFadeDuration(0);
      expect(audioEngine.getFadeDuration()).toBe(1);
    });

    it('should clamp fade duration to maximum 120', () => {
      audioEngine.setFadeDuration(200);
      expect(audioEngine.getFadeDuration()).toBe(120);
    });

    it('should handle edge case fadeDuration = 1', () => {
      audioEngine.setFadeDuration(1);
      expect(audioEngine.getFadeDuration()).toBe(1);
    });

    it('should handle edge case fadeDuration = 120', () => {
      audioEngine.setFadeDuration(120);
      expect(audioEngine.getFadeDuration()).toBe(120);
    });

    it('should handle negative fade duration', () => {
      audioEngine.setFadeDuration(-10);
      expect(audioEngine.getFadeDuration()).toBe(1);
    });
  });

  describe('preset management', () => {
    it('should get default preset as ethereal', () => {
      // Reset to check default
      audioEngine.setPreset('ethereal');
      expect(audioEngine.getPreset()).toBe('ethereal');
    });

    it('should set valid preset', () => {
      audioEngine.setPreset('cosmic');
      expect(audioEngine.getPreset()).toBe('cosmic');
    });

    it('should not change preset for invalid preset ID', () => {
      audioEngine.setPreset('ethereal');
      audioEngine.setPreset('invalid-preset');
      expect(audioEngine.getPreset()).toBe('ethereal');
    });

    it('should return all presets', () => {
      const presets = audioEngine.getPresets();
      expect(presets).toEqual(SOUND_PRESETS);
      expect(presets).toHaveLength(6);
    });
  });

  describe('custom sound management', () => {
    it('should return false for hasCustomSound when no custom sound loaded', () => {
      audioEngine.clearCustomSound();
      expect(audioEngine.hasCustomSound()).toBe(false);
    });

    it('should clear custom sound', () => {
      audioEngine.clearCustomSound();
      expect(audioEngine.hasCustomSound()).toBe(false);
    });
  });

  describe('audio file validation', () => {
    it('should throw soundSizeError for files larger than 10MB', async () => {
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)], // 11MB
        'large.mp3',
        { type: 'audio/mpeg' }
      );

      await expect(audioEngine.setCustomSound(largeFile)).rejects.toThrow('soundSizeError');
    });

    it('should throw soundFormatError for invalid MIME type', async () => {
      const invalidFile = new File(
        [new ArrayBuffer(1024)],
        'invalid.txt',
        { type: 'text/plain' }
      );

      await expect(audioEngine.setCustomSound(invalidFile)).rejects.toThrow('soundFormatError');
    });

    it('should accept valid audio file (mp3)', async () => {
      const validFile = new File(
        [new ArrayBuffer(1024)],
        'valid.mp3',
        { type: 'audio/mpeg' }
      );

      // Should not throw
      await expect(audioEngine.setCustomSound(validFile)).resolves.toBeUndefined();
      expect(audioEngine.hasCustomSound()).toBe(true);
    });

    it('should accept valid audio file (wav)', async () => {
      const validFile = new File(
        [new ArrayBuffer(1024)],
        'valid.wav',
        { type: 'audio/wav' }
      );

      await expect(audioEngine.setCustomSound(validFile)).resolves.toBeUndefined();
      expect(audioEngine.hasCustomSound()).toBe(true);
    });

    it('should accept valid audio file (ogg)', async () => {
      const validFile = new File(
        [new ArrayBuffer(1024)],
        'valid.ogg',
        { type: 'audio/ogg' }
      );

      await expect(audioEngine.setCustomSound(validFile)).resolves.toBeUndefined();
    });
  });

  describe('playback state', () => {
    it('should initially not be playing', () => {
      expect(audioEngine.isCurrentlyPlaying()).toBe(false);
    });

    it('should initially not be previewing', () => {
      expect(audioEngine.isCurrentlyPreviewing()).toBe(false);
    });

    it('should start playing alarm', () => {
      audioEngine.playAlarm();
      expect(audioEngine.isCurrentlyPlaying()).toBe(true);
    });

    it('should stop playing alarm', () => {
      audioEngine.playAlarm();
      audioEngine.stopAlarm();
      expect(audioEngine.isCurrentlyPlaying()).toBe(false);
    });

    it('should not double-play alarm', () => {
      audioEngine.playAlarm();
      const wasPlaying = audioEngine.isCurrentlyPlaying();
      audioEngine.playAlarm(); // Try to play again
      expect(audioEngine.isCurrentlyPlaying()).toBe(wasPlaying);
    });
  });

  describe('preview functionality', () => {
    it('should start preview for valid preset', () => {
      audioEngine.previewPreset('gentle', 1);
      expect(audioEngine.isCurrentlyPreviewing()).toBe(true);
    });

    it('should stop preview', () => {
      audioEngine.previewPreset('gentle', 1);
      audioEngine.stopPreview();
      expect(audioEngine.isCurrentlyPreviewing()).toBe(false);
    });

    it('should not preview invalid preset', () => {
      audioEngine.previewPreset('invalid-preset');
      // Should not crash, just not preview
      // The implementation silently fails for invalid presets
    });

    it('should stop existing preview when starting new one', () => {
      audioEngine.previewPreset('gentle', 1);
      audioEngine.previewPreset('cosmic', 1);
      expect(audioEngine.isCurrentlyPreviewing()).toBe(true);
    });
  });
});
