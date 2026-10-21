const router = require('express').Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const Question = require('../models/Question');
const { protect, allow } = require('../middleware/auth');
const ah = require('../utils/asyncHandler');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(protect, allow('teacher'));

// validates + normalises a question (used by single form and CSV import)
function clean(b) {
  const type = b.type;
  let options = [];
  let correct = String(b.correctAnswer || '').trim();
  if (!b.subject || !String(b.subject).trim()) throw new Error('Subject is required');
  if (!b.text || !String(b.text).trim()) throw new Error('Question text is required');
  if (type === 'mcq') {
    options = (b.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2) throw new Error('MCQ needs at least 2 options');
    if (!options.includes(correct)) throw new Error('Correct answer must match one of the options');
  } else if (type === 'truefalse') {
    options = ['True', 'False'];
    correct = /^t/i.test(correct) ? 'True' : 'False';
  } else if (type === 'fillblank') {
    if (!correct) throw new Error('Correct answer is required');
  } else throw new Error('Invalid question type');
  return {
    subject: String(b.subject).trim(),
    unit: String(b.unit || 'General').trim(),
    difficulty: ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium',
    type,
    text: String(b.text).trim(),
    options,
    correctAnswer: correct,
    marks: Number(b.marks) || 1,
  };
}

router.get('/', ah(async (req, res) => {
  const filter = { teacher: req.user._id };
  ['subject', 'unit', 'difficulty', 'type'].forEach((k) => { if (req.query[k]) filter[k] = req.query[k]; });
  res.json(await Question.find(filter).sort('-createdAt'));
}));

router.post('/', ah(async (req, res) => {
  try {
    const q = await Question.create({ ...clean(req.body), teacher: req.user._id });
    res.status(201).json(q);
  } catch (e) { res.status(400).json({ message: e.message }); }
}));

router.put('/:id', ah(async (req, res) => {
  try {
    const q = await Question.findOneAndUpdate({ _id: req.params.id, teacher: req.user._id }, clean(req.body), { new: true });
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json(q);
  } catch (e) { res.status(400).json({ message: e.message }); }
}));

router.delete('/:id', ah(async (req, res) => {
  await Question.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
  res.json({ ok: true });
}));

// Bulk CSV upload
// columns: subject,unit,difficulty,type,text,optionA,optionB,optionC,optionD,correctAnswer
router.post('/bulk', upload.single('file'), ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose a CSV file' });
  let rows;
  try {
    rows = parse(req.file.buffer, {
      columns: (h) => h.map((x) => x.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  } catch (e) { return res.status(400).json({ message: 'Invalid CSV: ' + e.message }); }

  const docs = [];
  const errors = [];
  rows.forEach((r, i) => {
    try {
      const raw = String(r.type || 'mcq').toLowerCase().replace(/[^a-z]/g, '');
      const type = ['tf', 'truefalse'].includes(raw) ? 'truefalse' : ['fill', 'fillblank', 'fillintheblank', 'fillintheblanks'].includes(raw) ? 'fillblank' : 'mcq';
      const options = [r.optiona, r.optionb, r.optionc, r.optiond].filter(Boolean);
      let ca = r.correctanswer || '';
      if (type === 'mcq' && /^[a-d]$/i.test(ca)) ca = options['abcd'.indexOf(ca.toLowerCase())] || '';
      docs.push({ ...clean({ ...r, type, options, correctAnswer: ca }), teacher: req.user._id });
    } catch (e) { errors.push(`Row ${i + 2}: ${e.message}`); }
  });
  if (docs.length) await Question.insertMany(docs);
  res.json({ imported: docs.length, failed: errors.length, errors: errors.slice(0, 20) });
}));

module.exports = router;
