import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AlarmScheduler, type SchedulerConfig, type SchedulerCallbacks } from '../scheduler';


describe('AlarmScheduler', () => {
  let scheduler: AlarmScheduler;
  let mockCallbacks: SchedulerCallbacks;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new AlarmScheduler();
    mockCallbacks = {
      onAlarm: vi.fn(),
      onNextAlarmUpdate: vi.fn(),
      onVisibilityChange: vi.fn(),
    };
  });

  afterEach(() => {
    scheduler.destroy();
    vi.useRealTimers();
  });

  describe('calculateNextAlarmTime - daily mode', () => {
    it('should return next alarm time for today if not passed', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 30,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm).not.toBeNull();
      expect(nextAlarm?.getHours()).toBe(9);
      expect(nextAlarm?.getMinutes()).toBe(30);
      expect(nextAlarm?.getDate()).toBe(15); // Today
    });

    it('should return next alarm time for tomorrow if today passed', () => {
      const now = new Date('2024-01-15T10:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 30,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm).not.toBeNull();
      expect(nextAlarm?.getHours()).toBe(9);
      expect(nextAlarm?.getMinutes()).toBe(30);
      expect(nextAlarm?.getDate()).toBe(16); // Tomorrow
    });

    it('should return tomorrow if current time equals alarm time', () => {
      const now = new Date('2024-01-15T09:30:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 30,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm?.getDate()).toBe(16); // Tomorrow because isEqual check
    });

    it('should return null when disabled', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 30,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: false,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm).toBeNull();
    });
  });

  describe('calculateNextAlarmTime - every-other-day mode', () => {
    it('should return next work day alarm (even day from start)', () => {
      // startDate = Jan 1, 2024 (Day 0 = work day)
      // Jan 15, 2024 = Day 14 (even, work day)
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'every-other-day',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm).not.toBeNull();
      // Jan 15 is 14 days from Jan 1 (even), so today is work day
      expect(nextAlarm?.getDate()).toBe(15);
    });

    it('should skip to next work day if today is rest day', () => {
      // startDate = Jan 1, 2024 (Day 0 = work day)
      // Jan 14, 2024 = Day 13 (odd, rest day)
      // Jan 15, 2024 = Day 14 (even, work day)
      const now = new Date('2024-01-14T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'every-other-day',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm).not.toBeNull();
      // Today (14th) is rest day, so next is 15th
      expect(nextAlarm?.getDate()).toBe(15);
    });

    it('should skip to next work day if alarm time passed on work day', () => {
      // startDate = Jan 1, 2024
      // Jan 15 = Day 14 (work day) but alarm passed
      // Jan 17 = Day 16 (next work day)
      const now = new Date('2024-01-15T10:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'every-other-day',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      const nextAlarm = scheduler.calculateNextAlarmTime(now);

      expect(nextAlarm).not.toBeNull();
      // Jan 16 = Day 15 (odd, rest), Jan 17 = Day 16 (even, work)
      expect(nextAlarm?.getDate()).toBe(17);
    });
  });

  describe('isWorkDay', () => {
    it('should return true for daily mode regardless of date', () => {
      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);

      expect(scheduler.isWorkDay(new Date('2024-01-15'))).toBe(true);
      expect(scheduler.isWorkDay(new Date('2024-01-16'))).toBe(true);
    });

    it('should return true for even days from start in every-other-day mode', () => {
      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'every-other-day',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);

      // Day 0 (Jan 1) = work day
      expect(scheduler.isWorkDay(new Date('2024-01-01'))).toBe(true);
      // Day 2 (Jan 3) = work day
      expect(scheduler.isWorkDay(new Date('2024-01-03'))).toBe(true);
      // Day 4 (Jan 5) = work day
      expect(scheduler.isWorkDay(new Date('2024-01-05'))).toBe(true);
    });

    it('should return false for odd days from start in every-other-day mode', () => {
      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'every-other-day',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);

      // Day 1 (Jan 2) = rest day
      expect(scheduler.isWorkDay(new Date('2024-01-02'))).toBe(false);
      // Day 3 (Jan 4) = rest day
      expect(scheduler.isWorkDay(new Date('2024-01-04'))).toBe(false);
      // Day 5 (Jan 6) = rest day
      expect(scheduler.isWorkDay(new Date('2024-01-06'))).toBe(false);
    });

    it('should return true when no config is set', () => {
      // Without init, config is null
      const uninitScheduler = new AlarmScheduler();
      expect(uninitScheduler.isWorkDay(new Date())).toBe(true);
      uninitScheduler.destroy();
    });
  });

  describe('config update', () => {
    it('should update alarm time', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      scheduler.updateConfig({ alarmHour: 10, alarmMinute: 30 });

      const nextAlarm = scheduler.calculateNextAlarmTime(now);
      expect(nextAlarm?.getHours()).toBe(10);
      expect(nextAlarm?.getMinutes()).toBe(30);
    });

    it('should update recurrence mode', () => {
      const now = new Date('2024-01-14T08:00:00'); // Day 13 from Jan 1
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);

      // With daily, should be today
      let nextAlarm = scheduler.calculateNextAlarmTime(now);
      expect(nextAlarm?.getDate()).toBe(14);

      // Switch to every-other-day
      scheduler.updateConfig({ recurrence: 'every-other-day' });

      // Day 13 is odd (rest day), so next work day is Day 14 (Jan 15)
      nextAlarm = scheduler.calculateNextAlarmTime(now);
      expect(nextAlarm?.getDate()).toBe(15);
    });

    it('should disable scheduler', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      scheduler.updateConfig({ enabled: false });

      expect(scheduler.getNextAlarmTime()).toBeNull();
      expect(mockCallbacks.onNextAlarmUpdate).toHaveBeenCalledWith(null);
    });

    it('should re-enable scheduler', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: false,
      };

      scheduler.init(config, mockCallbacks);
      expect(scheduler.getNextAlarmTime()).toBeNull();

      scheduler.updateConfig({ enabled: true });
      expect(scheduler.getNextAlarmTime()).not.toBeNull();
    });
  });

  describe('getNextAlarmTime', () => {
    it('should return null before init', () => {
      const uninitScheduler = new AlarmScheduler();
      expect(uninitScheduler.getNextAlarmTime()).toBeNull();
      uninitScheduler.destroy();
    });

    it('should return scheduled time after init', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 30,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);

      const nextAlarm = scheduler.getNextAlarmTime();
      expect(nextAlarm).not.toBeNull();
      expect(nextAlarm?.getHours()).toBe(9);
      expect(nextAlarm?.getMinutes()).toBe(30);
    });
  });

  describe('stop and destroy', () => {
    it('should clear next alarm time on stop', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      expect(scheduler.getNextAlarmTime()).not.toBeNull();

      scheduler.stop();
      expect(scheduler.getNextAlarmTime()).toBeNull();
      expect(mockCallbacks.onNextAlarmUpdate).toHaveBeenCalledWith(null);
    });

    it('should handle multiple stop calls gracefully', () => {
      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);
      scheduler.stop();
      scheduler.stop(); // Should not throw
    });

    it('should handle destroy without init', () => {
      const uninitScheduler = new AlarmScheduler();
      uninitScheduler.destroy(); // Should not throw
    });
  });

  describe('alarm triggering', () => {
    it('should call onNextAlarmUpdate with next alarm time', () => {
      const now = new Date('2024-01-15T08:00:00');
      vi.setSystemTime(now);

      const config: SchedulerConfig = {
        alarmHour: 9,
        alarmMinute: 0,
        recurrence: 'daily',
        startDate: new Date('2024-01-01'),
        enabled: true,
      };

      scheduler.init(config, mockCallbacks);

      expect(mockCallbacks.onNextAlarmUpdate).toHaveBeenCalled();
      const lastCall = (mockCallbacks.onNextAlarmUpdate as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0];
      expect(lastCall[0]).not.toBeNull();
    });
  });
});
