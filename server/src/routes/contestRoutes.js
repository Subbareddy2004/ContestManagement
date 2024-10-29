const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Submission = require('../models/Submission');
const { auth } = require('../middleware/auth');
const { isFaculty } = require('../middleware/faculty');

// Get all contests
router.get('/', auth, async (req, res) => {
  try {
    const contests = await Contest.find()
      .populate('createdBy', 'name email')
      .populate('problems.problem', 'title difficulty points')
      .populate('participants', 'name regNumber')
      .sort('-createdAt');
    
    console.log('Fetched contests:', contests);
    res.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ message: 'Failed to fetch contests' });
  }
});

// Create new contest
router.post('/', auth, isFaculty, async (req, res) => {
  try {
    console.log('Creating contest with data:', req.body);

    const contest = new Contest({
      title: req.body.title,
      description: req.body.description,
      startTime: req.body.startTime,
      duration: req.body.duration,
      problems: req.body.problems.map(p => ({
        problem: p.problemId,
        points: parseInt(p.points)
      })),
      createdBy: req.user._id
    });

    const newContest = await contest.save();
    const populatedContest = await Contest.findById(newContest._id)
      .populate('createdBy', 'name email')
      .populate('problems.problem', 'title difficulty points')
      .populate('participants', 'name regNumber');

    console.log('Saved contest:', populatedContest);
    res.status(201).json(populatedContest);
  } catch (error) {
    console.error('Contest creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update contest
router.put('/:id', auth, isFaculty, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    contest.title = req.body.title;
    contest.description = req.body.description;
    contest.startTime = req.body.startTime;
    contest.duration = req.body.duration;
    contest.problems = req.body.problems.map(p => ({
      problem: p.problemId,
      points: parseInt(p.points)
    }));

    const updatedContest = await contest.save();
    const populatedContest = await Contest.findById(updatedContest._id)
      .populate('createdBy', 'name email')
      .populate('problems.problem', 'title difficulty')
      .populate('participants', 'name regNumber');

    res.json(populatedContest);
  } catch (error) {
    console.error('Contest update error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete contest
router.delete('/:id', auth, isFaculty, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    res.json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Delete contest error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single contest with populated problems
router.get('/:id', auth, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('problems.problem', 'title difficulty points')
      .populate('participants', 'name regNumber');
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    res.json(contest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get contest leaderboard
router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('problems', 'title points');
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Get all submissions for this contest
    const submissions = await Submission.find({
      contest: req.params.id
    }).populate('student', 'name regNumber');

    // Calculate leaderboard data
    const leaderboardMap = new Map();

    submissions.forEach(submission => {
      const studentId = submission.student._id.toString();
      
      if (!leaderboardMap.has(studentId)) {
        leaderboardMap.set(studentId, {
          student: submission.student,
          problemsSolved: 0,
          totalPoints: 0,
          totalTime: 0,
          submissions: new Set()
        });
      }

      const studentData = leaderboardMap.get(studentId);
      
      if (submission.status === 'Accepted' && !studentData.submissions.has(submission.problem.toString())) {
        studentData.problemsSolved++;
        studentData.totalPoints += submission.points;
        studentData.totalTime += submission.executionTime;
        studentData.submissions.add(submission.problem.toString());
      }
    });

    // Convert map to array and sort
    const leaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.problemsSolved !== a.problemsSolved) return b.problemsSolved - a.problemsSolved;
        return a.totalTime - b.totalTime;
      });

    res.json({
      contest,
      leaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// Get student submissions for a contest
router.get('/:id/submissions/:studentId', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      contest: req.params.id,
      student: req.params.studentId
    })
    .populate('problem', 'title')
    .populate('student', 'name regNumber')
    .sort('-submittedAt');

    res.json({
      submissions,
      student: submissions[0]?.student || null
    });
  } catch (error) {
    console.error('Submissions error:', error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
});

module.exports = router;
