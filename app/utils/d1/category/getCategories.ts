// utils/d1/category/getCategories.ts

import { executeQuery } from "../execute";
import type { D1Database } from "@cloudflare/workers-types";

function safeJSONParse<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function parseCategory(cat: any): any {
  const parsed = {
    ...cat,
    keywords: safeJSONParse<string[]>(cat.keywords, []),
    condition_group: cat.condition_group
      ? safeJSONParse<any>(cat.condition_group, null)
      : null,
  };

  if (cat.children) {
    const childrenArray = safeJSONParse<any[]>(cat.children, []);
    const parsedChildren = childrenArray.map((child: any) =>
      parseCategory(child),
    );
    if (parsedChildren.length > 0) {
      parsed.children = parsedChildren;
    }
  }

  return parsed;
}

/**
 * Retrieves the entire hierarchical category tree.
 * @param options - Required: db instance
 */
export async function getCategories(options: { db: D1Database }) {
  const { db } = options;

  const rawCategories = await executeQuery(
    `SELECT * FROM v_category_tree ORDER BY id ASC`,
    [],
    db, // <-- pass the db instance
  );

  console.log(
    `[getCategories] Raw categories count: ${rawCategories?.length || 0}`,
  );

  const parsed = (rawCategories || []).map((cat, index) => {
    try {
      return parseCategory(cat);
    } catch (err) {
      console.error(`[getCategories] Parse error at index ${index}:`, err);
      console.error(`[getCategories] Raw category:`, cat);
      throw err;
    }
  });

  console.log(
    `[getCategories] Successfully parsed ${parsed.length} categories`,
  );
  return parsed;
}

