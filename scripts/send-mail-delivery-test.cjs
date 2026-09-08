const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const recipient = String(process.argv[2] || "").trim().toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(recipient)) {
  console.error("Usage: node scripts/send-mail-delivery-test.cjs recipient@example.com");
  process.exit(1);
}

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) {
  console.error("The Firebase CLI is not signed in.");
  process.exit(1);
}
setActiveAccount({}, activeAccount);

const client = new Client({
  urlPrefix: "https://firestore.googleapis.com",
  apiVersion: "v1",
});

async function main() {
  const body = {
    fields: {
      to: { arrayValue: { values: [{ stringValue: recipient }] } },
      message: {
        mapValue: {
          fields: {
            subject: { stringValue: "Nature's Elixirz production email test" },
            text: { stringValue: "The Nature's Elixirz Firebase-to-Namecheap email delivery path is working." },
            html: { stringValue: "<p><strong>Nature's Elixirz email delivery is working.</strong></p><p>This message traveled through the production Firebase mail queue and the support@natureselixirz.com mailbox.</p>" },
          },
        },
      },
      category: { stringValue: "production-mail-test" },
      createdAt: { timestampValue: new Date().toISOString() },
    },
  };

  const response = await client.post(
    "/projects/natures-elixirz-os/databases/(default)/documents/mail",
    body,
  );
  const documentName = String(response.body?.name || "");
  process.stdout.write(JSON.stringify({ queued: true, documentId: documentName.split("/").at(-1) }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
