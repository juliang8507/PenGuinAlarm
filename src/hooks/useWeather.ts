import { useState, useEffect } from 'react';
import { t } from '../utils/i18n';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    minTemp: number;
    maxTemp: number;
    loading: boolean;
    error: string | null;
    isCached?: boolean;
}

interface UseWeatherOptions {
    enabled?: boolean;
}

const WEATHER_CACHE_KEY = 'nebula-weather-cache';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
    temperature: number;
    weatherCode: number;
    minTemp: number;
    maxTemp: number;
    timestamp: number;
}

const getCachedWeather = (): CachedWeather | null => {
    try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached) as CachedWeather;
        const now = Date.now();

        // Return cached data if it's not expired
        if (now - data.timestamp < CACHE_EXPIRY_MS) {
            return data;
        }
        return null;
    } catch {
        return null;
    }
};

const setCachedWeather = (data: Omit<CachedWeather, 'timestamp'>) => {
    try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
            ...data,
            timestamp: Date.now(),
        }));
    } catch {
        // Silently fail if localStorage is unavailable
    }
};

/**
 * Fetch weather data based on user location
 * @param options.enabled - Only fetch when true (user opt-in for privacy)
 */
export const useWeather = ({ enabled = false }: UseWeatherOptions = {}) => {
    const [weather, setWeather] = useState<WeatherData>(() => {
        // If disabled, don't try to load cached data - return empty state
        if (!enabled) {
            return {
                temperature: 0,
                weatherCode: -1, // -1 indicates disabled/no data (0 is valid "Clear" weather)
                minTemp: 0,
                maxTemp: 0,
                loading: false,
                error: null,
            };
        }

        // Try to load cached weather on initial render
        const cached = getCachedWeather();
        if (cached) {
            return {
                temperature: cached.temperature,
                weatherCode: cached.weatherCode,
                minTemp: cached.minTemp,
                maxTemp: cached.maxTemp,
                loading: false,
                error: null,
                isCached: true,
            };
        }

        return {
            temperature: 0,
            weatherCode: -1, // -1 indicates disabled/no data
            minTemp: 0,
            maxTemp: 0,
            loading: typeof navigator !== 'undefined' && !!navigator.geolocation,
            error: typeof navigator !== 'undefined' && !navigator.geolocation
                ? t('errorNetwork')
                : null,
        };
    });

    // Separate effect to handle enabled→disabled transition without cascading renders
    useEffect(() => {
        if (!enabled) {
            // Use queueMicrotask to avoid synchronous setState in effect body
            queueMicrotask(() => {
                setWeather({
                    temperature: 0,
                    weatherCode: -1,
                    minTemp: 0,
                    maxTemp: 0,
                    loading: false,
                    error: null,
                });
            });
        }
    }, [enabled]);

    useEffect(() => {
        // Skip if disabled - handled by separate effect above
        if (!enabled) {
            return;
        }

        // Skip geolocation request if geolocation not available
        if (!navigator.geolocation) {
            return;
        }

        let isMounted = true;

        const fetchWeather = () => {
            // Skip fetch if offline - use cached data
            if (!navigator.onLine) {
                const cached = getCachedWeather();
                if (cached) {
                    setWeather({
                        temperature: cached.temperature,
                        weatherCode: cached.weatherCode,
                        minTemp: cached.minTemp,
                        maxTemp: cached.maxTemp,
                        loading: false,
                        error: null,
                        isCached: true,
                    });
                } else {
                    setWeather(prev => ({
                        ...prev,
                        loading: false,
                        error: t('errorNetwork'),
                    }));
                }
                return;
            }

            // Set loading state before fetch
            setWeather(prev => ({ ...prev, loading: true, error: null }));

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    if (!isMounted) return;
                    try {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(
                            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
                        );
                        const data = await response.json();

                        const weatherData = {
                            temperature: Math.round(data.current.temperature_2m),
                            weatherCode: data.current.weather_code,
                            minTemp: Math.round(data.daily.temperature_2m_min[0]),
                            maxTemp: Math.round(data.daily.temperature_2m_max[0]),
                        };

                        // Cache the weather data
                        setCachedWeather(weatherData);

                        if (isMounted) {
                            setWeather({
                                ...weatherData,
                                loading: false,
                                error: null,
                                isCached: false,
                            });
                        }
                    } catch {
                        if (isMounted) {
                            // Try to use cached data on error
                            const cached = getCachedWeather();
                            if (cached) {
                                setWeather({
                                    temperature: cached.temperature,
                                    weatherCode: cached.weatherCode,
                                    minTemp: cached.minTemp,
                                    maxTemp: cached.maxTemp,
                                    loading: false,
                                    error: null,
                                    isCached: true,
                                });
                            } else {
                                setWeather(prev => ({ ...prev, loading: false, error: t('errorNetwork') }));
                            }
                        }
                    }
                },
                () => {
                    if (isMounted) {
                        setWeather(prev => ({ ...prev, loading: false, error: t('errorPermission') }));
                    }
                }
            );
        };

        // Initial fetch
        fetchWeather();

        // Retry when coming back online
        const handleOnline = () => {
            if (isMounted) {
                fetchWeather();
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            isMounted = false;
            window.removeEventListener('online', handleOnline);
        };
    }, [enabled]);

    return weather;
};

