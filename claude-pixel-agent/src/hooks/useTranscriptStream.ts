import { useEffect, useRef } from 'react';
import { usePixelAgentStore } from '../store';
import type { TranscriptEvent } from '../types';

const SERVER_URL = '/api/stream';
const RECONNECT_DELAY_MS = 3000;

export function useTranscriptStream() {
  const handleEvent = usePixelAgentStore((s) => s.handleEvent);
  const setConnected = usePixelAgentStore((s) => s.setConnected);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let mounted = true;

    function connect() {
      if (!mounted) return;

      const es = new EventSource(SERVER_URL);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (mounted) setConnected(true);
      };

      es.onmessage = (event: MessageEvent<string>) => {
        if (!mounted) return;
        try {
          const data = JSON.parse(event.data) as TranscriptEvent;
          handleEvent(data);
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        if (!mounted) return;
        setConnected(false);
        es.close();
        eventSourceRef.current = null;
        // Auto-reconnect
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimer);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [handleEvent, setConnected]);
}
