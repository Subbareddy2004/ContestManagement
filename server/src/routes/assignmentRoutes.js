const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { isFaculty } = require('../middleware/faculty');
const Assignment = require('../models/Assignment');

// Get all assignments
router.get('/', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('problems', 'title')
      .sort('-createdAt');
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments' });
  }
});

// Create new assignment (faculty only)
router.post('/', auth, isFaculty, async (req, res) => {
  try {
    const assignment = new Assignment({
      ...req.body,
      createdBy: req.user.id
    });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating assignment' });
  }
});

// Get assignment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('problems', 'title description difficulty');
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignment' });
  }
});

// Update assignment (faculty only)
router.put('/:id', auth, isFaculty, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Error updating assignment' });
  }
});

// Delete assignment (faculty only)
router.delete('/:id', auth, isFaculty, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting assignment' });
  }
});

module.exports = router;