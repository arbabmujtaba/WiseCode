const express = require('express');
const {
  createProblem,
  updateProblem,
  deleteProblem,
  getProblemById,
  getAllProblem,
  solvedAllProblembyUser,
  submittedProblem,
} = require('../controllers/problem.controller');
const { requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin
router.post('/create', requireAdmin, createProblem);
router.put('/update/:id', requireAdmin, updateProblem);
router.delete('/delete/:id', requireAdmin, deleteProblem);

// User
router.get('/getAllProblem', requireUser, getAllProblem);
router.get('/problemById/:id', requireUser, getProblemById);
router.get('/problemSolvedByUser', requireUser, solvedAllProblembyUser);
router.get('/submittedProblem/:pid', requireUser, submittedProblem);

module.exports = router;
