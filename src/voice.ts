// One consistent Gemini voice, shared across random questions and counting tools.
const phrases: { [text: string]: string } = {
  '真棒！': 'correct',
  '再试试。': 'retry',
  '小花园长大啦！': 'celebrate',
  '看看空篮子，想一想，再回去填答案。': 'hint-empty',
  '把两篮草莓合在一起，再点一点，数一数。': 'hint-combine',
  '点一点，数一数。想好了，再回去填答案。': 'hint-count',
};
const number = (value: string) => `number-${Number(value)}`;
export function voiceClipsFor(text: string): string[] {
  if (phrases[text]) return [phrases[text]];
  if (/^(?:[0-9]|1[0-9]|20)$/.test(text)) return [number(text)];
  const question = text.match(/^(\d{1,2})(加|减)(\d{1,2})等于多少？$/);
  if (question && +question[1] <= 20 && +question[3] <= 20) {
    return [number(question[1]), question[2] === '加' ? 'plus' : 'minus', number(question[3]), 'question'];
  }
  const instruction = text.match(/^先拿走(\d{1,2})颗草莓。$/);
  if (instruction && +instruction[1] <= 20) return ['take-first', number(instruction[1]), 'strawberries'];
  const taken = text.match(/^拿走(\d{1,2})颗$/);
  if (taken && +taken[1] <= 20) return ['taken', number(taken[1]), 'pieces'];
  return [];
}
