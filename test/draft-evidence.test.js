'use strict';
const assert = require('node:assert/strict');
const C = require('../src/checker.js');
const cases = [
 ['Expected: TalkBack says “Café 東京”.\nActual: TalkBack says “زر”.', 'TalkBack says “Café 東京”.', 'TalkBack says “زر”.'],
 ['Expected: Save. Actual: Button.', 'Save.', 'Button.'],
 ['### Expected behavior\nFirst line\nSecond line\n### Actual behavior\nObserved line', 'First line\nSecond line', 'Observed line'],
 ['**Expected:** Save\n**Actual:** Button', 'Save', 'Button'],
];
for (const [body, expected, actual] of cases) {
 const text = C.analyze({title:'Unicode evidence',body}).text;
 assert.ok(text.includes('### Expected behavior\n'+expected+'\n\n### Actual behavior\n'+actual+'\n'), text);
 assert.ok(text.includes(body.split('\n').map(l=>'> '+l).join('\n')));
}
const settings = C.analyze({title:'Settings',body:'TalkBack 15.0\nSpeech rate: 2x\nVerbosity: high'}).text.split('### Where')[0];
assert.ok(settings.includes('Speech rate: 2x') && settings.includes('Verbosity: high'), settings);
console.log('Draft evidence: 5 fixtures passed');
