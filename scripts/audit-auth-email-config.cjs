const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const client = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", apiVersion: "admin/v2" });
client.get("/projects/natures-elixirz-os/config").then(({ body }) => {
  const sender = body.notification?.sendEmail || {};
  process.stdout.write(JSON.stringify({
    authorizedDomains: body.authorizedDomains || [],
    emailPasswordSignInEnabled: Boolean(body.signIn?.email?.enabled),
    emailEnumerationProtection: Boolean(body.emailPrivacyConfig?.enableImprovedEmailPrivacy),
    emailDeliveryMethod: sender.method || "default",
    senderEmail: sender.smtp?.senderEmail || null,
  }, null, 2));
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
