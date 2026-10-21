const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // per-student shuffled order of questions and options
    items: [{ _id: false, question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }, options: [String] }],
    answers: [{ _id: false, question: mongoose.Schema.Types.ObjectId, answer: String, flagged: Boolean }],
    status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    tabSwitches: { type: Number, default: 0 },
    tabLogs: [Date],
  },
  { timestamps: true }
);
schema.index({ quiz: 1, student: 1 }, { unique: true }); // one attempt per student per quiz
module.exports = mongoose.model('Attempt', schema);
