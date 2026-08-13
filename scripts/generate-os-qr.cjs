const path = require("node:path");
const QRCode = require("qrcode");

const destination = "https://natures-elixirz-os.web.app/account#account-access";
const outputDirectory = path.resolve(__dirname, "../public/assets");

const options = {
  errorCorrectionLevel: "H",
  margin: 4,
  color: {
    dark: "#003D2B",
    light: "#FFFFFFFF",
  },
};

Promise.all([
  QRCode.toFile(path.join(outputDirectory, "natures-elixirz-os-qr.png"), destination, {
    ...options,
    type: "png",
    width: 1600,
  }),
  QRCode.toFile(path.join(outputDirectory, "natures-elixirz-os-qr.svg"), destination, {
    ...options,
    type: "svg",
    width: 1600,
  }),
]).then(() => {
  console.log(`Generated Nature's Elixirz QR code for ${destination}`);
});
