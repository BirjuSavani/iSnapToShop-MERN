const { AIService } = require("../services/aiServices");
const { setStatus, getStatus } = require("./indexStatusStore");
const { logger } = require("../utils/logger");
const { logEvent } = require("../controller/analyticsController");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");
const fs = require("fs");
const path = require("path");
const ProductSchema = require("../models/Product");

const aiService = new AIService();

const requestInfo = req => {
  try {
    // const { application_id, company_id } = req.query || null;
    const application_id = "672ddc7346bed2c768faf043";
    const company_id = "9095";
    if (application_id && company_id) {
      return { application_id, company_id };
    }
    const appDataHeader = req.headers["x-application-data"];
    if (appDataHeader) {
      try {
        const appData =
          typeof appDataHeader === "string" ? JSON.parse(appDataHeader) : appDataHeader;
        return {
          application_id: appData?._id,
          company_id: appData?.company_id,
        };
      } catch (e) {
        logger.error("Failed to parse x-application-data", { error: e });
      }
    }
    return null;
  } catch (error) {
    logger.error("Error in requestInfo", { error });
    // Sentry.captureException(error);
    return null;
  }
};

const fetchProductsForIndexing = async (platformClient, applicationId) => {
  logger.info("Fetching all products for indexing using sequential pagination...", {
    applicationId,
  });

  let allProducts = [];
  const pageSize = 100;
  let pageNo = 1;
  let hasNext = true;

  // while (hasNext) {
  //   try {
  //     logger.info(`Fetching product page ${pageNo}...`, { applicationId, pageSize });

  //     const response = applicationId
  //       ? await platformClient
  //           .application(applicationId)
  //           .catalog.getAppProducts({ pageNo: pageNo, pageSize: pageSize })
  //       : await platformClient.catalog.getProducts({ pageNo: pageNo, pageSize: pageSize });

  //     if (response && response.items && response.items.length > 0) {
  //       allProducts.push(...response.items);
  //     }

  //     if (response && response.page && response.page.has_next) {
  //       pageNo++;
  //     } else {
  //       hasNext = false;
  //     }
  //   } catch (error) {
  //     logger.error("Failed to fetch a product page. Aborting indexing data fetch.", {
  //       page: pageNo,
  //       applicationId,
  //       error: error.message,
  //     });
  //     throw new Error(`Failed to fetch all products for indexing. Error on page ${pageNo}.`);
  //   }
  // }

  try {
    allProducts = await ProductSchema.find().lean();

    // Transform DB documents to match required format
    allProducts = allProducts.map(product => ({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      short_description: product.short_description || "",
      category_slug: product.category_slug || "",
      brand: product.brand?.name || "",
      media: product.media || [],
      all_sizes: (product.all_sizes || []).map(size => ({
        size: size.size,
        price: {
          marked: size.price?.marked || {},
          effective: size.price?.effective || {},
        },
        sellable: size.sellable,
      })),
    }));

    logger.info("Successfully fetched all products for indexing", {
      productCount: allProducts.length,
      applicationId,
    });
    return allProducts;
  } catch (error) {
    logger.error("Failed to fetch products from database", {
      error: error.message,
      applicationId,
    });
    throw new Error("Failed to fetch products from database");
  }
};

exports.getProducts = async (req, res) => {
  applicationId = "672ddc7346bed2c768faf043";
  logger.info("Fetching all products for indexing using sequential pagination...", {
    applicationId,
  });

  let allProducts = [];

  try {
    allProducts = await ProductSchema.find().lean().maxTimeMS(30000);

    logger.info("Successfully fetched all products for indexing", {
      productCount: allProducts.length,
      applicationId,
    });
    return res.json({ success: true, products: allProducts });
  } catch (error) {
    logger.error("Failed to fetch products from database", {
      error: error,
      applicationId,
    });
    return res.status(500).json({ success: false, error: "Failed to fetch products from database" });
  }
};

