// Safari compatibility type declaration
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

// Sound preset definitions
export interface SoundPreset {
    id: string;
    name: string;
    nameKo: string;
    frequencies: number[];
    type: OscillatorType;
    pattern: 'continuous' | 'pulse' | 'wave' | 'cascade';
    modulationRate?: number;
}

export const SOUND_PRESETS: SoundPreset[] = [
    {
        id: 'ethereal',
        name: 'Ethereal',
        nameKo: '신비로운',
        frequencies: [440, 554.37, 659.25], // A4, C#5, E5 (A major chord)
        type: 'sine',
        pattern: 'wave',
        modulationRate: 0.5,
    },
    {
        id: 'gentle',
        name: 'Gentle Bells',
        nameKo: '부드러운 종소리',
        frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 (C major chord)
        type: 'sine',
        pattern: 'pulse',
        modulationRate: 2,
    },
    {
        id: 'chimes',
        name: 'Wind Chimes',
        nameKo: '윈드차임',
        frequencies: [880, 1108.73, 1318.51, 1567.98], // A5, C#6, E6, G6
        type: 'triangle',
        pattern: 'cascade',
        modulationRate: 3,
    },
    {
        id: 'nature',
        name: 'Morning Birds',
        nameKo: '새소리',
        frequencies: [1200, 1400, 1600, 1800],
        type: 'sine',
        pattern: 'cascade',
        modulationRate: 4,
    },
    {
        id: 'digital',
        name: 'Digital Pulse',
        nameKo: '디지털 펄스',
        frequencies: [440, 880],
        type: 'square',
        pattern: 'pulse',
        modulationRate: 1,
    },
    {
        id: 'cosmic',
        name: 'Cosmic Waves',
        nameKo: '우주 파동',
        frequencies: [220, 277.18, 329.63, 440],
        type: 'sine',
        pattern: 'wave',
        modulationRate: 0.3,
    },
];

// Highlight detection result interface
export interface HighlightResult {
    offset: number;        // Start position in seconds
    duration: number;      // Total audio duration
    confidence: number;    // 0-1, how confident we are this is the "best" part
    analyzing: boolean;    // Whether analysis is in progress
}

class AudioEngine {
    private ctx: AudioContext | null = null;
    private oscillators: OscillatorNode[] = [];
    private gainNodes: GainNode[] = [];
    private masterGain: GainNode | null = null;
    private customBuffer: AudioBuffer | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private isPlaying: boolean = false;
    private isPreviewing: boolean = false;
    private previewTimeout: ReturnType<typeof setTimeout> | null = null;

    // Configurable settings
    private volume: number = 0.7;
    private fadeDuration: number = 30; // seconds
    private currentPreset: string = 'ethereal';

    // Highlight detection
    private highlightOffset: number = 0;  // Start position for custom sound
    private highlightConfidence: number = 0;
    private isAnalyzing: boolean = false;

    constructor() {
        // Initialize on user interaction usually, but we'll setup the context lazily
    }

