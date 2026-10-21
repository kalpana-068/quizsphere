const router = require('express').Router();
const Attempt = require('../models/Attempt');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const { protect, allow } = require('../middleware/auth');
const ah = require('../utils/asyncHandler');
const { shape, remainingMs } = require('../utils/attemptHelper');
const { send } = require('../utils/mailer');

router.use(protect, allow('student'));

const load = async (req) => {
  const att = await Attempt.findOne({ _id: req.params.id, student: req.user._id });
  if (!att) return {};
  const quiz = await Quiz.findById(att.quiz);
  return { att, quiz };
};
const cleanAnswers = (att, answers) => {
  const ids = new Set(att.items.map((i) => String(i.question)));
  return (Array.isArray(answers) ? answers : [])
    .filter((a) => ids.has(String(a.question)))
    .map((a) => ({ question: a.question, answer: String(a.answer == null ? '' : a.answer).slice(0, 500), flagged: !!a.flagged }));
};
// 60 second grace so an offline student can still deliver the answers
const isLate = (quiz, att) =>
  !quiz.isPaused && Date.now() > new Date(att.startedAt).getTime() + quiz.duration * 60000 + (quiz.extraMs || 0) + 60000;
const resultOf = (a, quiz, user) => ({
  _id: a._id,
  quiz: { title: quiz.title, subject: quiz.subject, passingMarks: quiz.passingMarks },
  student: { name: user.name, email: user.email },
  score: a.score, total: a.total, passed: a.passed, submittedAt: a.submittedAt, tabSwitches: a.tabSwitches,
});
const nf = (res) => res.status(404).json({ message: 'Attempt not found' });

router.get('/mine', ah(async (req, res) => {
  const atts = await Attempt.find({ student: req.user._id, status: 'submitted' })
    .populate('quiz', 'title subject passingMarks').sort('-submittedAt').lean();
  res.json(atts.filter((a) => a.quiz).map((a) => resultOf(a, a.quiz, req.user)));
}));

router.get('/:id', ah(async (req, res) => {
  const { att, quiz } = await load(req);
  if (!att || !quiz) return nf(res);
  res.json(await shape(att, quiz));
}));

router.get('/:id/result', ah(async (req, res) => {
  const { att, quiz } = await load(req);
  if (!att || !quiz) return nf(res);
  if (att.status !== 'submitted') return res.status(400).json({ message: 'Exam not submitted yet' });
  res.json(resultOf(att, quiz, req.user));
}));

router.get('/:id/status', ah(async (req, res) => {
  const { att, quiz } = await load(req);
  if (!att || !quiz) return nf(res);
  res.json({ remainingMs: remainingMs(quiz, att), isPaused: !!quiz.isPaused, status: att.status });
}));

// auto-save / offline recovery sync
router.post('/:id/sync', ah(async (req, res) => {
  const { att, quiz } = await load(req);
  if (!att || !quiz) return nf(res);
  if (att.status === 'in_progress' && !isLate(quiz, att))
    await Attempt.updateOne({ _id: att._id, status: 'in_progress' }, { $set: { answers: cleanAnswers(att, req.body.answers) } });
  res.json({ remainingMs: remainingMs(quiz, att), isPaused: !!quiz.isPaused, status: att.status });
}));

// tab-switch logger
router.post('/:id/tab-switch', ah(async (req, res) => {
  await Attempt.updateOne(
    { _id: req.params.id, student: req.user._id, status: 'in_progress' },
    { $inc: { tabSwitches: 1 }, $push: { tabLogs: new Date() } }
  );
  res.json({ ok: true });
}));

// submit + instant auto-grading
router.post('/:id/submit', ah(async (req, res) => {
  const { att, quiz } = await load(req);
  if (!att || !quiz) return nf(res);
  if (att.status === 'submitted') return res.json({ attemptId: att._id });

  const answers = !isLate(quiz, att) && Array.isArray(req.body.answers)
    ? cleanAnswers(att, req.body.answers)
    : att.answers.map((a) => ({ question: a.question, answer: a.answer, flagged: a.flagged }));

  const qs = await Question.find({ _id: { $in: att.items.map((i) => i.question) } }).lean();
  const qm = Object.fromEntries(qs.map((q) => [String(q._id), q]));
  const am = Object.fromEntries(answers.map((a) => [String(a.question), a.answer || '']));
  let score = 0, total = 0;
  att.items.forEach((i) => {
    const q = qm[String(i.question)];
    if (!q) return;
    total += q.marks;
    const given = String(am[String(i.question)] || '').trim();
    if (!given) return;
    const ok = q.type === 'fillblank'
      ? q.correctAnswer.split('|').some((x) => x.trim().toLowerCase() === given.toLowerCase())
      : given === q.correctAnswer;
    if (ok) score += q.marks;
  });
  const passed = score >= quiz.passingMarks;
  await Attempt.updateOne(
    { _id: att._id, status: 'in_progress' },
    { $set: { answers, score, total, passed, status: 'submitted', submittedAt: new Date() }, $max: { tabSwitches: Number(req.body.tabSwitches) || 0 } }
  );
  send(req.user.email, `Your result: ${quiz.title}`,
    `<p>Hi ${req.user.name},</p><p>You scored <b>${score} / ${total}</b> in <b>${quiz.title}</b>. Result: <b>${passed ? 'PASS' : 'FAIL'}</b>.</p>`);
  res.json({ attemptId: att._id });
}));

module.exports = router;
