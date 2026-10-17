import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Clock } from "lucide-react";
import {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from "../../api/notificationApi";

export const NotificationsDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    fetchMyNotifications()
      .then((res) => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications(notifications.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs space-y-1 ${
                    !n.isRead ? "bg-brand-50/40" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-semibold ${!n.isRead ? "text-brand-900" : "text-slate-900"}`}>
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
