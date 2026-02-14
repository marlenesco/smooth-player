import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const sourcePath = resolve(root, "src/i18n/en.json");
const outputPath = resolve(root, "src/i18n/en.generated.ts");

const raw = readFileSync(sourcePath, "utf8");
const parsed = JSON.parse(raw);
const serialized = JSON.stringify(parsed, null, 2);

const output = `/* Auto-generated from src/i18n/en.json. Do not edit manually. */
export const en = ${serialized} as const;
`;

writeFileSync(outputPath, output);
