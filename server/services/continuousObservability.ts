import http from 'http';
import WebSocket from 'ws';
import { Response } from 'express';

export interface ObservabilityTelemetry {
  fps: number;
  frameCount: number;
  connectedClients: number;
  activeUrl: string;
  activeTitle: string;
  lastFrameTime: string;
  streamActive: boolean;
}

class ContinuousObservabilityService {
  private cdpWs: WebSocket | null = null;
  private mjpegClients: Set<Response> = new Set();
  private wsClients: Set<WebSocket> = new Set();
  private latestFrame: Buffer | null = null;
  private frameCount = 0;
  private fps = 0;
  private lastFpsCalcTime = Date.now();
  private framesSinceLastCalc = 0;
  private activeUrl = '';
  private activeTitle = '';
  private isReconnecting = false;
  private cdpPort = 9222;

  constructor() {
    this.init();
  }

  public init() {
    this.connectToCDP();
    // FPS calculator interval
    setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.lastFpsCalcTime) / 1000;
      if (elapsed > 0) {
        this.fps = Math.round(this.framesSinceLastCalc / elapsed);
        this.framesSinceLastCalc = 0;
        this.lastFpsCalcTime = now;
      }
    }, 1000);
  }

  public registerWsClient(ws: WebSocket) {
    this.wsClients.add(ws);
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
    // Send initial frame if available
    if (this.latestFrame) {
      try {
        ws.send(JSON.stringify({
          type: 'screencast_frame',
          data: this.latestFrame.toString('base64'),
          telemetry: this.getTelemetry()
        }));
      } catch (_) {}
    }
  }

  public registerMjpegClient(res: Response) {
    res.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=--frame',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Connection': 'close',
    });

    this.mjpegClients.add(res);

    if (this.latestFrame) {
      this.writeFrameToResponse(res, this.latestFrame);
    }

    res.on('close', () => {
      this.mjpegClients.delete(res);
    });
  }

  private writeFrameToResponse(res: Response, frameBuffer: Buffer) {
    try {
      res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frameBuffer.length}\r\n\r\n`);
      res.write(frameBuffer);
      res.write('\r\n');
    } catch (_) {
      this.mjpegClients.delete(res);
    }
  }

  private async connectToCDP() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    try {
      const tabs = await this.fetchJson(`http://127.0.0.1:${this.cdpPort}/json`);
      if (!Array.isArray(tabs) || tabs.length === 0) {
        throw new Error('No Chrome tabs found on port 9222');
      }

      // Prioritize MCA or active form tab
      const mcaTab = tabs.find(t => t.url && (t.url.includes('mca.gov.in') || t.url.includes('aoc4') || t.url.includes('home.html'))) ||
                     tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome:')) ||
                     tabs[0];

      if (!mcaTab || !mcaTab.webSocketDebuggerUrl) {
        throw new Error('No valid webSocketDebuggerUrl');
      }

      this.activeUrl = mcaTab.url;
      this.activeTitle = mcaTab.title;

      if (this.cdpWs) {
        try { this.cdpWs.close(); } catch (_) {}
      }

      this.cdpWs = new WebSocket(mcaTab.webSocketDebuggerUrl);

      this.cdpWs.on('open', () => {
        this.isReconnecting = false;
        // Start continuous screencast at 24fps target
        this.cdpWs?.send(JSON.stringify({
          id: 101,
          method: 'Page.startScreencast',
          params: {
            format: 'jpeg',
            quality: 70,
            maxWidth: 1280,
            maxHeight: 800,
            everyNthFrame: 1
          }
        }));
      });

      this.cdpWs.on('message', (msgStr: string) => {
        try {
          const msg = JSON.parse(msgStr);
          if (msg.method === 'Page.screencastFrame') {
            const { data, sessionId } = msg.params;
            this.frameCount++;
            this.framesSinceLastCalc++;
            const buffer = Buffer.from(data, 'base64');
            this.latestFrame = buffer;

            // Acknowledge frame immediately to sustain continuous delivery
            this.cdpWs?.send(JSON.stringify({
              id: 200 + (this.frameCount % 1000),
              method: 'Page.screencastFrameAck',
              params: { sessionId }
            }));

            // Push to all active MJPEG stream clients
            for (const client of this.mjpegClients) {
              this.writeFrameToResponse(client, buffer);
            }

            // Push to WebSocket stream clients
            const telemetry = this.getTelemetry();
            const wsPayload = JSON.stringify({
              type: 'screencast_frame',
              data,
              telemetry
            });

            for (const ws of this.wsClients) {
              if (ws.readyState === WebSocket.OPEN) {
                try { ws.send(wsPayload); } catch (_) {}
              }
            }
          }
        } catch (_) {}
      });

      this.cdpWs.on('close', () => {
        this.cdpWs = null;
        setTimeout(() => this.connectToCDP(), 3000);
      });

      this.cdpWs.on('error', () => {
        this.cdpWs?.close();
      });

    } catch (_) {
      this.isReconnecting = false;
      setTimeout(() => this.connectToCDP(), 4000);
    }
  }

  private fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(2000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  public getTelemetry(): ObservabilityTelemetry {
    return {
      fps: this.fps,
      frameCount: this.frameCount,
      connectedClients: this.mjpegClients.size + this.wsClients.size,
      activeUrl: this.activeUrl,
      activeTitle: this.activeTitle,
      lastFrameTime: new Date().toISOString(),
      streamActive: !!this.latestFrame && (Date.now() - this.lastFpsCalcTime < 3000)
    };
  }

  public getLatestFrame(): Buffer | null {
    return this.latestFrame;
  }
}

export const continuousObservability = new ContinuousObservabilityService();
