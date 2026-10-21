const router = require('express').Router();
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const { protect, allow } = require('../middleware/auth');
const ah = require('../utils/asyncHandler');
const { shuffle, shape, remainingMs } = require('../utils/attemptHelper');
const { send } = require('../utils/mailer');

const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const own = (req) => Quiz.findOne({ _id: req.params.id, teacher: req.user._id });
const notFound = (res) => res.status(404).json({ message: 'Quiz not found' });

router.use(protect);

/* ---------- STUDENT ---------- */
router.get('/', allow('student'), ah(async (req, res) => {
  const quizzes = await Quiz.find({ isPublished: true }).select('-accessCode -questions').sort('-createdAt').lean();
  const atts = await Attempt.find({ student: req.user._id }).select('quiz status').lean();
  const m = Object.fromEntries(atts.map((a) => [String(a.quiz), a]));
  res.json(quizzes.map((q) => ({ ...q, attempt: m[String(q._id)] ? { _id: m[String(q._id)]._id, status: m[String(q._id)].status } : null })));
}));

/* ---------- TEACHER ---------- */
router.get('/mine', allow('teacher'), ah(async (req, res) => {
  res.json(await Quiz.find({ teacher: req.user._id }).sort('-createdAt').lean());
}));

router.post('/', allow('teacher'), ah(async (req, res) => {
  const { title, subject, duration, passingMarks, accessCode, questions, shuffle: sh } = req.body;
  if (!title || !subject || !duration || !Array.isArray(questions) || !questions.length)
    return res.status(400).json({ message: 'Title, subject, duration and at least one question are required' });
  const qs = await Question.find({ _id: { $in: questions }, teacher: req.user._id });
  if (!qs.length) return res.status(400).json({ message: 'Selected questions not found' });
  const total = qs.reduce((s, q) => s + q.marks, 0);
  const quiz = await Quiz.create({
    teacher: req.user._id,
    title,
    subject,
    duration: Number(duration),
    passingMarks: passingMarks === '' || passingMarks == null ? Math.ceil(total * 0.4) : Number(passingMarks),
    accessCode: String(accessCode || genCode()).trim().toUpperCase(),
    questions: qs.map((q) => q._id),
    questionCount: qs.length,
    totalMarks: total,
    shuffle: sh !== false,
  });
  res.status(201).json(quiz);
}));

router.get('/:id/manage', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  res.json(q);
}));

router.put('/:id/publish', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  q.isPublished = true;
  await q.save();
  // email notification to all students (skipped automatically if SMTP is not configured)
  const students = await User.find({ role: 'student' }).select('email name');
  const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/quiz/${q._id}`;
  Promise.all(students.map((s) => send(s.email, `New quiz: ${q.title}`,
    `<p>Hi ${s.name},</p><p>A new quiz <b>${q.title}</b> (${q.subject}) is now available. Duration: ${q.duration} minutes.</p><p><a href="${link}">Open quiz</a>. Ask your teacher for the access code.</p>`)));
  res.json(q);
}));

// Exam freeze control
router.put('/:id/pause', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  if (!q.isPaused) { q.isPaused = true; q.pausedAt = new Date(); await q.save(); }
  res.json(q);
}));
router.put('/:id/resume', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  if (q.isPaused) {
    q.extraMs += Date.now() - new Date(q.pausedAt).getTime(); // frozen time is given back to students
    q.isPaused = false;
    q.pausedAt = null;
    await q.save();
  }
  res.json(q);
}));
router.put('/:id/extend', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  const m = Number(req.body.minutes);
  if (!(m > 0)) return res.status(400).json({ message: 'Enter minutes greater than 0' });
  q.extraMs += m * 60000;
  await q.save();
  res.json(q);
}));

router.delete('/:id', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  await Attempt.deleteMany({ quiz: q._id });
  await q.deleteOne();
  res.json({ ok: true });
}));

// live sessions
router.get('/:id/live', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  const atts = await Attempt.find({ quiz: q._id, status: 'in_progress' }).populate('student', 'name email').lean();
  res.json(atts.map((a) => ({
    _id: a._id,
    student: a.student,
    tabSwitches: a.tabSwitches,
    answered: a.answers.filter((x) => x.answer).length,
    total: q.questionCount,
    remainingMs: remainingMs(q, a),
  })));
}));

// analytics
router.get('/:id/analytics', allow('teacher'), ah(async (req, res) => {
  const q = await own(req);
  if (!q) return notFound(res);
  const atts = await Attempt.find({ quiz: q._id, status: 'submitted' }).populate('student', 'name email').sort('-score').lean();
  const n = atts.length;
  const scores = atts.map((a) => a.score);
  const passed = atts.filter((a) => a.passed).length;
  const buckets = [0, 0, 0, 0, 0];
  atts.forEach((a) => {
    const p = a.total ? (a.score / a.total) * 100 : 0;
    buckets[Math.min(4, Math.floor(p / 20))]++;
  });
  res.json({
    quiz: { title: q.title, totalMarks: q.totalMarks, passingMarks: q.passingMarks },
    stats: {
      count: n,
      average: n ? +(scores.reduce((a, b) => a + b, 0) / n).toFixed(2) : 0,
      highest: n ? Math.max(...scores) : 0,
      lowest: n ? Math.min(...scores) : 0,
      passed,
      failed: n - passed,
    },
    distribution: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'].map((range, i) => ({ range, count: buckets[i] })),
    results: atts.map((a) => ({ _id: a._id, student: a.student, score: a.score, total: a.total, passed: a.passed, tabSwitches: a.tabSwitches, submittedAt: a.submittedAt })),
  });
}));

/* ---------- COMMON ---------- */
// quiz info (also used by the shareable link /quiz/:id)
router.get('/:id', ah(async (req, res) => {
  const q = await Quiz.findById(req.params.id).select('-accessCode -questions').lean();
  if (!q || (!q.isPublished && String(q.teacher) !== String(req.user._id))) return notFound(res);
  const attempt = await Attempt.findOne({ quiz: q._id, student: req.user._id }).select('status').lean();
  res.json({ ...q, attempt });
}));

// student starts (or resumes) an exam
router.post('/:id/start', allow('student'), ah(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz || !quiz.isPublished) return notFound(res);
  let att = await Attempt.findOne({ quiz: quiz._id, student: req.user._id });
  if (att && att.status === 'submitted') return res.json({ submitted: true, attemptId: att._id });
  if (!att) {
    if (String(req.body.accessCode || '').trim().toUpperCase() !== quiz.accessCode.toUpperCase())
      return res.status(403).json({ message: 'Wrong access code' });
    const qs = await Question.find({ _id: { $in: quiz.questions } });
    const ordered = quiz.shuffle ? shuffle(qs) : qs;
    att = await Attempt.create({
      quiz: quiz._id,
      student: req.user._id,
      startedAt: new Date(),
      items: ordered.map((q) => ({
        question: q._id,
        options: q.type === 'mcq' && quiz.shuffle ? shuffle(q.options) : q.options,
      })),
      answers: [],
    });
  }
  res.json(await shape(att, quiz));
}));

module.exports = router;
