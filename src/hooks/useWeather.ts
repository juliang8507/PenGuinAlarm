import { useState, useEffect } from 'react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
    minTemp: number;
    maxTemp: number;
    loading: boolean;
    error: string | null;
}

interface UseWeatherOptions {
    enabled?: boolean;
}

/**
 * Fetch weather data based on user location
 * @param options.enabled - Only fetch when true (user opt-in for privacy)
 */
export const useWeather = ({ enabled = false }: UseWeatherOptions = {}) => {
    const [weather, setWeather] = useState<WeatherData>(() => ({
        temperature: 0,
        weatherCode: 0,
        minTemp: 0,
        maxTemp: 0,
        loading: enabled && typeof navigator !== 'undefined' && !!navigator.geolocation,
        error: enabled && typeof navigator !== 'undefined' && !navigator.geolocation
            ? 'Geolocation not supported'
            : null,
    }));

    useEffect(() => {
        // Skip geolocation request if user hasn't opted in or geolocation not available
        if (!enabled || !navigator.geolocation) {
            return;
        }

        let isMounted = true;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                if (!isMounted) return;
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
                    );
                    const data = await response.json();

                    if (isMounted) {
                        setWeather({
                            temperature: Math.round(data.current.temperature_2m),
                            weatherCode: data.current.weather_code,
                            minTemp: Math.round(data.daily.temperature_2m_min[0]),
                            maxTemp: Math.round(data.daily.temperature_2m_max[0]),
                            loading: false,
                            error: null,
                        });
                    }
                } catch {
                    if (isMounted) {
                        setWeather(prev => ({ ...prev, loading: false, error: 'Failed to fetch weather' }));
                    }
                }
            },
            () => {
                if (isMounted) {
                    setWeather(prev => ({ ...prev, loading: false, error: 'Location permission denied' }));
                }
            }
        );

        return () => {
            isMounted = false;
        };
    }, [enabled]);

    return weather;
};
