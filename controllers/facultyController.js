const Faculty = require('../models/facultyModel');

// Get all faculties
exports.getAllFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find();

    res.status(200).json({
      success: true,
      results: faculties.length,
      data: {
        faculties,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single faculty
exports.getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'No faculty found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        faculty,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a faculty - Admin only
exports.createFaculty = async (req, res) => {
  try {
    const newFaculty = await Faculty.create({
      faculties_name: req.body.faculties_name,
    });

    res.status(201).json({
      success: true,
      data: {
        faculty: newFaculty,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a faculty - Admin only
exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      { faculties_name: req.body.faculties_name },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'No faculty found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        faculty,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a faculty - Admin only
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'No faculty found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};