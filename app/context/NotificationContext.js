"use client";
import { createContext, useContext, useState, useCallback } from "react";
import ToastItem from "../components/ToastItem";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback(
    ({ message, type = "info", progress = 0, duration = 4000 }) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { id, message, type, progress }]);

      // Auto-remove non‑info notifications after duration
      if (type !== "info") {
        setTimeout(() => removeNotification(id), duration);
      }
      return id;
    },
    [],
  );

  const updateNotification = useCallback((id, updates) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    );
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        addNotification,
        updateNotification,
        removeNotification,
        notifications,
      }}
    >
      {children}
      {/* Toast container – fixed bottom‑right */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-sm">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => removeNotification(n.id)}
            className="cursor-pointer"
          >
            <ToastItem {...n} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};
