import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import CleanCSS from "clean-css";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const SRC_DIR = path.join(projectRoot, "css");
const OUT_DIR = path.join(projectRoot, "generated-css");
const OUT_FILE = path.join(OUT_DIR, "styles.css.js");

console.log("Looking for CSS in:", SRC_DIR);

if (!fs.existsSync(SRC_DIR)) {
  console.error(`❌ CSS directory not found: ${SRC_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Determine environment
const isProd = process.env.NODE_ENV === "production";
console.log(`🔧 Environment: ${isProd ? "production" : "development"}`);

// Process all CSS files and combine them
const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".css"));

if (files.length === 0) {
  console.log("⚠️ No CSS files found in", SRC_DIR);
  process.exit(0);
}

console.log(`📁 Found ${files.length} CSS files to process\n`);

let combinedCSS = "";

for (const file of files) {
  const cssPath = path.join(SRC_DIR, file);
  console.log(`📄 Processing: ${file}`);

  let css = fs.readFileSync(cssPath, "utf8");

  // Remove any @import statements (they are not needed in final CSS)
  css = css.replace(/@import\s+['"][^'"]+['"];?\s*/g, "");

  const componentName = file.replace(".css", "");

  // Add divider for the file (these are useful in development)
  combinedCSS += `/* ===== START: ${componentName} ===== */\n`;
  combinedCSS += css.trim();
}

// Minify only in production
let finalCSS = combinedCSS;
if (isProd) {
  console.log("\n🔧 Minifying CSS for production...");
  const minifiedResult = new CleanCSS().minify(combinedCSS);

  if (minifiedResult.errors.length > 0) {
    console.error("❌ Minification errors:", minifiedResult.errors);
    process.exit(1);
  }

  if (minifiedResult.warnings.length > 0) {
    console.warn("⚠️ Minification warnings:", minifiedResult.warnings);
  }

  finalCSS = minifiedResult.styles;

  // Report size savings
  const originalBytes = Buffer.byteLength(combinedCSS, "utf8");
  const minifiedBytes = Buffer.byteLength(finalCSS, "utf8");
  const savings = (
    ((originalBytes - minifiedBytes) / originalBytes) *
    100
  ).toFixed(2);
  console.log(`📦 Original size: ${(originalBytes / 1024).toFixed(2)} KB`);
  console.log(
    `📦 Minified size: ${(minifiedBytes / 1024).toFixed(2)} KB (${savings}% reduction)`,
  );
} else {
  console.log("\n🔧 Keeping full CSS with comments for development.");
}

// Create the JS module with all styles combined
const js = `// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Combined styles from all CSS files
export default \`
${finalCSS.replace(/`/g, "\\`").replace(/\${/g, "\\${")}
\`;`;

fs.writeFileSync(OUT_FILE, js);
console.log(
  `\n✅ Generated combined styles: ${path.relative(projectRoot, OUT_FILE)}`,
);
console.log("🎉 CSS build complete!");