    private init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
    }

    /**
     * Set volume level (0-1)
     */
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx?.currentTime || 0);
        }
    }

    /**
     * Get current volume level
     */
    public getVolume(): number {
        return this.volume;
    }

    /**
     * Set fade duration in seconds
     */
    public setFadeDuration(seconds: number): void {
        this.fadeDuration = Math.max(1, Math.min(120, seconds));
    }

    /**
     * Get fade duration
     */
    public getFadeDuration(): number {
        return this.fadeDuration;
    }

    /**
     * Set current sound preset
     */
    public setPreset(presetId: string): void {
        const preset = SOUND_PRESETS.find(p => p.id === presetId);
        if (preset) {
            this.currentPreset = presetId;
        }
    }

    /**
     * Get current preset ID
     */
    public getPreset(): string {
        return this.currentPreset;
    }

    /**
     * Get all available presets
     */
    public getPresets(): SoundPreset[] {
        return SOUND_PRESETS;
    }

    /**
     * Validate audio file before decoding
     * @throws Error with i18n key if validation fails
     */
    private validateAudioFile(file: File): void {
        // No file size limit - users can use any audio file from their device

        // MIME type validation
        const validTypes = [
            'audio/mpeg',      // MP3
            'audio/mp3',
            'audio/wav',
            'audio/wave',
            'audio/x-wav',
            'audio/ogg',
            'audio/webm',
            'audio/aac',
            'audio/mp4',
            'audio/x-m4a',
            'audio/flac',
        ];

        // Check MIME type if available
        if (file.type && !validTypes.includes(file.type.toLowerCase())) {
            throw new Error('soundFormatError');
        }

        // Fallback: check file extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        const validExtensions = ['mp3', 'wav', 'ogg', 'webm', 'aac', 'm4a', 'flac'];
        if (!file.type && extension && !validExtensions.includes(extension)) {
            throw new Error('soundFormatError');
        }
    }

    /**
     * Detect the highlight (most energetic/exciting part) of an audio buffer
     * Uses energy analysis with multiple window sizes to find the "drop" or chorus
     */
    private detectHighlight(buffer: AudioBuffer): { offset: number; confidence: number } {
        const channelData = buffer.getChannelData(0); // Use first channel
        const sampleRate = buffer.sampleRate;
        const duration = buffer.duration;

        // Skip very short audio files (< 10 seconds)
        if (duration < 10) {
            return { offset: 0, confidence: 0.5 };
        }

        // Window size: 5 seconds for energy analysis
        const windowSize = Math.floor(sampleRate * 5);
        const hopSize = Math.floor(sampleRate * 1); // 1 second hop for finer resolution
        const numWindows = Math.floor((channelData.length - windowSize) / hopSize) + 1;

        if (numWindows < 3) {
            return { offset: 0, confidence: 0.5 };
        }

        // Calculate RMS energy for each window
        const energies: number[] = [];
        for (let i = 0; i < numWindows; i++) {
            const start = i * hopSize;
            const end = Math.min(start + windowSize, channelData.length);

            let sumSquares = 0;
            for (let j = start; j < end; j++) {
                sumSquares += channelData[j] * channelData[j];
            }
            const rms = Math.sqrt(sumSquares / (end - start));
            energies.push(rms);
        }

        // Find the peak energy region
        // Look for sustained high energy (not just a spike)
        let maxEnergySum = 0;
        let maxEnergyIndex = 0;
        const sustainedWindowCount = 3; // Look for 3 consecutive high-energy windows

        for (let i = 0; i <= energies.length - sustainedWindowCount; i++) {
            let sum = 0;
            for (let j = 0; j < sustainedWindowCount; j++) {
                sum += energies[i + j];
            }
            if (sum > maxEnergySum) {
                maxEnergySum = sum;
                maxEnergyIndex = i;
            }
        }

        // Calculate confidence based on how much higher the peak is compared to average
        const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const peakEnergy = maxEnergySum / sustainedWindowCount;
        const confidence = Math.min(1, Math.max(0.3, (peakEnergy / avgEnergy - 1) / 2 + 0.5));

        // Calculate the offset in seconds
        // Start slightly before the peak for better user experience
        const peakOffsetSeconds = (maxEnergyIndex * hopSize) / sampleRate;
        const adjustedOffset = Math.max(0, peakOffsetSeconds - 2); // Start 2 seconds before peak

        // Don't start too close to the end (leave at least 30 seconds)
        const maxOffset = Math.max(0, duration - 30);
        const finalOffset = Math.min(adjustedOffset, maxOffset);

        return { offset: finalOffset, confidence };
    }

    /**
     * Set custom sound from file with automatic highlight detection
     * @throws Error with i18n key if validation or decoding fails
     */
    public async setCustomSound(file: File): Promise<HighlightResult> {
        // Validate file before processing
        this.validateAudioFile(file);

        this.init();
        if (!this.ctx) {
            throw new Error('soundLoadError');
        }

        this.isAnalyzing = true;

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.customBuffer = await this.ctx.decodeAudioData(arrayBuffer);

            // Detect highlight automatically
            const { offset, confidence } = this.detectHighlight(this.customBuffer);
            this.highlightOffset = offset;
            this.highlightConfidence = confidence;
            this.isAnalyzing = false;

            return {
                offset: this.highlightOffset,
                duration: this.customBuffer.duration,
                confidence: this.highlightConfidence,
                analyzing: false,
            };
        } catch (e) {
            this.isAnalyzing = false;
            // decodeAudioData failed - format not supported by browser
            console.error('Audio decode failed:', e);
            throw new Error('soundFormatError');
        }
    }

    /**
     * Get current highlight information
     */
    public getHighlightInfo(): HighlightResult | null {
        if (!this.customBuffer) return null;
        return {
            offset: this.highlightOffset,
            duration: this.customBuffer.duration,
            confidence: this.highlightConfidence,
            analyzing: this.isAnalyzing,
        };
    }

    /**
     * Manually set highlight offset (user override)
     */
    public setHighlightOffset(offset: number): void {
        if (this.customBuffer) {
            this.highlightOffset = Math.max(0, Math.min(offset, this.customBuffer.duration - 10));
            this.highlightConfidence = 1; // User-set = 100% confidence
        }
    }

    /**
     * Get highlight offset in seconds
     */
    public getHighlightOffset(): number {
        return this.highlightOffset;
    }

    /**
     * Clear custom sound and highlight info
     */
    public clearCustomSound(): void {
        this.customBuffer = null;
        this.highlightOffset = 0;
        this.highlightConfidence = 0;
    }

    /**
     * Check if custom sound is loaded
     */
    public hasCustomSound(): boolean {
        return this.customBuffer !== null;
    }

    /**
     * Play a preset sound pattern
     */
    private playPreset(preset: SoundPreset, targetGain: GainNode): void {
        if (!this.ctx) return;

        const currentTime = this.ctx.currentTime;

        // Create oscillators for each frequency in the preset
        preset.frequencies.forEach((freq, index) => {
            const osc = this.ctx!.createOscillator();
            const oscGain = this.ctx!.createGain();

            osc.type = preset.type;
            osc.frequency.setValueAtTime(freq, currentTime);

            // Apply pattern-specific modulation
            switch (preset.pattern) {
                case 'wave':
                    // Slow frequency modulation for ethereal effect
                    if (preset.modulationRate) {
                        const lfo = this.ctx!.createOscillator();
                        const lfoGain = this.ctx!.createGain();
                        lfo.frequency.setValueAtTime(preset.modulationRate, currentTime);
                        lfoGain.gain.setValueAtTime(freq * 0.02, currentTime);
                        lfo.connect(lfoGain);
                        lfoGain.connect(osc.frequency);
                        lfo.start();
                        this.oscillators.push(lfo);
                    }
                    oscGain.gain.setValueAtTime(0.3 / preset.frequencies.length, currentTime);
                    break;

                case 'pulse':
                    // Pulsing volume for bell-like effect
                    if (preset.modulationRate) {
                        const pulseRate = preset.modulationRate;
                        const now = currentTime;
                        oscGain.gain.setValueAtTime(0, now);
                        // Create pulse pattern
                        for (let t = 0; t < 60; t += 1 / pulseRate) {
                            oscGain.gain.linearRampToValueAtTime(0.4 / preset.frequencies.length, now + t + 0.05);
                            oscGain.gain.linearRampToValueAtTime(0.1 / preset.frequencies.length, now + t + (1 / pulseRate) - 0.05);
                        }
                    }
                    break;

                case 'cascade': {
                    // Staggered entry for cascading effect
                    const delay = index * 0.3;
                    oscGain.gain.setValueAtTime(0, currentTime);
                    oscGain.gain.linearRampToValueAtTime(0.25 / preset.frequencies.length, currentTime + delay + 0.2);
                    if (preset.modulationRate) {
                        // Add slight detune modulation for shimmer
                        osc.detune.setValueAtTime(0, currentTime);
                        osc.detune.linearRampToValueAtTime(10, currentTime + 1);
                        osc.detune.linearRampToValueAtTime(-10, currentTime + 2);
                        osc.detune.linearRampToValueAtTime(0, currentTime + 3);
                    }
                    break;
                }

                default:
                    oscGain.gain.setValueAtTime(0.3 / preset.frequencies.length, currentTime);
            }

            osc.connect(oscGain);
            oscGain.connect(targetGain);
            osc.start();

            this.oscillators.push(osc);
            this.gainNodes.push(oscGain);
        });
    }

    /**
     * Play alarm sound
     */
    public playAlarm(): void {
        this.init();
        if (!this.ctx || this.isPlaying) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Create master gain for volume control
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // Fade in logic (Sunrise simulation for ears)
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(
            this.volume,
            this.ctx.currentTime + this.fadeDuration
        );

        if (this.customBuffer) {
            // Play custom sound from highlight position
            this.sourceNode = this.ctx.createBufferSource();
            this.sourceNode.buffer = this.customBuffer;
            this.sourceNode.loop = true;
            // Set loop points to start from highlight and loop back to it
            this.sourceNode.loopStart = this.highlightOffset;
            this.sourceNode.loopEnd = this.customBuffer.duration;
            this.sourceNode.connect(this.masterGain);
            // Start playback from highlight offset
            this.sourceNode.start(0, this.highlightOffset);
        } else {
            // Play preset sound
            const preset = SOUND_PRESETS.find(p => p.id === this.currentPreset) || SOUND_PRESETS[0];
            this.playPreset(preset, this.masterGain);
        }

        this.isPlaying = true;
    }

    /**
     * Stop alarm sound
     */
    public stopAlarm(): void {
        // Stop oscillators
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) {
                console.error('Error stopping oscillator', e);
            }
        });
        this.oscillators = [];

        // Disconnect gain nodes
        this.gainNodes.forEach(gain => {
            try {
                gain.disconnect();
            } catch (e) {
                console.error('Error disconnecting gain', e);
            }
        });
        this.gainNodes = [];

        // Stop source node (custom audio)
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
                console.error('Error stopping source node', e);
            }
            this.sourceNode = null;
        }

        // Disconnect master gain
        if (this.masterGain) {
            this.masterGain.disconnect();
            this.masterGain = null;
        }

        this.isPlaying = false;
    }

    /**
     * Preview a preset sound for a short duration
     */
    public previewPreset(presetId: string, duration: number = 3): void {
        if (this.isPreviewing) {
            this.stopPreview();
        }

        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const preset = SOUND_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        // Create temporary gain for preview
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume * 0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Play the preset
        this.playPreset(preset, this.masterGain);

        this.isPreviewing = true;

        // Auto-stop after duration
        this.previewTimeout = setTimeout(() => {
            this.stopPreview();
        }, duration * 1000);
    }

    /**
     * Preview custom sound
     */
    public previewCustomSound(duration: number = 3): void {
        if (!this.customBuffer) return;
        if (this.isPreviewing) {
            this.stopPreview();
        }

        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume * 0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sourceNode = this.ctx.createBufferSource();
        this.sourceNode.buffer = this.customBuffer;
        this.sourceNode.loop = false;
        this.sourceNode.connect(this.masterGain);
        // Start from highlight position for preview
        this.sourceNode.start(0, this.highlightOffset);

        this.isPreviewing = true;

        // Auto-stop after duration
        this.previewTimeout = setTimeout(() => {
            this.stopPreview();
        }, duration * 1000);
    }

    /**
     * Preview custom sound from a specific position
     */
    public previewFromPosition(position: number, duration: number = 5): void {
        if (!this.customBuffer) return;
        if (this.isPreviewing) {
            this.stopPreview();
        }

        this.init();
        if (!this.ctx) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume * 0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sourceNode = this.ctx.createBufferSource();
        this.sourceNode.buffer = this.customBuffer;
        this.sourceNode.loop = false;
        this.sourceNode.connect(this.masterGain);
        // Start from specified position
        const safePosition = Math.max(0, Math.min(position, this.customBuffer.duration - duration));
        this.sourceNode.start(0, safePosition);

        this.isPreviewing = true;

        // Auto-stop after duration
        this.previewTimeout = setTimeout(() => {
            this.stopPreview();
        }, duration * 1000);
    }

    /**
     * Stop preview
     */
    public stopPreview(): void {
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
            this.previewTimeout = null;
        }

        // Stop oscillators used in preview
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch {
                // Ignore errors during cleanup
            }
        });
        this.oscillators = [];

        // Disconnect gain nodes
        this.gainNodes.forEach(gain => {
            try {
                gain.disconnect();
            } catch {
                // Ignore errors during cleanup
            }
        });
        this.gainNodes = [];

        // Stop source node
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch {
                // Ignore errors during cleanup
            }
            this.sourceNode = null;
        }

        if (this.masterGain) {
            this.masterGain.disconnect();
            this.masterGain = null;
        }

        this.isPreviewing = false;
    }

    /**
     * Check if currently playing
     */
    public isCurrentlyPlaying(): boolean {
        return this.isPlaying;
    }

    /**
     * Check if currently previewing
     */
    public isCurrentlyPreviewing(): boolean {
        return this.isPreviewing;
    }
}

export const audioEngine = new AudioEngine();
