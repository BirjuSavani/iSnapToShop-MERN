const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  applicationId: { type: String, required: true },
  companyId: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'search',
      'image_search',
      'image_not_found',
      'add_to_cart',
      'prompt_image_generation',
      'prompt_image_failed',
    ],
    required: true,
  },
  query: { type: String },
  imageId: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', eventSchema);
