import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) && !name.endsWith(".test.js") ? [path] : [];
  });
}

describe("subscriber privacy guarantees", () => {
  const source = sourceFiles(join(process.cwd(), "src"))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  it("does not access browser geolocation", () => {
    expect(source).not.toMatch(/navigator\s*\.\s*geolocation|GeolocationPosition|watchPosition\s*\(/i);
  });

  it("does not embed common behavioral analytics clients", () => {
    expect(source).not.toMatch(/google-analytics|gtag\s*\(|mixpanel|posthog|amplitude|facebook\s*pixel|fbq\s*\(/i);
  });
});
