// generate-category-chunks.js
import fs from "fs/promises";
import { CATEGORY_SECTIONS } from "./app/data/categories.js";

const categorySlugMap = {
  "Computers & Tablets": "computers-tablets",
  Laptops: "laptops",
  "Tablets and eReaders": "tablets-and-ereaders",
  "Desktop Computers": "desktop-computers",
  "Computer Components": "computer-components",
  "Other Computers & Tablets": "other-computers-tablets",
  "Smart Home": "smart-home",
  "Home Automation": "home-automation",
  "Wifi, Routers & Networking": "wifi-routers-networking",
  Security: "security",
  DIY: "diy",
  "Other Smart Home": "other-smart-home",
  "Mobile Phones & Wearable Tech": "mobile-phones-wearable-tech",
  "Apple iPhone": "apple-iphone",
  "Android Smart Phones": "android-smart-phones",
  "Smart Watches": "smart-watches",
  Chargers: "chargers",
  "Other Mobile Phones & Wearable Tech": "other-mobile-phones-wearable-tech",
  "Audio & Visual": "audio-visual",
  Headphones: "headphones",
  TVs: "tvs",
  Projectors: "projectors",
  Speakers: "speakers",
  "Other Sound & Vision": "other-sound-vision",
  Gaming: "gaming",
  "Video Games": "video-games",
  Consoles: "consoles",
  "PC Gaming": "pc-gaming",
  "Gaming Headsets": "gaming-headsets",
  "Other Gaming": "other-gaming",
  "Digital Cameras & Photography": "digital-cameras-photography",
  "Digital Cameras": "digital-cameras",
  Drones: "drones",
  Camcorders: "camcorders",
  Lenses: "lenses",
  "Other Digital Cameras & Photography": "other-digital-cameras-photography",
  "Other Products": "other-products",
  "Health and Beauty": "health-and-beauty",
  "Musical Instruments & DJ Equipment": "musical-instruments-dj-equipment",
  "In Car Tech": "in-car-tech",
  "Business & Office": "business-office",
  "Miscellaneous Tech": "miscellaneous-tech",
};

async function generateChunks() {
  const allInserts = [];
  let insertCounter = 0;

  for (const [catName, catData] of Object.entries(CATEGORY_SECTIONS)) {
    const slug = categorySlugMap[catName];
    if (!slug) {
      console.warn(`⚠️ No slug for ${catName}`);
      continue;
    }

    catData.sections.forEach((section, idx) => {
      const subheading = section.subheading || null;
      const paragraphs = JSON.stringify(section.paragraphs).replace(/'/g, "''");
      const subheadingEscaped = subheading
        ? `'${subheading.replace(/'/g, "''")}'`
        : "NULL";

      allInserts.push(
        `('${slug}', ${idx}, ${subheadingEscaped}, '${paragraphs}', unixepoch(), unixepoch())`,
      );
      insertCounter++;
    });
  }

  console.log(`Total inserts: ${insertCounter}`);

  const CHUNK_SIZE = 5; // 5 per file – safe for D1
  let chunkNumber = 1;

  // Use "02b_" prefix so these files run after the main seed file (which should be named "02a_seed_data.sql")
  for (let i = 0; i < allInserts.length; i += CHUNK_SIZE) {
    const chunk = allInserts.slice(i, i + CHUNK_SIZE);
    const filePath = `./migrations/02b_seed_category_content_${chunkNumber}.sql`;

    const content =
      `PRAGMA foreign_keys = ON;\n\n` +
      `INSERT INTO category_content (category_slug, section_order, subheading, paragraphs, created_at, updated_at) VALUES\n` +
      chunk.join(",\n") +
      `;\n\n` +
      `-- Chunk ${chunkNumber} complete\n`;

    await fs.writeFile(filePath, content);
    console.log(`✅ Wrote ${filePath} (${chunk.length} inserts)`);
    chunkNumber++;
  }

  // Optional: create a main loader file (not strictly necessary)
  const mainContent =
    `-- Master category content seed\n` +
    Array.from(
      { length: chunkNumber - 1 },
      (_, i) => `.read ./migrations/02b_seed_category_content_${i + 1}.sql`,
    ).join("\n") +
    `\n\nSELECT 'All category content chunks loaded.';`;

  await fs.writeFile(
    "./migrations/02b_seed_category_content_main.sql",
    mainContent,
  );
  console.log(`✅ Wrote main loader file`);
}

generateChunks().catch(console.error);
