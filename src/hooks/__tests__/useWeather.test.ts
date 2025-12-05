import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeather } from '../useWeather';

describe('useWeather', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
  };

  const mockWeatherResponse = {
    current: {
      temperature_2m: 22.5,
      weather_code: 1,
    },
    daily: {
      temperature_2m_min: [18.3],
      temperature_2m_max: [26.7],
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // @ts-expect-error Mock geolocation
    navigator.geolocation = mockGeolocation;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('disabled state', () => {
    it('should return default values when disabled', () => {
      const { result } = renderHook(() => useWeather({ enabled: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.temperature).toBe(0);
      expect(result.current.weatherCode).toBe(0);
    });

    it('should return default values when no options provided', () => {
      const { result } = renderHook(() => useWeather());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not request geolocation when disabled', () => {
      renderHook(() => useWeather({ enabled: false }));

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });
  });

  describe('geolocation not supported', () => {
    it('should return error when geolocation is not supported', async () => {
      // @ts-expect-error Remove geolocation
      delete navigator.geolocation;

      const { result } = renderHook(() => useWeather({ enabled: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Geolocation not supported');
    });
  });

  describe('geolocation permission denied', () => {
    it('should return error when location permission is denied', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error({
            code: 1,
            message: 'User denied geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }
      );

      const { result } = renderHook(() => useWeather({ enabled: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Location permission denied');
    });
  });

  describe('successful weather fetch', () => {
    it('should fetch and return weather data', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success({
            coords: {
              latitude: 37.5665,
              longitude: 126.978,
              accuracy: 100,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve(mockWeatherResponse),
      });

      const { result } = renderHook(() => useWeather({ enabled: true }));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.temperature).toBe(23); // Math.round(22.5)
      expect(result.current.weatherCode).toBe(1);
      expect(result.current.minTemp).toBe(18); // Math.round(18.3)
      expect(result.current.maxTemp).toBe(27); // Math.round(26.7)
    });

    it('should call Open-Meteo API with correct coordinates', async () => {
      const latitude = 37.5665;
      const longitude = 126.978;

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success({
            coords: { latitude, longitude },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.resolve(mockWeatherResponse),
      });

      renderHook(() => useWeather({ enabled: true }));

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled();
      });

      const fetchUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(fetchUrl).toContain(`latitude=${latitude}`);
      expect(fetchUrl).toContain(`longitude=${longitude}`);
      expect(fetchUrl).toContain('api.open-meteo.com');
    });
  });

  describe('fetch failure', () => {
    it('should return error when fetch fails', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success({
            coords: { latitude: 37.5665, longitude: 126.978 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useWeather({ enabled: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch weather');
    });

    it('should return error when json parsing fails', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success: PositionCallback) => {
          success({
            coords: { latitude: 37.5665, longitude: 126.978 },
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      );

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const { result } = renderHook(() => useWeather({ enabled: true }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch weather');
    });
  });

  describe('enabled state changes', () => {
    it('should clear error when disabled after error', async () => {
      // @ts-expect-error Remove geolocation
      delete navigator.geolocation;

      const { result, rerender } = renderHook(
        ({ enabled }) => useWeather({ enabled }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Geolocation not supported');
      });

      // Restore geolocation for rerender
      // @ts-expect-error Mock geolocation
      navigator.geolocation = mockGeolocation;

      rerender({ enabled: false });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
