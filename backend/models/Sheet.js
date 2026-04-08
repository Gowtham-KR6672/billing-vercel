const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    processType: {
      type: String,
      enum: ['OG Inv', 'FTE Inv', 'OnT Inv', 'Creative Services', 'Post Bill'],
      required: true,
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customHeaders: { type: Object, default: {} },
    extraHeaders: { type: [String], default: [] },
    hiddenHeaders: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sheet', sheetSchema);