exports.initProductIndexing = async (req, res) => {
  const { platformClient } = req;
  const { company_id, application_id } = req.query;

  try {
    const products = await fetchProductsForIndexing(platformClient, application_id);

    if (!products.length) {
      logger.warn("No products found to index", { application_id, company_id });
      return res.status(400).json({ error: "No products found to index" });
    }

    setStatus(application_id, "in-progress");

    aiService
      .indexProducts(products, company_id, application_id)
      .then(() => {
        setStatus(application_id, "completed");
        logger.info("Indexing completed", { application_id, company_id });
      })
      .catch(err => {
        setStatus(application_id, "failed");
        logger.error("Indexing failed", { error: err, application_id, company_id });
      });

    logger.info("Indexing started in background", {
      productCount: products.length,
      application_id,
      company_id,
    });

    res.json({ success: true, message: "Indexing started in background" });
  } catch (error) {
    logger.error("Error in initProductIndexing", { error, application_id, company_id });
    // Sentry.captureException("Error in initProductIndexing function", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const processImageSearch = async (req, res, platformClient, info) => {
  const { application_id, company_id } = info;

  try {
    if (!req.file) {
      logger.warn("No image uploaded for search");
      return res.status(400).json({ error: "No image uploaded" });
    }

    logger.info("Received image search request", {
      company_id,
      application_id,
      imageName: req.file.originalname,
    });

    // Run AI search and fetch ALL products from the platform in parallel
    const [aiResult, allProducts] = await Promise.all([
      aiService.searchByImage(
        req.file.buffer,
        company_id,
        req.file.mimetype,
        req.file.originalname
      ),
      fetchProductsForIndexing(platformClient, application_id), // This will use the cache
    ]);
    const { matches = [], metadata = {} } = aiResult;
    if (!matches.length) {
      logger.info("No matches found by AI service", { application_id });
      return res.json({ success: true, results: [], metadata });
    }

    // const fetchedProducts = (await Promise.all(productPromises)).filter(Boolean);
    const productMap = new Map(allProducts.map(p => [p.slug, p]));

    const enrichedResults = [];
    const seenSlugs = new Set();

    for (const match of matches) {
      const slug = match.slug;
      if (!slug || seenSlugs.has(slug)) continue;

      const product = productMap.get(slug);
      if (!product) continue;

      // MODIFIED: We no longer expect a 'sizes' property from our fetched data.
      // const { detail } = productData;

      enrichedResults.push({
        name: match.name || product.name,
        slug,
        image: match.image,
        text: match.text,
        description: product.description || "",
        short_description: product.short_description || "",
        category: product.category_slug || "",
        brand: product.brand || "",
        media: product.media || [],
        sizes: (product.all_sizes || []).map(size => ({
          size: size.size,
          price: {
            marked: size.price?.marked || {},
            effective: size.price?.effective || {},
          },
          sellable: size.sellable,
        })),
      });
      seenSlugs.add(slug);
    }

    await logEvent({
      applicationId: application_id,
      companyId: company_id,
      type: "image_search",
      query: JSON.stringify(matches[0]),
    });

    logger.info(`Returning ${enrichedResults.length} unique image search results`);
    res.json({ success: true, results: enrichedResults, metadata });
  } catch (error) {
    logger.error("Error in image search process", { error, company_id, application_id });
    // Sentry.captureException("Error in processImageSearch function", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.searchByImage = async (req, res) => {
  const { platformClient } = req;
  const info = requestInfo(req);
  if (!info) {
    return res.status(400).json({ error: "Missing or invalid application/company ID" });
  }
  await processImageSearch(req, res, platformClient, info);
};

exports.searchByImageUsingStoreFront = async (req, res) => {
  const info = requestInfo(req);
  if (!info) {
    return res.status(400).json({ error: "Missing or invalid application/company ID" });
  }
  try {
    // const platformClient = await fdkExtension.getPlatformClient(info.company_id);
    await processImageSearch(req, res, platformClient, info);
  } catch (error) {
    logger.error("Error getting platform client for storefront", { error, ...info });
    // Sentry.captureException("Error in searchByImageUsingStoreFront (getPlatformClient)", error);
    return res.status(500).json({ success: false, error: "Could not initialize platform client." });
  }
};

exports.getIndexStatus = (req, res) => {
  const status = getStatus(req.query.application_id);
  logger.info("Fetched index status", { application_id: req.query.application_id, status });
  res.json({ status });
};

exports.indexSingleProduct = async (productData, companyId, platformClient) => {
  try {
    const id = productData.slug || productData.id;
    if (!id) throw new Error("Product ID or slug is required");

    const product = await platformClient.catalog.getProduct({ id });
    if (!product) throw new Error("Product not found");

    await aiService.indexSingleProduct(product, companyId);

    logger.info("Single product indexed", { id, companyId });
    return { success: true, result: { products: product } };
  } catch (error) {
    logger.error("Error indexing single product", { error, companyId });
    // Sentry.captureException("Error in indexSingleProduct function", error);
    throw error;
  }
};

exports.checkSystemStatus = async (req, res) => {
  try {
    const health = await aiService.checkHealth();
    logger.info("System health checked", { health });
    res.json({
      success: true,
      aiService: health,
      isIndexed: aiService.isIndexed,
    });
  } catch (error) {
    logger.error("Error checking system status", { error });
    // Sentry.captureException("Error in checkSystemStatus function", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.removeIndex = async (req, res) => {
  const { company_id, application_id } = req.query;

  if (!company_id || !application_id) {
    logger.warn("Missing identifiers for removeIndex");
    return res.status(400).json({ error: "Company ID and Application ID are required" });
  }

  try {
    await aiService.removeIndex(application_id);
    logger.info("Index removed", { company_id, application_id });

    res.json({
      success: true,
      message: `Index removed for company ${company_id}, application ${application_id}`,
    });
  } catch (error) {
    logger.error("Error in removeIndex", { error, company_id, application_id });
    // Sentry.captureException("Error in removeIndex function", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const pixelbinConfig = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  apiSecret: "d7e92fc8-b483-442f-af85-c29b3ed65e75",
  integrationPlatform: "iSnapToShop",
});

const pixelbin = new PixelbinClient(pixelbinConfig);

exports.generatePromptsToImage = async (req, res) => {
  const { prompt } = req.body;

  const info = requestInfo(req);
  if (!info) {
    return res.status(400).json({ error: "Missing or invalid application/company ID" });
  }

  const { application_id, company_id } = info;

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Missing prompt in request body" });
  }

  try {
    const { filePath, fileName } = await aiService.generatePromptsToImage(prompt);

    if (!filePath) {
      return res.status(500).json({ success: false, error: "Image generation failed" });
    }

    const pixelbinResult = await pixelbin.assets.fileUpload({
      file: fs.createReadStream(filePath),
      name: fileName,
      path: "/generated-images/",
    });

    fs.unlinkSync(filePath);
    const imageUrl = pixelbinResult.url;

    await logEvent({
      applicationId: application_id,
      companyId: company_id,
      type: "prompt_image_generation",
      query: JSON.stringify({ prompt, imageUrl, pixelbinFileId: pixelbinResult.fileId }),
    });

    logger.info("Generated image uploaded to Pixelbin", {
      imageUrl,
      pixelbinFileId: pixelbinResult.fileId,
    });

    return res.json({
      success: true,
      imageUrl,
      pixelbinData: {
        fileId: pixelbinResult.fileId,
        name: pixelbinResult.name,
        path: pixelbinResult.path,
      },
    });
  } catch (error) {
    logger.error("Error in generatePromptsToImage", { error });
    // Sentry.captureException("Error in generatePromptsToImage function", error);

    try {
      const { filePath } = await aiService.generatePromptsToImage(prompt);
      if (global.lastGeneratedFilePath && fs.existsSync(global.lastGeneratedFilePath)) {
        fs.unlinkSync(global.lastGeneratedFilePath);
      }
    } catch (cleanupError) {
      logger.error("Error during cleanup", { cleanupError });
    }

    await logEvent({
      applicationId: application_id,
      companyId: company_id,
      type: "prompt_image_failed",
      query: JSON.stringify({ prompt, error: error.message }),
    });

    res
      .status(500)
      .json({ success: false, error: "Server error during image generation or upload" });
  }
};
