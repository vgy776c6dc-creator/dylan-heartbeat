const { spawn } = require("child_process");
const path = require("path");

// Railway 只啟動 Gateway。
// 已停用 wake-up，因此 Dylan 不會再主動喚醒或主動推送。
const processes = [
  ["gateway", "server.js"]
].map(([name, file]) => ({
  name,
  child: spawn(process.execPath, [path.join(__dirname, file)], {
    cwd: __dirname,
    env: process.env,
    stdio: "inherit"
  })
}));

let stopping = false;

function stopAll(signal, exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const { child } of processes) {
    if (!child.killed) child.kill(signal);
  }

  setTimeout(() => process.exit(exitCode), 800).unref();
}

for (const { name, child } of processes) {
  child.on("error", error => {
    console.error(`${name} 啟動失敗:`, error.message || error);
    stopAll("SIGTERM", 1);
  });

  child.on("exit", (code, signal) => {
    if (stopping) return;

    console.error(
      `${name} 意外退出: code=${code ?? ""} signal=${signal || ""}`
    );

    stopAll("SIGTERM", code && code > 0 ? code : 1);
  });
}

process.on("SIGTERM", () => stopAll("SIGTERM", 0));
process.on("SIGINT", () => stopAll("SIGINT", 0));
