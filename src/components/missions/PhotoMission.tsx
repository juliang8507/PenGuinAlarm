import React, { useRef, useState, useEffect, useCallback } from 'react';
import { t } from '../../utils/i18n';

interface PhotoMissionProps {
    onComplete: () => void;
    onFallbackToMath?: () => void;
}

const PhotoMission: React.FC<PhotoMissionProps> = ({ onComplete, onFallbackToMath }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Start camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
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

        // Cleanup on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);

        // Stop the camera
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }, [stream]);

    // Confirm and complete
    const handleConfirm = () => {
        onComplete();
    };

    // Retake photo
    const handleRetake = async () => {
        setCapturedImage(null);
        setIsLoading(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
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

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">📸 {t('photoMission')}</h2>
                <p className="text-white/70">{t('photoMissionDesc')}</p>
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
            ) : capturedImage ? (
                <div className="space-y-4">
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full aspect-video object-cover rounded-xl"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleRetake}
                            className="flex-1 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors"
                        >
                            {t('retake')}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-400 transition-colors"
                        >
                            {t('confirm')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full aspect-video object-cover"
                        />
                    </div>
                    <button
                        onClick={capturePhoto}
                        className="w-full py-4 bg-nebula-500 text-white font-bold rounded-xl hover:bg-nebula-400 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="text-2xl">📷</span>
                        {t('takePhoto')}
                    </button>
                </div>
            )}

            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default PhotoMission;
