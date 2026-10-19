import { useEffect, useRef, useState, useCallback } from "react";
import { createAnalyticsEventSource } from "../../api/analyticsApi";
import { ConnectionStatus } from "./components/RealtimeStatusIndicator";

interface UseRealtimeAnalyticsOptions {
  onInvalidate: () => void;
  enabled?: boolean;
  debounceMs?: number;
  fallbackPollingIntervalMs?: number;
}

export function useRealtimeAnalytics({
  onInvalidate,
  enabled = true,
  debounceMs = 400,
  fallbackPollingIntervalMs = 25000,
}: UseRealtimeAnalyticsOptions): {
  status: ConnectionStatus;
  lastEventTimestamp: string | null;
  lastUpdated: string | null;
  reconnect: () => void;
} {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const fallbackPollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stableInvalidate = useRef(onInvalidate);
  useEffect(() => {
    stableInvalidate.current = onInvalidate;
  }, [onInvalidate]);

  const triggerDebouncedInvalidate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      stableInvalidate.current();
    }, debounceMs);
  }, [debounceMs]);

  const connect = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      setStatus(retryCountRef.current > 0 ? "reconnecting" : "connecting");
      const es = createAnalyticsEventSource();
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
        retryCountRef.current = 0;
        // Clear fallback polling since SSE is healthy
        if (fallbackPollingTimerRef.current) {
          clearInterval(fallbackPollingTimerRef.current);
          fallbackPollingTimerRef.current = null;
        }
      };

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === ":ping") return;
          const parsed = JSON.parse(event.data);
          setLastEventTimestamp(parsed.timestamp || new Date().toISOString());
          window.dispatchEvent(new CustomEvent("earlyai:realtime-event", { detail: parsed }));
          triggerDebouncedInvalidate();
        } catch {
          // Non-JSON or comment ping
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        retryCountRef.current += 1;

        if (retryCountRef.current > 4) {
          setStatus("offline");
          // Start fallback polling if not already active
          if (!fallbackPollingTimerRef.current) {
            fallbackPollingTimerRef.current = setInterval(() => {
              stableInvalidate.current();
            }, fallbackPollingIntervalMs);
          }
        } else {
          setStatus("reconnecting");
        }

        // Exponential backoff: 1s, 2s, 4s, up to 15s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 15000);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setStatus("offline");
    }
  }, [enabled, triggerDebouncedInvalidate, fallbackPollingIntervalMs]);

  useEffect(() => {
    connect();

    // Tab visibility handling: sync when returning to active tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connect();
        } else {
          stableInvalidate.current();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (fallbackPollingTimerRef.current) clearInterval(fallbackPollingTimerRef.current);
    };
  }, [connect]);

  return {
    status,
    lastEventTimestamp,
    lastUpdated: lastEventTimestamp,
    reconnect: connect,
  };
}
