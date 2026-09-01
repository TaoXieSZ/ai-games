// 轻量 MCP stdio 客户端类：连接 Roblox Studio 的 MCP 服务器。
import { spawn } from 'node:child_process';

export const STUDIO_MCP_BIN =
  '/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP';

export class McpStdio {
  constructor(bin = STUDIO_MCP_BIN) {
    this.proc = spawn(bin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.buf = '';
    this.pending = new Map();
    this.nextId = 1;
    this.proc.stdout.on('data', (chunk) => {
      this.buf += chunk;
      let idx;
      while ((idx = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, idx).trim();
        this.buf = this.buf.slice(idx + 1);
        if (!line) continue;
        try {
          this.handle(JSON.parse(line));
        } catch {
          // 非 JSON 行（启动日志）忽略
        }
      }
    });
    this.proc.stderr.on('data', (d) => {
      const s = d.toString().trim();
      if (s) console.error('[mcp-stderr]', s.slice(0, 200));
    });
  }
  handle(msg) {
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  }
  request(method, params = {}, timeoutMs = 30000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, timeoutMs);
    });
  }
  notify(method, params = {}) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }
  async init() {
    const res = await this.request(
      'initialize',
      {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'hype-life-dev', version: '0.1.0' },
      },
      20000,
    );
    this.notify('notifications/initialized');
    return res;
  }
  async call(tool, args = {}, timeoutMs = 120000) {
    return this.request('tools/call', { name: tool, arguments: args }, timeoutMs);
  }
  /** 等待任一 Studio 实例连入（长连接轮询，容忍代理暂不可达） */
  async waitForStudio(timeoutMs = 180000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await this.call('list_roblox_studios', {});
        const inner = JSON.parse(res.content[0].text);
        if (inner.studios && inner.studios.length > 0) {
          return inner.studios;
        }
      } catch {
        // 代理暂不可达或返回错误，继续轮询
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
    throw new Error('等待 Studio 连接超时');
  }
  close() {
    this.proc.kill();
  }
}
