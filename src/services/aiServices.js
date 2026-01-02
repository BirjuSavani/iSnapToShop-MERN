const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const uuidv4 = require("uuid").v4;
const os = require("os");
const { logger } = require("../utils/logger");

const DEFAULT_BASE_URL = "http://localhost:5000";
const INDEXING_CHUNK_SIZE = 100; // This is a good, safe number.

class AIService {
  /**
   * @param {Object} options
   * @param {string} [options.baseUrl]
   * @param {string} [options.apiKey]
   * @param {number} [options.timeoutMs]
   */
  constructor(options = {}) {
    this.baseUrl = process.env.AI_SERVICE_URL || options.baseUrl || DEFAULT_BASE_URL;
    this.apiKey = process.env.AI_SERVICE_KEY || options.apiKey;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "X-API-KEY": this.apiKey,
      },
      timeout: 180000, // 3 minute timeout for long operations like indexing a large chunk
    });
  }

  async checkHealth() {
    try {
      logger.info("Checking AI service health...");
      const { data, status } = await this.axiosInstance.get("/health");
      const { model, device } = data;
      logger.info(`AI Service healthy: Model=${model}, Device=${device}`);
      return {
        healthy: status === 200,
        model,
        device,
      };
    } catch (error) {
      logger.error("AI Service health check failed:", error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * This function is already scalable due to chunking. It sends the large product list
   * to the AI service in smaller, manageable pieces.
   */
  async indexProducts(products, companyId, applicationId) {
    logger.info(
      `Indexing ${products.length} products for company=${companyId}, app=${applicationId} in chunks of ${INDEXING_CHUNK_SIZE}`
    );

    for (let i = 0; i < products.length; i += INDEXING_CHUNK_SIZE) {
      const chunk = products.slice(i, i + INDEXING_CHUNK_SIZE);
      const chunkNumber = i / INDEXING_CHUNK_SIZE + 1;
      logger.info(`Processing chunk ${chunkNumber}...`);

      try {
        await this.axiosInstance.post("/embeddings_store", {
          products: chunk,
          application_id: applicationId,
        });
        logger.info(`Successfully indexed chunk ${chunkNumber} with ${chunk.length} products.`);
      } catch (error) {
        logger.error(`A chunk failed during product indexing (chunk ${chunkNumber}):`, {
          error: error.message,
          companyId,
          applicationId,
          chunkSize: chunk.length,
        });
        // Stop on first error to prevent a corrupt or partial index.
        throw new Error(
          `Indexing failed on chunk ${chunkNumber}: ${error.response?.data?.error || error.message}`
        );
      }
    }

    logger.info("All product chunks indexed successfully.");
    return { success: true, message: "All products indexed." };
  }

  /**
   * This function remains scalable as it only processes one image.
   * The return object is slightly simplified.
   */
  async searchByImage(imageBuffer, companyId, mimeType, originalName) {
    const formData = new FormData();
    formData.append("image", imageBuffer, {
      filename: originalName || `search-image.${mimeType.split("/")[1] || "bin"}`,
      contentType: mimeType || "application/octet-stream",
    });
    formData.append("company_id", companyId);

    try {
      const response = await this.axiosInstance.post("/search/image", formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        // timeout: 30000, // 30 second timeout for search is reasonable
      });

      return {
        matches: response.data, // The controller only needs the matches
      };
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        logger.error("AI service timeout during image search", { companyId });
        throw new Error("AI service timeout");
      }
      logger.error("AI service error during image search", { error: error.message, companyId });
      throw new Error(`AI service error: ${error.response?.data?.error || error.message}`);
    }
  }

  async indexSingleProduct(product, companyId, applicationId) {
    try {
      logger.info(`Indexing single product ${product.id} for company=${companyId}`);
      return await this.indexProducts([product], companyId, applicationId);
    } catch (error) {
      logger.error(`Single product indexing failed: ${error.message}`, {
        productId: product.id,
        companyId,
      });
      throw error;
    }
  }

  async removeIndex(applicationId) {
    try {
      logger.info(`Removing index for application=${applicationId}`);

      const response = await this.axiosInstance.post("/delete_embeddings", {
        application_id: applicationId,
      });

      logger.info("Index removal successful");
      return response.data;
    } catch (error) {
      logger.error(`Index removal failed: ${error.message}`, { applicationId });
      throw new Error(`Index removal failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async generatePromptsToImage(prompt) {
    try {
      const response = await this.axiosInstance.post(
        "/generate_prompts_to_image",
        { prompt },
        { responseType: "stream" }
      );

      const contentType = response.headers["content-type"];
      const ext = contentType?.split("/")[1] || "png";
      const fileName = `generated_image_${uuidv4()}.${ext}`;

      // Use system temp directory instead of public directory
      const filePath = path.join(os.tmpdir(), fileName);

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => resolve({ filePath, fileName }));
        writer.on("error", reject);
      });
    } catch (error) {
      logger.error(`Generate prompts to image failed: ${error.message}`);
      throw new Error(
        `Generate prompts to image failed: ${error.response?.data?.error || error.message}`
      );
    }
  }
}

module.exports = { AIService };
