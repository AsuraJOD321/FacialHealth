// src/lib/websocket.ts
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.socket = io(WS_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    this.socket.on('connect',       () => console.log('WebSocket connected'));
    this.socket.on('disconnect',    () => console.log('WebSocket disconnected'));
    this.socket.on('connect_error', (e) => console.error('WebSocket error:', e));
    this.socket.on('analysis_result', (data)  => this.notify('analysis_result', data));
    this.socket.on('analysis_error',  (error) => this.notify('analysis_error', error));
    this.socket.on('connected',       (data)  => this.notify('connected', data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  analyzeFrame(imageBase64: string) {
    this.emit('analyze_frame', { image: imageBase64 });
  }

  private emit(event: string, data: any) {
    if (this.socket?.connected) this.socket.emit(event, data);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      const i = cbs.indexOf(callback);
      if (i > -1) cbs.splice(i, 1);
    }
  }

  removeAllListeners(event?: string) {
    event ? this.listeners.delete(event) : this.listeners.clear();
  }

  private notify(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsService = new WebSocketService();