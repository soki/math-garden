"""Generate public game voice clips; the API key is read only from the environment."""
import argparse
import array
import base64
import io
import json
import math
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request
import wave

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/audio/gemini'
MODEL = 'gemini-3.8-flash-tts'
VOICE = 'Sulafat'
STYLE = '温柔、明亮、自然的成年女性普通话声音，像耐心陪六岁孩子玩数学的小兔老师。清晰咬字，语速稍慢，音量柔和，不过度夸张。不添加任何文字或声音。短词和数字也保持同一温暖音色。'
EXTRA_STYLE = {
    'strawberries': '这是语音拼接的末尾片段，前面的数量已经单独录好。严格只发出“颗、草、莓”这三个字的声音，不要在开头加入任何数量词，片段不需要成为完整句子。',
    'celebrate': '清楚地读出“小花园”三个字，园字必须清晰完整，保持慢速。',
}
NUMBERS = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十']
TEXTS = {**{f'number-{n}': text for n, text in enumerate(NUMBERS)},
    'correct': '真棒！', 'retry': '再试试。', 'celebrate': '小花园长大啦！',
    'hint-empty': '看看空篮子，想一想，再回去填答案。',
    'hint-combine': '把两篮草莓合在一起，再点一点，数一数。',
    'hint-count': '点一点，数一数。想好了，再回去填答案。',
    'plus': '加', 'minus': '减', 'question': '等于多少？',
    'take-first': '先拿走', 'taken': '拿走', 'pieces': '颗', 'strawberries': '颗草莓',
}

def clean_wave(raw):
    with wave.open(io.BytesIO(raw), 'rb') as source:
        if source.getnchannels() != 1 or source.getsampwidth() != 2:
            raise ValueError('Expected mono 16-bit WAV from Gemini')
        rate = source.getframerate()
        samples = array.array('h', source.readframes(source.getnframes()))
    if sys.byteorder != 'little': samples.byteswap()
    step = max(1, rate // 100)
    audible = [i for i in range(0, len(samples), step)
        if math.sqrt(sum(v*v for v in samples[i:i+step]) / max(1, len(samples[i:i+step]))) > 120]
    if not audible: raise ValueError('Generated clip is silent')
    samples = samples[max(0, audible[0] - int(rate * .06)): min(len(samples), audible[-1] + step + int(rate * .09))]
    peak = max(abs(v) for v in samples)
    scale = min(2, 22000 / peak)
    samples = array.array('h', (int(v * scale) for v in samples))
    if sys.byteorder != 'little': samples.byteswap()
    output = io.BytesIO()
    with wave.open(output, 'wb') as target:
        target.setnchannels(1); target.setsampwidth(2); target.setframerate(rate); target.writeframes(samples.tobytes())
    return output.getvalue()

def generate(name, key):
    payload = {
        'model': MODEL,
        'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': TEXTS[name],
            'annotations': [{'type': 'speech_metadata', 'style': STYLE + EXTRA_STYLE.get(name, '')}]}]}],
        'response_format': {'type': 'audio', 'mime_type': 'audio/wav'},
        'generation_config': {'speech_config': [{'voice': VOICE}]},
    }
    request = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',
        data=json.dumps(payload, ensure_ascii=False).encode(),
        headers={'x-goog-api-key': key, 'Content-Type': 'application/json'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=120) as response: data = json.load(response)
            break
        except urllib.error.HTTPError as error:
            # Never log headers, credentials or raw request/response objects.
            if error.code in [429, 500, 502, 503, 504] and attempt < 2:
                print(f'{name}: HTTP {error.code}; retrying', flush=True); time.sleep(12 * (attempt + 1)); continue
            try: message = json.loads(error.read()).get('error', {}).get('message', '')
            except (ValueError, AttributeError): message = ''
            raise RuntimeError(f'Gemini HTTP {error.code}: {str(message).replace(key, "<REDACTED>")[:400]}') from None
        except (urllib.error.URLError, TimeoutError):
            if attempt >= 2: raise RuntimeError(f'{name}: network request failed after 3 attempts') from None
            print(f'{name}: temporary network failure; retrying', flush=True)
            time.sleep(12 * (attempt + 1))
    clips = [content for step in data.get('steps', []) if step.get('type') == 'model_output'
        for content in step.get('content', []) if content.get('type') == 'audio' and content.get('data')]
    if not clips: raise RuntimeError(f'{name}: response did not contain generated audio')
    raw = base64.b64decode(clips[-1]['data'])
    result = clean_wave(raw)
    destination = OUTPUT / f'{name}.wav'
    destination.write_bytes(result)
    print(f'{name}: {len(result)} bytes', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', choices=list(TEXTS))
    parser.add_argument('--replace', action='store_true', help='Regenerate the selected --only clip')
    args = parser.parse_args()
    if args.replace and not args.only: parser.error('--replace requires --only')
    key = os.environ.get('GEMINI_API_KEY')
    if not key: raise SystemExit('GEMINI_API_KEY is not available')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in [args.only] if args.only else TEXTS:
        if args.replace or not (OUTPUT / f'{name}.wav').exists(): generate(name, key)
    if not args.only:
        (OUTPUT / 'manifest.json').write_text(json.dumps({'model': MODEL, 'voice': VOICE, 'style': STYLE,
            'clips': {name: {'text': text, 'file': f'{name}.wav', **({'extra_style': EXTRA_STYLE[name]} if name in EXTRA_STYLE else {})} for name, text in TEXTS.items()}}, ensure_ascii=False, indent=2) + '\n')
