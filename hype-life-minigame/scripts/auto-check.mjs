// 自动化验证：连接 IDE 自动化端口，检查游戏进程存活 + 截图模拟器。
import automator from 'miniprogram-automator';

const CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
const PROJECT = '/Users/txie/OpenSourceProjects/ai-games/hype-life-minigame';

const miniProgram = await automator.launch({
  cliPath: CLI,
  projectPath: PROJECT,
  port: 9420,
  timeout: 60000,
});

try {
  const sys = await miniProgram.systemInfo();
  console.log('systemInfo:', sys.platform, sys.SDKVersion);

  // 小游戏上下文里执行代码，检查游戏是否存活
  const alive = await miniProgram.evaluate(() => {
    const hype = globalThis.__hype;
    return {
      hasWx: typeof wx !== 'undefined',
      hasHype: typeof hype !== 'undefined',
      version: hype?.version ?? null,
      screen: hype?.getStore?.().screen ?? null,
      eventId: hype?.getStore?.().state?.currentEventId ?? null,
    };
  });
  console.log('game context:', JSON.stringify(alive));

  try {
    await miniProgram.screenshot({ path: '.tmp/simulator.png' });
    console.log('截图: .tmp/simulator.png');
  } catch (e) {
    console.log('screenshot 不支持:', String(e).slice(0, 80));
  }
} finally {
  await miniProgram.disconnect();
}
