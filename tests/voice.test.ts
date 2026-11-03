import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { voiceClipsFor } from '../src/voice.ts';
import { pool } from '../src/questions.ts';

const directory = new URL('../public/audio/gemini/', import.meta.url);

test('every legal question and counting instruction resolves to reusable Gemini clips', () => {
  for (const q of pool('challenge')) {
    const clips = voiceClipsFor(`${q.a}${q.op === '+' ? '加' : '减'}${q.b}等于多少？`);
    assert.deepEqual(clips, [`number-${q.a}`, q.op === '+' ? 'plus' : 'minus', `number-${q.b}`, 'question']);
    assert.equal(clips.length, 4); // Reads a question, never its result.
  }
  for (let n = 0; n <= 20; n++) {
    assert.deepEqual(voiceClipsFor(String(n)), [`number-${n}`]);
    assert.deepEqual(voiceClipsFor(`先拿走${n}颗草莓。`), ['take-first', `number-${n}`, 'strawberries']);
    assert.deepEqual(voiceClipsFor(`拿走${n}颗`), ['taken', `number-${n}`, 'pieces']);
  }
  assert.deepEqual(voiceClipsFor('21'), []);
  assert.deepEqual(voiceClipsFor('99加99等于多少？'), []);
});
test('all fixed game narration resolves to recorded clips', () => {
  for (const text of ['真棒！','再试试。','小花园长大啦！','看看空篮子，想一想，再回去填答案。','把两篮草莓合在一起，再点一点，数一数。','点一点，数一数。想好了，再回去填答案。']) {
    assert.equal(voiceClipsFor(text).length, 1, text);
  }
});
test('published Gemini catalog contains all required audible WAVs and no extra recordings', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory), 'utf8'));
  assert.equal(manifest.model, 'gemini-3.8-flash-tts');
  assert.equal(Object.keys(manifest.clips).length, 34);
  assert.equal(readdirSync(directory).filter(n => n.endsWith('.wav')).length, 34);
  const needed = new Set(['plus','minus','question','take-first','taken','pieces','strawberries','correct','retry','celebrate','hint-empty','hint-combine','hint-count']);
  for(let n=0;n<=20;n++) needed.add(`number-${n}`);
  for (const name of needed) {
    const item = manifest.clips[name]; assert.ok(item, name);
    const wav = readFileSync(new URL(item.file, directory));
    assert.equal(wav.toString('ascii',0,4), 'RIFF', name);
    assert.equal(wav.toString('ascii',8,12), 'WAVE', name);
    assert.equal(wav.readUInt16LE(22), 1, name);
    assert.equal(wav.readUInt16LE(34), 16, name);
    const seconds = (wav.length - 44) / wav.readUInt32LE(28);
    assert.ok(seconds > .1 && seconds < 15, `${name}: ${seconds}s`);
    let peak = 0;
    for(let i=44;i+1<wav.length;i+=2) peak = Math.max(peak,Math.abs(wav.readInt16LE(i)));
    assert.ok(peak > 1000, `${name} is silent`);
    assert.equal(voiceClipsFor(item.text).length > 0 || ['加','减','等于多少？','先拿走','拿走','颗','颗草莓'].includes(item.text) || name.startsWith('number-'), true, name);
  }
});
