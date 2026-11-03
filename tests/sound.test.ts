import test from 'node:test';
import assert from 'node:assert/strict';
import { speak, stopSpeech } from '../src/sound.ts';

test('new counting, mute and navigation cancel pending narration; a question schedules in order', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const events: string[] = [];
  const requests = new Map<string, (response: unknown) => void>();
  const nodes: { start: number; stopped: boolean }[] = [];
  class FakeAudio {
    state = 'suspended'; currentTime = 10; destination = {};
    resume() { events.push('resume'); this.state = 'running'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({duration:.4}); }
    createBufferSource() {
      const node = {start:0, stopped:false};
      return {buffer:null, onended:null, connect(){},disconnect(){},
        start(at:number){node.start=at;nodes.push(node);},stop(){node.stopped=true;}};
    }
  }
  Object.assign(globalThis, {window:{AudioContext:FakeAudio},fetch:(url:string)=>{
    events.push(`fetch:${url}`);
    return new Promise(resolve=>requests.set(url,resolve));
  }});
  const flush = () => new Promise(resolve=>setImmediate(resolve));
  const finish = (clip:string) => requests.get(`./audio/gemini/${clip}.wav`)!({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(4))});
  try {
    speak('1'); speak('2');
    assert.equal(events[0], 'resume');
    finish('number-1'); await flush(); assert.equal(nodes.length,0);
    finish('number-2'); await flush(); assert.equal(nodes.length,1);
    stopSpeech(); assert.ok(nodes[0].stopped);
    speak('3'); stopSpeech(); finish('number-3'); await flush(); assert.equal(nodes.length,1);
    speak('4加5等于多少？');
    for(const clip of ['number-4','plus','number-5','question']) finish(clip);
    await flush(); assert.equal(nodes.length,5);
    assert.ok(nodes.slice(1).every((n,i,all)=>i===0||n.start>all[i-1].start));
    stopSpeech(); assert.ok(nodes.every(n=>n.stopped));
    speak('6'); requests.get('./audio/gemini/number-6.wav')!({ok:false}); await flush();
    const before=events.length; speak('6'); assert.equal(events.length,before+1);
    finish('number-6'); await flush();
  } finally {
    stopSpeech(); Object.assign(globalThis,{window:previousWindow,fetch:previousFetch});
  }
});
