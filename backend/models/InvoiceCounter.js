const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema(
  {
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sheet',
      required: true,
    },
    fy: {
      type: String,
      required: true,
      trim: true,
    },
    lastNumber: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

invoiceCounterSchema.index({ sheetId: 1, fy: 1 }, { unique: true });

module.exports = mongoose.model('InvoiceCounter', invoiceCounterSchema);