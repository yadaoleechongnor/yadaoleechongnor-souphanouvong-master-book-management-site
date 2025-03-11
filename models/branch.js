const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    branch_name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;