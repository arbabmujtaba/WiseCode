const express = require('express');

const problemRouter = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const userMiddleware = require('../middleware/userMiddleware');
const {
  createProblem,
  updateProblem,
  deleteProblem,
  getProblemById,
  getAllProblem,
  solvedAllProblembyUser,
  submittedProblem,
} = require('../controllers/userProblem');

// Admin
problemRouter.post('/create', adminMiddleware, createProblem);
problemRouter.put('/update/:id', adminMiddleware, updateProblem);
problemRouter.delete('/delete/:id', adminMiddleware, deleteProblem);

// User
problemRouter.get('/problemById/:id', userMiddleware, getProblemById);
problemRouter.get('/getAllProblem', userMiddleware, getAllProblem);
problemRouter.get('/problemSolvedByUser', userMiddleware, solvedAllProblembyUser);
problemRouter.get('/submittedProblem/:pid', userMiddleware, submittedProblem);

module.exports = problemRouter;
