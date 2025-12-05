import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLanguage, getLanguage } from '../utils/i18n';

describe('i18n', () => {
    beforeEach(() => {
        setLanguage('ko'); // Reset to default
    });

    describe('setLanguage / getLanguage', () => {
        it('should default to Korean', () => {
            expect(getLanguage()).toBe('ko');
        });

        it('should switch to English', () => {
            setLanguage('en');
            expect(getLanguage()).toBe('en');
        });
    });

    describe('t() translations', () => {
        it('should return Korean translation by default', () => {
            expect(t('appName')).toBe('PenGuin Alarm');
        });

        it('should return English translation when language is en', () => {
            setLanguage('en');
            expect(t('appName')).toBe('PenGuin Alarm');
        });

        it('should translate difficulty levels in Korean', () => {
            expect(t('easy')).toBe('쉬움');
            expect(t('medium')).toBe('보통');
            expect(t('hard')).toBe('어려움');
        });

        it('should translate difficulty levels in English', () => {
            setLanguage('en');
            expect(t('easy')).toBe('Easy');
            expect(t('medium')).toBe('Medium');
            expect(t('hard')).toBe('Hard');
        });

        it('should translate mission types', () => {
            expect(t('typingMission')).toBe('타이핑 미션');
            expect(t('qrMission')).toBe('QR 코드 미션');
            expect(t('photoMission')).toBe('사진 미션');
        });

        it('should have all QR mission keys', () => {
            expect(t('noQrRegistered')).toBeTruthy();
            expect(t('useMathMission')).toBeTruthy();
            expect(t('registerQrCode')).toBeTruthy();
            expect(t('qrCodeRegistered')).toBeTruthy();
            expect(t('clearQrCode')).toBeTruthy();
        });

        it('should have all statistics dashboard keys', () => {
            expect(t('wakeUpStats')).toBeTruthy();
            expect(t('averageSnooze')).toBeTruthy();
            expect(t('successRate')).toBeTruthy();
            expect(t('avgDelay')).toBeTruthy();
            expect(t('export')).toBeTruthy();
            expect(t('clearStats')).toBeTruthy();
        });

        it('should have camera permission keys', () => {
            expect(t('cameraError')).toBeTruthy();
            expect(t('cameraPermissionDenied')).toBeTruthy();
            expect(t('fallbackToMath')).toBeTruthy();
        });
    });

    describe('translation completeness', () => {
        // This test ensures all Korean keys have English equivalents
        it('should have matching keys in both languages', () => {
            // Sample of important keys that must exist in both languages
            const importantKeys = [
                'appName',
                'snooze',
                'dismiss',
                'settings',
                'easy',
                'medium',
                'hard',
                'typingMission',
                'qrMission',
                'photoMission',
                'noQrRegistered',
                'useMathMission',
                'cameraError',
                'fallbackToMath',
                'export',
                'cancel',
                'delete',
                'close',
            ] as const;

            // Check Korean
            setLanguage('ko');
            for (const key of importantKeys) {
                const value = t(key);
                expect(value, `Korean key '${key}' should have a value`).toBeTruthy();
                expect(value, `Korean key '${key}' should not equal the key itself`).not.toBe(key);
            }

            // Check English
            setLanguage('en');
            for (const key of importantKeys) {
                const value = t(key);
                expect(value, `English key '${key}' should have a value`).toBeTruthy();
                expect(value, `English key '${key}' should not equal the key itself`).not.toBe(key);
            }
        });
    });
});
