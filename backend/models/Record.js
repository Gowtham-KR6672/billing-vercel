const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sheet',
      required: true,
    },

    processType: {
      type: String,
      required: true,
      trim: true,
    },

    slNo: { type: String, default: '' },
    potentialNo: { type: String, default: '' },
    project: { type: String, default: '' },
    invDesc: { type: String, default: '' },
    aoNumber: { type: String, default: '' },
    month: { type: String, default: '' },
    invoiceNo: { type: String, default: '' },
    date: { type: String, default: '' },
    quantity: { type: String, default: '' },
    uom: { type: String, default: '' },
    contactPerson: { type: String, default: '' },

    billedStatus: { type: Boolean, default: false },

    item2Q: { type: String, default: '' },
    item2UOM: { type: String, default: '' },
    item3Q: { type: String, default: '' },
    item3UOM: { type: String, default: '' },
    item4Q: { type: String, default: '' },
    item4UOM: { type: String, default: '' },
    item5Q: { type: String, default: '' },
    item5UOM: { type: String, default: '' },
    item6Q: { type: String, default: '' },
    item6UOM: { type: String, default: '' },

    extraFields: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Record', recordSchema);