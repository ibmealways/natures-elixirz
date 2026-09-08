const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const account = getProjectDefaultAccount(process.cwd());
if (!account) {
  console.error("The Firebase CLI is not signed in.");
  process.exit(1);
}
setActiveAccount({}, account);

const client = new Client({
  urlPrefix: "https://firebaseextensions.googleapis.com",
  apiVersion: "v1beta",
});

async function main() {
  const response = await client.get("/projects/natures-elixirz-os/instances/firestore-send-email");
  const instance = response.body || {};
  const params = instance.config?.params || instance.params || {};
  const safeParams = Object.fromEntries(Object.entries(params).map(([key, value]) => [
    key,
    key.toLowerCase().includes("password") || key.toLowerCase().includes("secret")
      ? "[configured]"
      : value,
  ]));
  process.stdout.write(JSON.stringify({
    state: instance.state,
    updateTime: instance.updateTime,
    params: safeParams,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
