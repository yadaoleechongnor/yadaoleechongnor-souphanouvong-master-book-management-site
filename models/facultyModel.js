const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    faculties_name: {
      type: String,
      required: [true, 'Faculty name is required'],
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Faculty = mongoose.model('Faculty', facultySchema);

module.exports = Faculty;