import { randomUUID } from 'crypto';

export type OrchestrationEventType =
  | 'agent_start'
  | 'agent_processing'
  | 'agent_complete'
  | 'agent_error'
  | 'credit_rule_extracted'
  | 'credit_extraction_batch'
  | 'session_start'
  | 'session_complete';

export interface OrchestrationEvent {
  timestamp: string;
  sessionId: string;
  eventType: OrchestrationEventType;
  agentName: string;
  agentIndex: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  rawResponse?: string;
  parsedOutput?: any;
  prompt?: string;
  tokens?: { input: number; output: number };
  duration?: number;
  error?: string;
  metadata?: {
    model: string;
    temperature?: number;
    tokens_used?: number;
  };
  rules?: Array<{
    id: string;
    rule: string;
    category: string;
    confidence: number;
    reasoning: string;
    sourceText?: string;
  }>;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

type EventCallback = (event: OrchestrationEvent) => void;

export class OrchestrationTracer {
  private static subscribers: Set<EventCallback> = new Set();

  static startSession(): string {
    const sessionId = randomUUID();
    this.emit({
      eventType: 'session_start',
      agentName: '',
      agentIndex: 0,
      timestamp: new Date().toISOString(),
      sessionId,
    });
    return sessionId;
  }

  static endSession(sessionId: string) {
    this.emit({
      eventType: 'session_complete',
      agentName: '',
      agentIndex: 0,
      timestamp: new Date().toISOString(),
      sessionId,
    });
  }

  static subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => { this.subscribers.delete(callback); };
  }

  static async traceAgent<T>(
    agentName: string,
    agentIndex: number,
    input: Record<string, any>,
    agentFn: () => Promise<T>,
    prompt?: string,
    sessionId?: string
  ): Promise<T> {
    const sid = sessionId || randomUUID();
    const startTime = Date.now();

    this.emit({
      eventType: 'agent_start',
      agentName,
      agentIndex,
      input: this.truncateInput(input),
      prompt,
      timestamp: new Date().toISOString(),
      sessionId: sid,
    });

    try {
      const result = await agentFn();

      this.emit({
        eventType: 'agent_complete',
        agentName,
        agentIndex,
        input: this.truncateInput(input),
        output: typeof result === 'object' ? result as Record<string, any> : { value: result },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        sessionId: sid,
      });

      return result;
    } catch (error: any) {
      this.emit({
        eventType: 'agent_error',
        agentName,
        agentIndex,
        input: this.truncateInput(input),
        error: error?.message || String(error),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        sessionId: sid,
      });
      throw error;
    }
  }

  static emit(event: OrchestrationEvent) {
    this.subscribers.forEach(cb => {
      try { cb(event); } catch (e) { console.error('Tracer subscriber error:', e); }
    });
  }

  static hasSubscribers(): boolean {
    return this.subscribers.size > 0;
  }

  private static truncateInput(input: Record<string, any>): Record<string, any> {
    const truncated: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string' && value.length > 2000) {
        truncated[key] = value.substring(0, 2000) + '... [truncated]';
      } else if (typeof value === 'object' && value !== null) {
        const str = JSON.stringify(value);
        if (str.length > 5000) {
          truncated[key] = '[large object truncated]';
        } else {
          truncated[key] = value;
        }
      } else {
        truncated[key] = value;
      }
    }
    return truncated;
  }
}
