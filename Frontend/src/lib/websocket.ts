// src/lib/websocket.ts
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:5000', {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.emit('start_stream', {});
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Setup event listeners
    this.socket.on('analysis_result', (data) => {
      this.notify('analysis_result', data);
    });

    this.socket.on('analysis_error', (error) => {
      this.notify('analysis_error', error);
    });

    this.socket.on('connected', (data) => {
      this.notify('connected', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.emit('stop_stream', {});
      this.socket.disconnect();
      this.socket = null;
    }
  }

  analyzeFrame(imageBase64: string) {
    this.emit('analyze_frame', { image: imageBase64 });
  }

  private emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private notify(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();