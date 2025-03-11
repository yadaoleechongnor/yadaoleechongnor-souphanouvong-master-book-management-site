const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    department_name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    faculties_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;