const assert = require('assert');
const { loadApp } = require('./harness');
const KEY='shuatiben_v1';
const paper={id:'p1',title:'t',subject:'数学',createdAt:1,lastResult:null,questions:[
 {id:'q1',question:'1+1=?',options:['1','2','3','4'],answer:'B',analysis:'加法',type:'single',typeLabel:'单选题',subject:'数学'}
]};
const storage={}; storage[KEY]=JSON.stringify({papers:[paper],wrongBook:[],progress:{}});
const ctx=loadApp(storage);
ctx.__run(`startPaper('p1', false);`);
ctx.__run(`session.answers[0]={selected:'B'}; submitCurrentAnswer();`);
const html=ctx.document.querySelector('#view-practice').innerHTML;
const resultIdx=html.indexOf('result-panel');
const nextIdx=html.indexOf('id="nextQuestion"');
assert.ok(resultIdx>=0 && nextIdx>resultIdx, 'next button should appear after result/analysis panel');
console.log('PASS test-next-position');
