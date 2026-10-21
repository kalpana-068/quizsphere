const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    questionCount: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    duration: { type: Number, required: true }, // minutes
    passingMarks: { type: Number, default: 0 },
    accessCode: { type: String, required: true },
    shuffle: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    pausedAt: { type: Date, default: null },
    extraMs: { type: Number, default: 0 }, // time added by extend / freeze
  },
  { timestamps: true }
);
module.exports = mongoose.model('Quiz', schema);
