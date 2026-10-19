import { Response } from "express";

export interface RealtimeAnalyticsEvent {
  type:
    | "analytics:invalidated"
    | "application:created"
    | "application:updated"
    | "application:stage_changed"
    | "job:created"
    | "job:updated"
    | "resume:uploaded"
    | "resume:parsed"
    | "ats:completed"
    | "interview:scheduled"
    | "interview:updated"
    | "offer:created"
    | "offer:approved"
    | "offer:extended"
    | "offer:responded"
    | "user:updated";
  entity?: string;
  entityId?: string;
  applicationId?: string;
  candidateUserId?: string;
  jobId?: string;
  response?: string;
  targetRoles?: string[];
  timestamp: string;
}

interface SSEClient {
  id: string;
  userId: string;
  role: string;
  canonicalRole: string;
  res: Response;
}

class SSEEventHub {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Registers a client connection for Server-Sent Events.
   */
  public registerClient(client: SSEClient): void {
    this.clients.set(client.id, client);

    // Initial connected event
    this.sendEventToClient(client, {
      type: "analytics:invalidated",
      entity: "system",
      timestamp: new Date().toISOString(),
    });

    client.res.on("close", () => {
      this.unregisterClient(client.id);
    });
  }

  /**
   * Removes a client upon connection close.
   */
  public unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Returns total connected client count.
   */
  public getConnectedClientCount(): number {
    return this.clients.size;
  }

  /**
   * Dispatches an event to all authorized clients.
   * Ensures candidates only receive events relevant to them or public notices,
   * while hiring teams and platform managers receive workspace updates.
   */
  public broadcast(event: RealtimeAnalyticsEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;

    for (const client of this.clients.values()) {
      try {
        // If event specifies targetRoles, check match
        if (
          event.targetRoles &&
          event.targetRoles.length > 0 &&
          !event.targetRoles.includes(client.canonicalRole) &&
          !event.targetRoles.includes(client.role)
        ) {
          continue;
        }

        // If candidate-specific event and recipient is a candidate, ensure user isolation
        if (
          client.canonicalRole === "candidate" &&
          event.candidateUserId &&
          event.candidateUserId !== client.userId
        ) {
          continue;
        }

        client.res.write(payload);
      } catch {
        // Client write failed; remove on next cycle
        this.unregisterClient(client.id);
      }
    }
  }

  private sendEventToClient(client: SSEClient, event: RealtimeAnalyticsEvent): void {
    try {
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      this.unregisterClient(client.id);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    // Send comment ping every 20 seconds to keep connection open and detect dropped clients
    this.heartbeatInterval = setInterval(() => {
      for (const [id, client] of this.clients.entries()) {
        try {
          client.res.write(":ping\n\n");
        } catch {
          this.unregisterClient(id);
        }
      }
    }, 20000);

    // Unref so timer doesn't prevent Node from exiting during tests
    if (typeof this.heartbeatInterval.unref === "function") {
      this.heartbeatInterval.unref();
    }
  }

  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const sseEventHub = new SSEEventHub();