// 📂 Parsed categories: [
//   {
//     "id": 1,
//     "slug": "computers-tablets",
//     "name": "Computers & Tablets",
//     "parent_category": null,
//     "condition_group_id": 1,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Computers-Tablets-Networking/_i.html?_sacat=58058",
//     "keywords": [
//       "Tablet Computer",
//       "Gaming Computer",
//       "Buy Personal Computer"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "electronics",
//       "group_name": "Electronics",
//       "options": [
//         "New",
//         "Opened - never used",
//         "Certified - Refurbished",
//         "Excellent - Refurbished",
//         "Very Good - Refurbished",
//         "Good - Refurbished",
//         "Seller refurbished",
//         "Used",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "computer-components",
//         "name": "Computer Components",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Laptop-Desktop-Accessories/_i.html?_sacat=31530",
//         "keywords": [
//           "Shop Computer Components",
//           "Computer Parts Hardware",
//           "PC Components"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "desktop-computers",
//         "name": "Desktop Computers",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Computers-Tablets-Networking/_i.html?_sacat=58058",
//         "keywords": [
//           "Desktop Computer",
//           "Desktop Personal Computer",
//           "PC Desktop Computer"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "laptops",
//         "name": "Laptops",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Laptops-Netbooks/_i.html?_sacat=175672",
//         "keywords": [
//           "Gaming Laptop",
//           "Buy Laptop",
//           "Work Laptop"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "other-computers-tablets",
//         "name": "Other Computers & Tablets",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Computers-Tablets-Networking/_i.html?_sacat=58058",
//         "keywords": [
//           "Computer Accessories",
//           "Personal Computer Accessories",
//           "Laptop computer accessories"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "tablets-and-ereaders",
//         "name": "Tablets and eReaders",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Tablets-eBook-Readers/_i.html?_sacat=171485",
//         "keywords": [
//           "Buy iPad",
//           "Order Tablet Online",
//           "Tablet Computer"
//         ],
//         "product_count": 1,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   },
//   {
//     "id": 2,
//     "slug": "smart-home",
//     "name": "Smart Home",
//     "parent_category": null,
//     "condition_group_id": 1,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700",
//     "keywords": [
//       "Home Smart Devices",
//       "Smart Home Device",
//       "Smart home automation devices"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "electronics",
//       "group_name": "Electronics",
//       "options": [
//         "New",
//         "Opened - never used",
//         "Certified - Refurbished",
//         "Excellent - Refurbished",
//         "Very Good - Refurbished",
//         "Good - Refurbished",
//         "Seller refurbished",
//         "Used",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "diy",
//         "name": "DIY",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700",
//         "keywords": [
//           "DIY products",
//           "Tools and equipment",
//           "Kitchen and appliances"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "home-automation",
//         "name": "Home Automation",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700",
//         "keywords": [
//           "Smart home automation devices",
//           "Smart home gadgets",
//           "Smart home products"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "other-smart-home",
//         "name": "Other Smart Home",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700",
//         "keywords": [
//           "Smart home automation devices",
//           "Smart home gadgets",
//           "Smart home products"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "security",
//         "name": "Security",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700",
//         "keywords": [
//           "Security camera",
//           "Home camera security",
//           "Home alarm systems"
//         ],
//         "product_count": 1,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "wifi-routers-networking",
//         "name": "Wifi, Routers & Networking",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Home-Furniture-DIY/_i.html?_sacat=11700",
//         "keywords": [
//           "Wifi router for home",
//           "Home wifi routers",
//           "Wireless routers"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   },
//   {
//     "id": 3,
//     "slug": "mobile-phones-wearable-tech",
//     "name": "Mobile Phones & Wearable Tech",
//     "parent_category": null,
//     "condition_group_id": 1,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032",
//     "keywords": [
//       "Buy mobile phones",
//       "Mobile phones for sale",
//       "Buy Smart Watch"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "electronics",
//       "group_name": "Electronics",
//       "options": [
//         "New",
//         "Opened - never used",
//         "Certified - Refurbished",
//         "Excellent - Refurbished",
//         "Very Good - Refurbished",
//         "Good - Refurbished",
//         "Seller refurbished",
//         "Used",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "android-smart-phones",
//         "name": "Android Smart Phones",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032",
//         "keywords": [
//           "Cheap android phones",
//           "Android mobile phone",
//           "Android smartphone"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "apple-iphone",
//         "name": "Apple iPhone",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032",
//         "keywords": [
//           "iPhone for sale",
//           "Buy iPhone",
//           "Shop iPhone"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "chargers",
//         "name": "Chargers",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032",
//         "keywords": [
//           "Buy iPhone chargers",
//           "Buy laptop chargers",
//           "Buy portable chargers"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "other-mobile-phones-wearable-tech",
//         "name": "Other Mobile Phones & Wearable Tech",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Mobile-Phones-Communication/_i.html?_sacat=15032",
//         "keywords": [
//           "Smart ring",
//           "iPhone accessories",
//           "USB C charging cable"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "smart-watches",
//         "name": "Smart Watches",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Smart-Watches/_i.html?_sacat=178893",
//         "keywords": [
//           "Smart watch for women",
//           "Mens smart watch",
//           "Fitness watches"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   },
//   {
//     "id": 4,
//     "slug": "audio-visual",
//     "name": "Audio & Visual",
//     "parent_category": null,
//     "condition_group_id": 1,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293",
//     "keywords": [
//       "Wireless headphones",
//       "Bluetooth speaker",
//       "Audio visual equipment"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "electronics",
//       "group_name": "Electronics",
//       "options": [
//         "New",
//         "Opened - never used",
//         "Certified - Refurbished",
//         "Excellent - Refurbished",
//         "Very Good - Refurbished",
//         "Good - Refurbished",
//         "Seller refurbished",
//         "Used",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "headphones",
//         "name": "Headphones",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293",
//         "keywords": [
//           "Wireless headphones",
//           "Noise cancelling headphones",
//           "Wireless earbuds"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "other-sound-vision",
//         "name": "Other Sound & Vision",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293",
//         "keywords": [
//           "Audio accessories and cables",
//           "TV wall brackets",
//           "Cables and accessories"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "projectors",
//         "name": "Projectors",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293",
//         "keywords": [
//           "Home projector",
//           "Home cinema projector",
//           "Projector for television"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "speakers",
//         "name": "Speakers",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293",
//         "keywords": [
//           "Bluetooth speaker",
//           "Portable speakers",
//           "Wireless speakers"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "tvs",
//         "name": "TVs",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Sound-Vision/_i.html?_sacat=293",
//         "keywords": [
//           "Smart TVs",
//           "TV wall brackets",
//           "Buy televisions"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   },
//   {
//     "id": 5,
//     "slug": "gaming",
//     "name": "Gaming",
//     "parent_category": null,
//     "condition_group_id": 1,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249",
//     "keywords": [
//       "Gaming consoles",
//       "Gaming controller",
//       "PC Gaming"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "electronics",
//       "group_name": "Electronics",
//       "options": [
//         "New",
//         "Opened - never used",
//         "Certified - Refurbished",
//         "Excellent - Refurbished",
//         "Very Good - Refurbished",
//         "Good - Refurbished",
//         "Seller refurbished",
//         "Used",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "consoles",
//         "name": "Consoles",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249",
//         "keywords": [
//           "Console for games",
//           "Games console",
//           "Video games console"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "gaming-headsets",
//         "name": "Gaming Headsets",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249",
//         "keywords": [
//           "Gaming headset",
//           "Wireless gaming headset",
//           "Headset for gaming"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "other-gaming",
//         "name": "Other Gaming",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249",
//         "keywords": [
//           "Gaming accessories",
//           "Game accessories",
//           "Buy gaming accessories"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "pc-gaming",
//         "name": "PC Gaming",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249",
//         "keywords": [
//           "Gaming laptops",
//           "Gaming desktops",
//           "Gaming monitors"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "video-games",
//         "name": "Video Games",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Video-Games-Consoles/_i.html?_sacat=1249",
//         "keywords": [
//           "Shop video games",
//           "Video games shop",
//           "PS5 games"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   },
//   {
//     "id": 6,
//     "slug": "digital-cameras-photography",
//     "name": "Digital Cameras & Photography",
//     "parent_category": null,
//     "condition_group_id": 1,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Cameras-Photography/_i.html?_sacat=625",
//     "keywords": [
//       "Digital Cameras",
//       "Drones with cameras",
//       "Camera lenses"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "electronics",
//       "group_name": "Electronics",
//       "options": [
//         "New",
//         "Opened - never used",
//         "Certified - Refurbished",
//         "Excellent - Refurbished",
//         "Very Good - Refurbished",
//         "Good - Refurbished",
//         "Seller refurbished",
//         "Used",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "camcorders",
//         "name": "Camcorders",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Camcorders/_i.html?_sacat=11724",
//         "keywords": [
//           "Digital video camera",
//           "Digital video camcorder",
//           "4K video camera"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "digital-cameras",
//         "name": "Digital Cameras",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Cameras-Photography/_i.html?_sacat=625",
//         "keywords": [
//           "Digital Cameras",
//           "DSLR camera",
//           "DSLR digital cameras"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "drones",
//         "name": "Drones",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Camera-Drones/_i.html?_sacat=179697",
//         "keywords": [
//           "Drones with cameras",
//           "DJI drones UK",
//           "Buy drones UK"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "lenses",
//         "name": "Lenses",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Lenses-Filters/_i.html?_sacat=78997",
//         "keywords": [
//           "Camera lenses",
//           "DSLR camera lenses",
//           "Canon camera lenses"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "other-digital-cameras-photography",
//         "name": "Other Digital Cameras & Photography",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Camera-Drone-Photo-Accessories/_i.html?_sacat=15200",
//         "keywords": [
//           "Camera accessories",
//           "Camera equipment",
//           "Digital camera equipment"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   },
//   {
//     "id": 7,
//     "slug": "other-products",
//     "name": "Other Products",
//     "parent_category": null,
//     "condition_group_id": 4,
//     "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies",
//     "keywords": [
//       "Makeup products",
//       "Skincare products",
//       "Business tech products"
//     ],
//     "created_at": 1773831135,
//     "updated_at": 1773831135,
//     "product_count": 0,
//     "condition_group": {
//       "group_key": "general",
//       "group_name": "General",
//       "options": [
//         "New",
//         "Used",
//         "Refurbished",
//         "For parts or not working"
//       ]
//     },
//     "children": [
//       {
//         "slug": "business-office",
//         "name": "Business & Office",
//         "condition_group_id": 2,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Business-Office-Industrial/_i.html?_sacat=12576",
//         "keywords": [
//           "Card payment machines",
//           "Business wifi routers",
//           "Security camera"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "business",
//           "group_name": "Business & Industrial",
//           "options": [
//             "New",
//             "New other (see details)",
//             "Certified refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "health-and-beauty",
//         "name": "Health and Beauty",
//         "condition_group_id": 3,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Health-Beauty/_i.html?_sacat=26395",
//         "keywords": [
//           "Makeup products",
//           "Skincare products",
//           "Womens makeup"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "babyHealthBeauty",
//           "group_name": "Baby, Health & Beauty",
//           "options": [
//             "New",
//             "New other (see details)",
//             "Used",
//             "For parts or not working",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished"
//           ]
//         }
//       },
//       {
//         "slug": "in-car-tech",
//         "name": "In Car Tech",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Vehicle-Parts-Accessories/_i.html?_sacat=131090",
//         "keywords": [
//           "Sat nav",
//           "Dash cams",
//           "Apple CarPlay"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "miscellaneous-tech",
//         "name": "Miscellaneous Tech",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies",
//         "keywords": [
//           "Mens sport watches",
//           "womens analogue watches",
//           "quartz watch"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       },
//       {
//         "slug": "musical-instruments-dj-equipment",
//         "name": "Musical Instruments & DJ Equipment",
//         "condition_group_id": 1,
//         "ebay_store_link": "https://www.ebay.co.uk/str/rougetechnologies/Musical-Instruments-DJ-Equipment/_i.html?_sacat=619",
//         "keywords": [
//           "Wireless speakers",
//           "Musical instruments",
//           "Noise cancelling headphones"
//         ],
//         "product_count": 0,
//         "condition_group": {
//           "group_key": "electronics",
//           "group_name": "Electronics",
//           "options": [
//             "New",
//             "Opened - never used",
//             "Certified - Refurbished",
//             "Excellent - Refurbished",
//             "Very Good - Refurbished",
//             "Good - Refurbished",
//             "Seller refurbished",
//             "Used",
//             "For parts or not working"
//           ]
//         }
//       }
//     ]
//   }
// ]
