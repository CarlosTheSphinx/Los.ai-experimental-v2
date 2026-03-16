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
  rules?: CreditRule[];
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface CreditRule {
  id: string;
  rule: string;
  category: string;
  confidence: number;
  reasoning: string;
  sourceText?: string;
}

export interface OrchestrationSession {
  sessionId: string;
  startTime: Date;
  events: OrchestrationEvent[];
  currentAgent?: string;
  status: 'running' | 'completed' | 'error';
}

export interface WebSocketMessage {
  type: 'orchestration_event';
  data: OrchestrationEvent;
}
