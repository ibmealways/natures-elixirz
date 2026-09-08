const { spawnSync } = require("node:child_process");
const command = "npx.cmd firebase emulators:exec --only firestore tests\\firestore-rules-command.cmd";
const result = process.platform === "win32"
  ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], { stdio: "inherit", shell: false })
  : spawnSync("npx", ["firebase", "emulators:exec", "--only", "firestore", "node --test tests/firestore-security-incidents.test.mjs"], { stdio: "inherit", shell: false });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
