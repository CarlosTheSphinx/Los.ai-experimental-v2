import { useEffect, useRef, useCallback, useState } from 'react';
import type { OrchestrationEvent } from '@/types/orchestration';

export function useOrchestrationEvents(onEvent?: (event: OrchestrationEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/orchestration`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'orchestration_event' && onEventRef.current) {
          onEventRef.current(message.data);
        }
      } catch (error) {
        console.error('Failed to parse orchestration event:', error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const replayAgent = useCallback(
    async (agentName: string, input: any, customPrompt: string, replayMode: 'isolated' | 'cascade') => {
      const response = await fetch('/api/debug/replay-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, input, customPrompt, replayMode }),
      });

      if (!response.ok) throw new Error('Replay failed');
      return await response.json();
    },
    []
  );

  const replayCreditExtraction = useCallback(
    async (originalSessionId: string, customPrompt: string) => {
      const response = await fetch('/api/debug/replay-credit-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalSessionId, customPrompt }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Replay failed');
      }
      return await response.json();
    },
    []
  );

  return { connected, replayAgent, replayCreditExtraction };
}
