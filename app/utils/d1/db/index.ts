import { executeQuery } from "./client";
import * as helpers from "./helpers";
import { transaction, Transaction } from "./transaction";
import * as productsService from "./services/products";
import * as relationsService from "./services/relations";
import * as legacyService from "./services/legacy";

if (
  !process.env.CLOUDFLARE_ACCOUNT_ID ||
  !process.env.CLOUDFLARE_D1_API_TOKEN ||
  !process.env.CLOUDFLARE_D1_DATABASE_ID
) {
  throw new Error(
    "Missing required D1 configuration: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_API_TOKEN, and CLOUDFLARE_D1_DATABASE_ID must be set",
  );
}

const db = {
  execute: executeQuery,

  selectAll: helpers.selectAll,
  selectWhere: helpers.selectWhere,
  insertRow: helpers.insertRow,
  updateRow: helpers.updateRow,
  deleteRow: helpers.deleteRow,
  getRecentlyUpdated: legacyService.getRecentlyUpdated,
  getRecentlyCreated: legacyService.getRecentlyCreated,

  products: {
    insert: legacyService.insertProductLegacy,
    update: legacyService.updateProductLegacy,
  },

  productsNew: {
    create: productsService.createProduct,
    getById: productsService.getProductById,
    update: productsService.updateProduct,
    getRecentlyUpdated: productsService.getRecentlyUpdated,
    getRecentlyCreated: productsService.getRecentlyCreated,
    addParagraphs: relationsService.addParagraphs,
    addFeatures: relationsService.addFeatures,
    addImages: relationsService.addImages,
    addFeedbacks: relationsService.addFeedbacks,
    updateRelations: relationsService.updateRelations,
  },

  transaction,
};

export { db };
