const Question = require('../models/Question');

const shuffle = (arr) => {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

// Time left for a student. If the teacher froze the exam, the clock stands still.
const remainingMs = (quiz, att) => {
  const end = new Date(att.startedAt).getTime() + quiz.duration * 60000 + (quiz.extraMs || 0);
  const now = quiz.isPaused && quiz.pausedAt ? new Date(quiz.pausedAt).getTime() : Date.now();
  return Math.max(0, end - now);
};

// What the student's browser receives (correct answers are never sent)
const shape = async (att, quiz) => {
  const qs = await Question.find({ _id: { $in: att.items.map((i) => i.question) } })
    .select('type text marks')
    .lean();
  const map = Object.fromEntries(qs.map((q) => [String(q._id), q]));
  return {
    _id: att._id,
    status: att.status,
    tabSwitches: att.tabSwitches,
    quiz: { _id: quiz._id, title: quiz.title, duration: quiz.duration },
    items: att.items.map((i) => {
      const q = map[String(i.question)] || {};
      return { _id: i.question, type: q.type, text: q.text, marks: q.marks, options: i.options };
    }),
    answers: att.answers.map((a) => ({ question: a.question, answer: a.answer, flagged: a.flagged })),
    remainingMs: remainingMs(quiz, att),
    isPaused: !!quiz.isPaused,
  };
};

module.exports = { shuffle, remainingMs, shape };
