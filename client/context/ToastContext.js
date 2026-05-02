"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    warning: (msg) => showToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            <div className="toast-content">
              {t.type === 'success' && <span className="toast-icon">✅</span>}
              {t.type === 'error' && <span className="toast-icon">❌</span>}
              {t.type === 'warning' && <span className="toast-icon">⚠️</span>}
              {t.type === 'info' && <span className="toast-icon">ℹ️</span>}
              <span className="toast-message">{t.message}</span>
            </div>
            <div className="toast-progress"></div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          pointer-events: none;
        }

        .toast {
          pointer-events: auto;
          min-width: 300px;
          max-width: 450px;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          cursor: pointer;
          animation: toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border-left: 6px solid #e2e8f0;
          position: relative;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .toast-icon {
          font-size: 1.25rem;
        }

        .toast-message {
          color: #1a202c;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .toast-success { border-left-color: #48bb78; }
        .toast-error { border-left-color: #f56565; }
        .toast-warning { border-left-color: #ecc94b; }
        .toast-info { border-left-color: #4299e1; }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: 100%;
          background: rgba(0,0,0,0.05);
        }

        .toast-progress::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          background: currentColor;
          opacity: 0.3;
          animation: toast-progress 4s linear forwards;
        }

        .toast-success .toast-progress::after { background: #48bb78; }
        .toast-error .toast-progress::after { background: #f56565; }
        .toast-warning .toast-progress::after { background: #ecc94b; }
        .toast-info .toast-progress::after { background: #4299e1; }

        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
