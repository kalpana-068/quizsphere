const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    unit: { type: String, default: 'General', trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    type: { type: String, enum: ['mcq', 'truefalse', 'fillblank'], required: true },
    text: { type: String, required: true, trim: true },
    options: [String],
    correctAnswer: { type: String, required: true },
    marks: { type: Number, default: 1 },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Question', schema);
