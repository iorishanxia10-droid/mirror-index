import { copyFile, mkdir } from "node:fs/promises";

const files = ["index.html", "styles.css", "app.js", "data.js", "gift-overrides.js", "support-data.js", "support-ranking.js", "support.js", "manifest.webmanifest", "icon.svg", "sw.js", "og.png"];
await mkdir("public/tool", { recursive: true });
await Promise.all(files.map(file => copyFile(file, `public/tool/${file}`)));
