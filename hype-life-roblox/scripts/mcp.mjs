// 轻量 MCP stdio 客户端：连接 Roblox Studio 的 MCP 服务器。
// 用法：
//   node scripts/mcp.mjs tools                    列出全部工具
//   node scripts/mcp.mjs list                     列出已连接的 Studio 实例
//   node scripts/mcp.mjs call <tool> '<json参数>'  调用工具（如 list_roblox_studios）
import { spawn } from 'node:child_process';

const BIN = '/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP';

class McpStdio {
  constructor(bin) {
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
    const res = await this.call_(tool, args, timeoutMs);
    return res;
  }
  call_(tool, args, timeoutMs) {
    return this.request('tools/call', { name: tool, arguments: args }, timeoutMs);
  }
  close() {
    this.proc.kill();
  }
}

const [, , cmd, tool, argsJson] = process.argv;
const client = new McpStdio(BIN);
await client.init();

if (cmd === 'tools') {
  const list = await client.call_('tools/list', {});
  console.log(JSON.stringify(list.tools.map((t) => ({ name: t.name })), null, 1));
} else if (cmd === 'list') {
  const res = await client.call_('list_roblox_studios', {});
  console.log(JSON.stringify(res, null, 1));
} else if (cmd === 'call') {
  const res = await client.call_(tool, JSON.parse(argsJson || '{}'));
  console.log(JSON.stringify(res, null, 1).slice(0, 6000));
} else {
  console.log('用法: node scripts/mcp.mjs [tools|list|call <tool> <json>]');
}
client.close();
process.exit(0);
