import { jsPDF } from 'jspdf';

// Page 1: scorecard. Page 2: completion certificate (only if the student passed)
export function downloadReport(r) {
  const d = new jsPDF();
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;

  d.setFontSize(22);
  d.text('QuizSphere Scorecard', 105, 28, { align: 'center' });
  d.setLineWidth(0.6);
  d.line(25, 36, 185, 36);
  d.setFontSize(12);
  const rows = [
    ['Student', r.student.name],
    ['Email', r.student.email],
    ['Quiz', r.quiz.title],
    ['Subject', r.quiz.subject],
    ['Score', `${r.score} / ${r.total} (${pct}%)`],
    ['Passing marks', String(r.quiz.passingMarks)],
    ['Result', r.passed ? 'PASS' : 'FAIL'],
    ['Tab switches logged', String(r.tabSwitches)],
    ['Submitted on', new Date(r.submittedAt).toLocaleString()],
  ];
  rows.forEach(([k, v], i) => {
    d.setFont(undefined, 'bold');
    d.text(k + ':', 25, 55 + i * 11);
    d.setFont(undefined, 'normal');
    d.text(String(v), 80, 55 + i * 11);
  });

  if (r.passed) {
    d.addPage('a4', 'landscape');
    d.setLineWidth(1.5);
    d.rect(10, 10, 277, 190);
    d.setLineWidth(0.4);
    d.rect(14, 14, 269, 182);
    d.setFontSize(32);
    d.setFont(undefined, 'bold');
    d.text('Certificate of Completion', 148.5, 55, { align: 'center' });
    d.setFont(undefined, 'normal');
    d.setFontSize(14);
    d.text('This is to certify that', 148.5, 80, { align: 'center' });
    d.setFontSize(28);
    d.setFont(undefined, 'bold');
    d.text(r.student.name, 148.5, 100, { align: 'center' });
    d.setFont(undefined, 'normal');
    d.setFontSize(14);
    d.text('has successfully passed the quiz', 148.5, 120, { align: 'center' });
    d.setFontSize(20);
    d.text(`${r.quiz.title} (${r.quiz.subject})`, 148.5, 136, { align: 'center' });
    d.setFontSize(14);
    d.text(`with a score of ${r.score} / ${r.total} (${pct}%)`, 148.5, 152, { align: 'center' });
    d.setFontSize(11);
    d.text(`Date: ${new Date(r.submittedAt).toLocaleDateString()}`, 148.5, 180, { align: 'center' });
  }
  d.save(`QuizSphere_${r.quiz.title.replace(/\s+/g, '_')}_scorecard.pdf`);
}
