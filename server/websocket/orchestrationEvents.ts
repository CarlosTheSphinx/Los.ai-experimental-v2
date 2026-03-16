import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { OrchestrationTracer, type OrchestrationEvent } from '../services/orchestrationTracing';
import { verifyToken } from '../auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const debuggerClients = new Set<WebSocket>();

export function setupOrchestrationWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    if (url.pathname === '/ws/orchestration') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const allowed = await isDebuggerAccessAllowed(req);
    if (!allowed) {
      ws.close(4003, 'Unauthorized');
      return;
    }

    debuggerClients.add(ws);
    console.log(`🔍 Debugger connected. Active clients: ${debuggerClients.size}`);

    const unsubscribe = OrchestrationTracer.subscribe((event: OrchestrationEvent) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'orchestration_event',
          data: event,
        }));
      }
    });

    ws.on('close', () => {
      debuggerClients.delete(ws);
      unsubscribe();
      console.log(`🔍 Debugger disconnected. Active clients: ${debuggerClients.size}`);
    });

    ws.on('error', (err) => {
      console.error('Debugger WebSocket error:', err);
      debuggerClients.delete(ws);
      unsubscribe();
    });

    ws.send(JSON.stringify({
      type: 'connected',
      data: { message: 'Connected to AI Orchestration Debugger' },
    }));
  });

  return wss;
}

async function isDebuggerAccessAllowed(req: IncomingMessage): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true;

  try {
    const cookieHeader = req.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) return false;

    const payload = verifyToken(tokenMatch[1]);
    if (!payload || !payload.userId) return false;

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    return user?.role === 'super_admin';
  } catch {
    return false;
  }
}

export function broadcastToDebuggers(event: any) {
  debuggerClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}
