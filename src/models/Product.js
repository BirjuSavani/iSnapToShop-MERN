const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    item_type: String,
    category_slug: String,
    is_image_less_product: Boolean,

    short_description: String,

    media: [
      {
        url: String,
        type: String,
      },
    ],

    custom_order: {
      manufacturing_time: Number,
      manufacturing_time_unit: String,
      is_custom_order: Boolean,
    },

    net_quantity: {
      value: Number,
      unit: String,
    },

    description: String,
    size_guide: String,

    variant_media: mongoose.Schema.Types.Mixed,

    name: { type: String, required: true },

    product_publish: {
      product_online_date: Number,
      is_set: Boolean,
    },

    return_config: {
      time: Number,
      unit: String,
      returnable: Boolean,
    },

    slug: { type: String, index: true },

    tags: [String],
    no_of_boxes: Number,

    multi_size: Boolean,
    item_code: String,

    _custom_json: mongoose.Schema.Types.Mixed,

    country_of_origin: String,
    highlights: [String],

    departments: [Number],

    brand_uid: Number,
    is_dependent: Boolean,

    currency: String,
    product_group_tag: [String],

    teaser_tag: {
      tag: String,
    },

    is_set: Boolean,
    template_tag: String,
    category_uid: Number,

    primary_material: String,

    // keys with hyphen must be quoted
    "net-quantity": String,
    essential: String,

    "marketer-name": String,
    "marketer-address": String,

    gender: [String],
    primary_color: String,

    uid: { type: Number, index: true },

    created_on: Date,
    modified_on: Date,

    created_by: {
      user_id: String,
      super_user: Boolean,
      username: String,
    },

    modified_by: {
      user_id: String,
      super_user: Boolean,
      username: String,
    },

    stage: String,
    variants: mongoose.Schema.Types.Mixed,

    all_company_ids: [Number],
    all_identifiers: [String],

    all_sizes: [
      {
        item_code: String,
        brand_uid: Number,
        size: String,
        identifiers: [
          {
            gtin_value: String,
            primary: Boolean,
            gtin_type: String,
          },
        ],
        price: {
          marked: {
            min: Number,
            max: Number,
          },
          effective: {
            min: Number,
            max: Number,
          },
        },
        item_width: Number,
        item_length: Number,
        item_height: Number,
        item_dimensions_unit_of_measure: String,
        item_weight: Number,
        item_weight_unit_of_measure: String,
        sellable: Boolean,
      },
    ],

    price: {
      marked: {
        min: Number,
        max: Number,
        currency_code: String,
        currency_symbol: String,
      },
      effective: {
        min: Number,
        max: Number,
        currency_code: String,
        currency_symbol: String,
      },
      selling: {
        min: Number,
        max: Number,
        currency_code: String,
        currency_symbol: String,
      },
    },

    sizes: [String],
    is_available: Boolean,
    discount: Number,

    _custom_meta: [mongoose.Schema.Types.Mixed],

    sellable_quantity: Number,

    store_id_list: [String],

    brand: {
      uid: Number,
      name: String,
      logo: {
        aspect_ratio: String,
        aspect_ratio_f: Number,
        url: String,
        secure_url: String,
      },
    },

    images: [String],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Product", ProductSchema);
