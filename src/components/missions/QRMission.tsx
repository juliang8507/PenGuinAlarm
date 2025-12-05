import React, { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { t } from '../../utils/i18n';

interface QRMissionProps {
    registeredCode: string | null;
    onComplete: () => void;
    onFail: () => void;
    onRegister?: (code: string) => void;
    onFallbackToMath?: () => void;
}

const QRMission: React.FC<QRMissionProps> = ({ registeredCode, onComplete, onFail, onRegister, onFallbackToMath }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    const isRegistrationMode = !registeredCode && onRegister;

    // Start camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false,
                });
                streamRef.current = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setIsLoading(false);
            } catch (err) {
                console.error('Camera access error:', err);
                setError(t('cameraError'));
                setIsLoading(false);
            }
        };

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Scan QR code from video
    const scanQRCode = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !isScanning) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            setScannedCode(code.data);
            setIsScanning(false);

            // Stop camera
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }
    }, [isScanning, stream]);

    // Continuously scan for QR codes
    useEffect(() => {
        if (!isLoading && isScanning) {
            const intervalId = setInterval(scanQRCode, 200);
            return () => clearInterval(intervalId);
        }
    }, [isLoading, isScanning, scanQRCode]);

    // Handle scanned code
    const handleConfirm = () => {
        if (!scannedCode) return;

        if (isRegistrationMode && onRegister) {
            onRegister(scannedCode);
        } else if (registeredCode && scannedCode === registeredCode) {
            onComplete();
        } else {
            onFail();
        }
    };

    // Reset and scan again
    const handleRescan = async () => {
        setScannedCode(null);
        setIsScanning(true);
        setIsLoading(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setIsLoading(false);
        } catch (err) {
            console.error('Camera access error:', err);
            setError(t('cameraError'));
            setIsLoading(false);
        }
    };

    const isCodeMatch = registeredCode && scannedCode === registeredCode;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isRegistrationMode ? `🔗 ${t('registerQrCode')}` : `📱 ${t('qrMission')}`}
                </h2>
                <p className="text-white/70">
                    {isRegistrationMode
                        ? t('registerQR')
                        : t('scanQR')}
                </p>
            </div>

            {error ? (
                <div className="space-y-4">
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-red-400">{error}</p>
                        <p className="text-white/50 text-sm mt-2">{t('cameraPermissionDenied')}</p>
                    </div>
                    {onFallbackToMath && (
                        <button
                            onClick={onFallbackToMath}
                            className="w-full py-3 bg-nebula-500 text-white font-bold rounded-xl hover:bg-nebula-400 transition-colors"
                        >
                            {t('fallbackToMath')}
                        </button>
                    )}
                </div>
            ) : isLoading ? (
                <div className="aspect-video bg-white/10 rounded-xl flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full" />
                </div>
            ) : scannedCode ? (
                <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${isRegistrationMode || isCodeMatch ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                        <p className="text-sm text-white/70 mb-1">{t('scannedCode')}:</p>
                        <p className="text-white font-mono text-sm break-all">{scannedCode}</p>
                    </div>
                    {!isRegistrationMode && !isCodeMatch && (
                        <p className="text-red-400 text-center text-sm">❌ {t('qrMismatch')}</p>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={handleRescan}
                            className="flex-1 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors"
                        >
                            {t('rescan')}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!isRegistrationMode && !isCodeMatch}
                            className={`flex-1 py-3 font-bold rounded-xl transition-colors ${isRegistrationMode || isCodeMatch
                                ? 'bg-green-500 text-white hover:bg-green-400'
                                : 'bg-gray-500/50 text-white/50 cursor-not-allowed'
                                }`}
                        >
                            {isRegistrationMode ? t('register') : t('confirm')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full aspect-video object-cover"
                    />
                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-4 border-white/50 rounded-lg animate-pulse" />
                    </div>
                </div>
            )}

            {/* Hidden canvas for QR processing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default QRMission;
