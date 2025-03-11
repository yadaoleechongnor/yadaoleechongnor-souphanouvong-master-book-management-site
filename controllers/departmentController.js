const Department = require('../models/departmentModel');

// Get all departments
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('faculties_id', 'faculties_name');

    res.status(200).json({
      success: true,
      results: departments.length,
      data: {
        departments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single department
exports.getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('faculties_id', 'faculties_name');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'No department found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        department,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a department - Admin only
exports.createDepartment = async (req, res) => {
  try {
    const newDepartment = await Department.create({
      department_name: req.body.department_name,
      faculties_id: req.body.faculties_id,
    });

    res.status(201).json({
      success: true,
      data: {
        department: newDepartment,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a department - Admin only
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      {
        department_name: req.body.department_name,
        faculties_id: req.body.faculties_id,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'No department found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        department,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a department - Admin only
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'No department found with that ID',
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