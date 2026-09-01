#!/usr/bin/env node
// CLI：node scripts/mcp.mjs [tools|list|call <tool> <json参数>]
import { McpStdio } from './mcp-client.mjs';

const [, , cmd, tool, argsJson] = process.argv;
const client = new McpStdio();
await client.init();

if (cmd === 'tools') {
  const list = await client.call('tools/list', {});
  console.log(JSON.stringify(list.tools.map((t) => ({ name: t.name })), null, 1));
} else if (cmd === 'list') {
  const studios = await client.waitForStudio(5000);
  console.log(JSON.stringify(studios, null, 1));
} else if (cmd === 'call') {
  const res = await client.call(tool, JSON.parse(argsJson || '{}'));
  console.log(JSON.stringify(res, null, 1).slice(0, 8000));
} else {
  console.log('用法: node scripts/mcp.mjs [tools|list|call <tool> <json>]');
}
client.close();
process.exit(0);
