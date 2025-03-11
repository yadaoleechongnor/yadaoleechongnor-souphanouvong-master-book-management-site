const Branch = require('../models/branch');

// Get all branches
exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.find()
      .populate({
        path: 'department_id',
        select: 'department_name',
        populate: {
          path: 'faculties_id',
          select: 'faculties_name'
        }
      });

    res.status(200).json({
      success: true,
      results: branches.length,
      data: {
        branches,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single branch
exports.getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate({
        path: 'department_id',
        select: 'department_name',
        populate: {
          path: 'faculties_id',
          select: 'faculties_name'
        }
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'No branch found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        branch,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a branch - Admin only
exports.createBranch = async (req, res) => {
  try {
    const newBranch = await Branch.create({
      branch_name: req.body.branch_name,
      department_id: req.body.department_id,
    });

    res.status(201).json({
      success: true,
      data: {
        branch: newBranch,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a branch - Admin only
exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      {
        branch_name: req.body.branch_name,
        department_id: req.body.department_id,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'No branch found with that ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        branch,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a branch - Admin only
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'No branch found with that ID',
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