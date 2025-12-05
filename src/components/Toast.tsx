import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastProps extends ToastData {
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 4000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onClose(id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-nebula-400" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    };

    const borderColors = {
        success: 'border-green-500/30',
        error: 'border-red-500/30',
        info: 'border-nebula-500/30',
        warning: 'border-yellow-500/30',
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 bg-nebula-900/95 backdrop-blur-md border ${borderColors[type]} rounded-xl shadow-lg transform transition-all duration-300 ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
            role="alert"
            aria-live="polite"
        >
            {icons[type]}
            <span className="text-white text-sm flex-1">{message}</span>
            <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="닫기"
            >
                <X className="w-4 h-4 text-white/60" />
            </button>
        </div>
    );
};

export default Toast;
