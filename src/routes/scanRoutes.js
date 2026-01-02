const express = require("express");
const multer = require("multer");
const scanController = require("../controller/scanController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

/**
 * @route POST /init-index
 * @desc Initialize full product indexing
 */
router.post("/init-index", asyncHandler(scanController.initProductIndexing));

/**
 * @route GET /index-status
 * @desc Get indexing status and progress
 */
router.get("/index-status", asyncHandler(scanController.getIndexStatus));

/**
 * @route POST /index-product/:productId
 * @desc Index a single product by its ID
 */
router.post("/index-product/:productId", asyncHandler(scanController.indexSingleProduct));

/**
 * @route POST /search-by-image
 * @desc Search products using an uploaded image (in-memory)
 */
router.post(
  "/search-by-image",
  (req, res, next) =>
    upload.single("image")(req, res, err => {
      if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ success: false, error: `Multer error: ${err.message}` });
      }
      next();
    }),
  asyncHandler(scanController.searchByImage)
);

router.get("/products", asyncHandler(scanController.getProducts));

/**
 * @route POST /search-by-image-using-store-front
 * @desc Search products using an uploaded image (in-memory)
 */
router.post(
  "/search-by-image-using-store-front",
  upload.single("image"),
  asyncHandler(scanController.searchByImageUsingStoreFront)
);

/**
 * @route GET /system-status
 * @desc Check internal AI search/indexing system status
 */
router.get("/system-status", asyncHandler(scanController.checkSystemStatus));

/**
 * @route POST /remove-index
 * @desc Remove or reset the product index
 */
router.post("/remove-index", asyncHandler(scanController.removeIndex));

/**
 * @route POST /generate-prompts
 * @desc Generate prompts for the product images
 */
router.post("/generate-prompts-to-image", asyncHandler(scanController.generatePromptsToImage));

/**
 * @route GET /
 * @desc Simple ping route for Scan API
 */
router.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Scan API is working!" });
});

module.exports = router;
