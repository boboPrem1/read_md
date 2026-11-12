'use client';

import React, { useEffect, useState } from 'react';
import { Announcer } from '../../lib/utils';

export interface ToastProps {
  message: string | null;
  visible?: boolean;
  action?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
}

export function Toast({
  message,
  visible,
  action,
  onAction,
  onClose,
  duration,
}: ToastProps) {
  const isVisible = visible !== undefined ? visible : Boolean(message);
  const [internalVisible, setInternalVisible] = useState(isVisible);

  useEffect(() => {
    setInternalVisible(isVisible);
    if (!isVisible || !message) return;

    Announcer.say(message);

    const timerDuration = duration ?? (action ? 6000 : 3000);
    const timer = setTimeout(() => {
      setInternalVisible(false);
      onClose?.();
    }, timerDuration);

    return () => clearTimeout(timer);
  }, [isVisible, message, action, onClose, duration]);

  if (!message && !internalVisible) {
    return null;
  }

  return (
    <div
      className={`toast${internalVisible ? ' visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{message}</span>
      {action && onAction && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            onAction();
            setInternalVisible(false);
            onClose?.();
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

export default Toast;

