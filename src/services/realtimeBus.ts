import { EmergencyRequestDto } from '../types/repairbah';

type ConnectionListener = (connected: boolean) => void;
type CdcListener = (record: Record<string, unknown>) => void;
type JobPatchListener = (payload: Record<string, unknown>) => void;
type TowCamSignalListener = (payload: Record<string, unknown>) => void;

/**
 * Unified Realtime Bus Singleton
 * - Manages a single Phoenix Realtime WebSocket (25s heartbeat, CDC on emergency_requests & rescue_jobs,
 *   and dynamic realtime:towcam:<jobId> broadcast signaling).
 * - Manages a single deduplicated BroadcastChannel('repairbah_sync') for cross-tab job & WebRTC signaling.
 */
class RealtimeBus {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private bc: BroadcastChannel | null = null;

  private supabaseUrl = '';
  private supabaseAnonKey = '';
  private refCount = 0;
  private msgRef = 10;
  private activeTowCamTopic: string | null = null;

  private connectionListeners = new Set<ConnectionListener>();
  private cdcListeners = new Set<CdcListener>();
  private jobPatchListeners = new Set<JobPatchListener>();
  private towCamListeners = new Set<TowCamSignalListener>();

  private ensureBroadcastChannel() {
    if (this.bc || typeof BroadcastChannel === 'undefined') return;
    try {
      this.bc = new BroadcastChannel('repairbah_sync');
      this.bc.onmessage = (ev) => {
        const data = ev.data as Record<string, unknown> | undefined;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'JOB_PATCH' && data.payload && typeof data.payload === 'object') {
          const payload = data.payload as Record<string, unknown>;
          this.jobPatchListeners.forEach((cb) => cb(payload));
        } else if (data.type === 'WEBRTC_SIGNAL') {
          this.towCamListeners.forEach((cb) => cb(data));
        }
      };
    } catch {
      // BroadcastChannel unavailable in restricted contexts
    }
  }

  private emitConnection(connected: boolean) {
    this.connectionListeners.forEach((cb) => cb(connected));
  }

  private sendWsFrame(frame: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(frame));
    } catch {
      // Ignore transient socket send failures
    }
  }

  private joinCoreChannels() {
    this.sendWsFrame({
      topic: 'realtime:public:emergency_requests',
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [
            { event: '*', schema: 'public', table: 'emergency_requests' },
          ],
        },
      },
      ref: '1',
    });

    this.sendWsFrame({
      topic: 'realtime:public:rescue_jobs',
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [
            { event: '*', schema: 'public', table: 'rescue_jobs' },
          ],
        },
      },
      ref: '2',
    });

    if (this.activeTowCamTopic) {
      this.sendWsFrame({
        topic: this.activeTowCamTopic,
        event: 'phx_join',
        payload: { config: { broadcast: { self: false } } },
        ref: String(++this.msgRef),
      });
    }
  }

  private openSocket() {
    if (!this.supabaseUrl || !this.supabaseAnonKey) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const wsBase = this.supabaseUrl.replace(/^https?:\/\//, 'wss://');
      const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(
        this.supabaseAnonKey
      )}&vsn=1.0.0`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.emitConnection(true);
        this.joinCoreChannels();
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(String(event.data || '{}')) as {
            topic?: string;
            event?: string;
            payload?: Record<string, unknown> & {
              data?: { record?: Record<string, unknown> };
              record?: Record<string, unknown>;
              new?: Record<string, unknown>;
            };
          };

          const isTargetCdcTopic =
            frame.topic === 'realtime:public:emergency_requests' ||
            frame.topic === 'realtime:public:rescue_jobs';

          if (
            isTargetCdcTopic &&
            (frame.event === 'postgres_changes' ||
              frame.event === 'INSERT' ||
              frame.event === 'UPDATE')
          ) {
            const record =
              frame.payload?.data?.record ??
              frame.payload?.record ??
              frame.payload?.new;
            if (record && typeof record === 'object') {
              this.cdcListeners.forEach((cb) => cb(record));
            }
          } else if (
            frame.topic?.startsWith('realtime:towcam:') &&
            frame.event === 'broadcast' &&
            frame.payload &&
            typeof frame.payload === 'object'
          ) {
            const payload = frame.payload as Record<string, unknown>;
            this.towCamListeners.forEach((cb) => cb(payload));
          }
        } catch {
          // Ignore malformed heartbeat or system frames
        }
      };

      ws.onerror = () => {
        if (this.ws !== ws) return;
        this.emitConnection(false);
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.emitConnection(false);
        if (this.refCount > 0 && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.openSocket();
          }, 5000);
        }
      };

      if (!this.heartbeatTimer) {
        this.heartbeatTimer = setInterval(() => {
          this.sendWsFrame({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: String(Date.now()),
          });
        }, 25000);
      }
    } catch {
      this.emitConnection(false);
    }
  }

  private teardownSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      oldWs.close();
    }
  }

  public connect(supabaseUrl: string, supabaseAnonKey: string): () => void {
    this.refCount += 1;
    this.ensureBroadcastChannel();

    const credentialsChanged =
      this.supabaseUrl !== supabaseUrl ||
      this.supabaseAnonKey !== supabaseAnonKey;

    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;

    if (credentialsChanged && this.ws) {
      this.teardownSocket();
    }
    this.openSocket();

    return () => {
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        this.teardownSocket();
        if (this.bc) {
          this.bc.close();
          this.bc = null;
        }
      }
    };
  }

  public joinTowCamChannel(jobId: string) {
    const topic = `realtime:towcam:${jobId}`;
    if (this.activeTowCamTopic === topic) return;
    if (this.activeTowCamTopic) {
      this.sendWsFrame({
        topic: this.activeTowCamTopic,
        event: 'phx_leave',
        payload: {},
        ref: String(++this.msgRef),
      });
    }
    this.activeTowCamTopic = topic;
    this.ensureBroadcastChannel();
    this.sendWsFrame({
      topic,
      event: 'phx_join',
      payload: { config: { broadcast: { self: false } } },
      ref: String(++this.msgRef),
    });
  }

  public leaveTowCamChannel(jobId: string) {
    const topic = `realtime:towcam:${jobId}`;
    if (this.activeTowCamTopic === topic) {
      this.sendWsFrame({
        topic,
        event: 'phx_leave',
        payload: {},
        ref: String(++this.msgRef),
      });
      this.activeTowCamTopic = null;
    }
  }

  public publishTowCamSignal(
    jobId: string,
    msg: Record<string, unknown>
  ) {
    this.ensureBroadcastChannel();
    try {
      this.bc?.postMessage(msg);
    } catch {
      // Ignore BroadcastChannel errors
    }

    this.sendWsFrame({
      topic: `realtime:towcam:${jobId}`,
      event: 'broadcast',
      payload: msg,
      ref: String(++this.msgRef),
    });
  }

  public publishJobPatch(payload: EmergencyRequestDto | Record<string, unknown>) {
    this.ensureBroadcastChannel();
    try {
      this.bc?.postMessage({ type: 'JOB_PATCH', payload });
    } catch {
      // Ignore BroadcastChannel errors
    }
  }

  public onConnectionChange(cb: ConnectionListener): () => void {
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  public onCdcRecord(cb: CdcListener): () => void {
    this.cdcListeners.add(cb);
    return () => this.cdcListeners.delete(cb);
  }

  public onJobPatch(cb: JobPatchListener): () => void {
    this.jobPatchListeners.add(cb);
    return () => this.jobPatchListeners.delete(cb);
  }

  public onTowCamSignal(cb: TowCamSignalListener): () => void {
    this.towCamListeners.add(cb);
    return () => this.towCamListeners.delete(cb);
  }
}

export const realtimeBus = new RealtimeBus();
