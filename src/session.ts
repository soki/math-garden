import { isSettings, type Question, type Settings } from './questions.ts';
export interface Record { question: Question; attempts: number; firstAnswer: number | null; helped: boolean; status: 'answering' | 'retry' | 'correct' | 'revealed'; options: number[] }
export interface Session { settings: Settings; records: Record[]; index: number; completed: boolean; notice: string }
export function createSession(settings: Settings, questions: Question[], notice = ''): Session {
  return { settings: { ...settings }, records: questions.map(question => ({ question, attempts: 0, firstAnswer: null, helped: false, status: 'answering', options: [] })), index: 0, completed: false, notice };
}
// Wait for a second digit when the child has entered a prefix of the answer.
// There is no timeout: slower typing must not count as a wrong attempt.
export function assessEntry(entry: string, answer: number): 'incomplete' | 'correct' | 'wrong' {
  if (!entry) return 'incomplete';
  if (entry === String(answer)) return 'correct';
  return String(answer).startsWith(entry) ? 'incomplete' : 'wrong';
}
export function submit(session: Session, answer: number): boolean {
  const record = session.records[session.index];
  if (session.completed || !Number.isInteger(answer) || answer < 0 || record.status === 'correct' || record.status === 'revealed') return false;
  if (record.attempts === 0) record.firstAnswer = answer;
  record.attempts++;
  record.status = answer === record.question.answer ? 'correct' : record.attempts >= 2 ? 'revealed' : 'retry';
  return true;
}
export function next(session: Session): void {
  if (!['correct', 'revealed'].includes(session.records[session.index].status)) return;
  if (session.index === session.records.length - 1) session.completed = true;
  else session.index++;
}
export function summary(session: Session) {
  return {
    firstCorrect: session.records.filter(r => r.firstAnswer === r.question.answer).length,
    retried: session.records.filter(r => r.attempts > 1).length,
    helped: session.records.filter(r => r.helped).length,
    review: session.records.filter(r => r.firstAnswer !== r.question.answer || r.helped),
  };
}
export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Session;
  return isSettings(s.settings) && Array.isArray(s.records) && s.records.length > 0 && s.records.length <= 20
    && Number.isInteger(s.index) && s.index >= 0 && s.index < s.records.length && typeof s.completed === 'boolean'
    && typeof s.notice === 'string' && s.records.every(r => {
      const q = r?.question;
      return q && Number.isInteger(q.a) && Number.isInteger(q.b) && q.a >= 0 && q.a <= 20 && q.b >= 0 && q.b <= 20
        && ['+', '−'].includes(q.op) && q.answer === (q.op === '+' ? q.a + q.b : q.a - q.b) && q.answer >= 0 && q.answer <= 20
        && Number.isInteger(r.attempts) && r.attempts >= 0 && r.attempts <= 2
        && (r.firstAnswer === null || (Number.isInteger(r.firstAnswer) && r.firstAnswer >= 0 && r.firstAnswer <= 99))
        && typeof r.helped === 'boolean' && ['answering', 'retry', 'correct', 'revealed'].includes(r.status)
        && Array.isArray(r.options) && (r.options.length === 0 || (r.options.length === 3 && new Set(r.options).size === 3 && r.options.includes(q.answer) && r.options.every(n => Number.isInteger(n) && n >= 0 && n <= 20)));
    });
}
