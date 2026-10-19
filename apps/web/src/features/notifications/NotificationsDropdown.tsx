import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  FileText,
  AlertTriangle,
  Calendar,
  Award,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from "../../api/notificationApi";
import { createAnalyticsEventSource } from "../../api/analyticsApi";

export const NotificationsDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const loadNotifications = useCallback(() => {
    fetchMyNotifications()
      .then((res) => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNotifications();

    // 1. Listen for global realtime events dispatched by useRealtimeAnalytics
    const handleRealtimeEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.type === "notification:created" && detail.notification) {
        const newNotif = detail.notification as NotificationItem;
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setUnreadCount((prev) => prev + 1);
      } else if (
        detail.type === "application:created" ||
        detail.type === "ats:completed" ||
        detail.type === "application:stage_changed"
      ) {
        // Refetch to sync authoritative notification state
        loadNotifications();
      }
    };

    window.addEventListener("earlyai:realtime-event", handleRealtimeEvent);

    // 2. Direct EventSource connection if not already managed globally
    try {
      const es = createAnalyticsEventSource();
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === ":ping") return;
          const parsed = JSON.parse(event.data);
          if (parsed.type === "notification:created" && parsed.notification) {
            const newNotif = parsed.notification as NotificationItem;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            setUnreadCount((prev) => prev + 1);
          } else if (
            parsed.type === "application:created" ||
            parsed.type === "ats:completed" ||
            parsed.type === "application:stage_changed"
          ) {
            loadNotifications();
          }
        } catch {
          // Ignore comment pings
        }
      };
    } catch {
      // EventSource fallback to polling
    }

    // 3. Fallback polling every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      window.removeEventListener("earlyai:realtime-event", handleRealtimeEvent);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearInterval(interval);
    };
  }, [loadNotifications]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await markNotificationRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue navigation even if read marking fails
      }
    }

    if (notif.link) {
      setIsOpen(false);
      // Dispatch internal navigation event for app routing
      window.dispatchEvent(
        new CustomEvent("earlyai:navigate", { detail: { path: notif.link } })
      );
      if (notif.link.startsWith("/")) {
        const cleanPath = notif.link.split("?")[0].replace("/", "");
        window.location.hash = `#${cleanPath}`;
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "screening_completed":
      case "ats_ready":
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case "screening_needs_review":
      case "screening_failed":
      case "ats_failed":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "application_submitted":
      case "application_received":
      case "application_status":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "interview_scheduled":
      case "interview_rescheduled":
      case "interview_cancelled":
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case "offer_extended":
      case "offer_accepted":
      case "offer_declined":
        return <Award className="w-4 h-4 text-orange-500" />;
      case "feedback_released":
      case "feedback_submitted":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case "screening_completed":
      case "ats_ready":
        return "bg-purple-100 text-purple-700";
      case "screening_needs_review":
      case "screening_failed":
      case "ats_failed":
        return "bg-amber-100 text-amber-700";
      case "application_submitted":
      case "application_received":
      case "application_status":
        return "bg-blue-100 text-blue-700";
      case "interview_scheduled":
      case "interview_rescheduled":
      case "interview_cancelled":
        return "bg-indigo-100 text-indigo-700";
      case "offer_extended":
      case "offer_accepted":
      case "offer_declined":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-slate-200/90 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-fade-in text-slate-800">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                <Bell className="w-6 h-6 mx-auto text-slate-300 opacity-60" />
                <p>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer text-xs space-y-1.5 flex gap-3 items-start group ${
                    !n.isRead ? "bg-purple-50/40" : "bg-white"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${getNotificationBg(n.type)}`}>
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex justify-between items-start gap-1">
                      <span className={`font-semibold text-xs leading-tight ${!n.isRead ? "text-slate-900 font-bold" : "text-slate-700"}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    {n.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 font-medium group-hover:underline pt-0.5">
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {!n.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-1.5"
                      title="Unread notification"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
