const mongoose = require('mongoose');

const slNoCounterSchema = new mongoose.Schema(
  {
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sheet',
      required: true,
      unique: true,
    },
    lastNumber: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SlNoCounter', slNoCounterSchema);