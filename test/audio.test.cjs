const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup({unavailable=false,reject=false,preference=null}={}){
 const calls={create:0,resume:0,oscillator:0,gain:0,start:0,connections:0},events={},nodes={};let clock=0,instance;
 for(const id of ['audio-status','audio-toggle','audio-volume'])nodes[id]={textContent:'',value:'',setAttribute(){},addEventListener(k,fn){this[k]=fn;}};
 class Audio{constructor(){calls.create++;instance=this;this.state='suspended';this.currentTime=0;this.destination={};}async resume(){calls.resume++;if(reject)throw Error();this.state='running';}createOscillator(){calls.oscillator++;return{frequency:{},connect(){calls.connections++;},start(){calls.start++;},stop(){},disconnect(){}};}createGain(){calls.gain++;return{gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){calls.connections++;},disconnect(){}};}}
 const context={window:{AudioContext:unavailable?undefined:Audio},localStorage:{getItem:()=>preference,setItem(){}},document:{readyState:'complete',getElementById:id=>nodes[id],addEventListener:(k,fn)=>events[k]=fn},performance:{now:()=>clock}};
 vm.runInNewContext(fs.readFileSync('src/audio.js','utf8'),context);
 return{api:context.window.CueAudio,calls,nodes,events,instance:()=>instance,tick:()=>clock+=1100};
}
test('no creation/autoplay on load, then explicit resume and actual oscillator gain graph',async()=>{
 const s=setup({preference:JSON.stringify({muted:false,volume:.5})});assert.equal(s.calls.create,0);assert.equal(s.api.cue('demo'),false);
 await s.api.toggle();assert.equal(s.calls.create,1);assert.equal(s.calls.resume,1);assert.equal(s.api.cue('demo'),true);assert.equal(s.calls.oscillator,1);assert.equal(s.calls.gain,1);assert.equal(s.calls.start,1);assert.equal(s.calls.connections,2);
 assert.equal(s.api.cue('demo'),false);s.tick();assert.equal(s.api.cue('demo'),true);assert.equal(s.api.cue('typing'),false);assert.equal(s.api.cue('progress'),false);
 await s.api.toggle();assert.equal(s.api.cue('repair'),false);await s.api.toggle();assert.equal(s.api.cue('repair'),true);
 s.nodes['audio-volume'].input({target:{value:0}});assert.equal(s.api.cue('ablation'),false);
 s.nodes['audio-volume'].input({target:{value:.5}});s.instance().state='suspended';assert.equal(s.api.cue('ablation'),false);assert.equal(s.calls.resume,1);
 await s.api.toggle();await s.api.toggle();assert.equal(s.calls.resume,2);assert.equal(s.api.cue('ablation'),true);assert.equal(s.api.cue('evaluation'),true);assert.equal(s.api.cue('validation-error'),true);
});
test('unsupported and rejected audio stay silent with visible fallback',async()=>{for(const options of [{unavailable:true},{reject:true}]){const s=setup(options);await s.api.toggle();assert.equal(s.api.cue('demo'),false);assert.match(s.nodes['audio-status'].textContent,/unavailable/);assert.equal(s.calls.start,0);}});
test('shortcut excludes editable controls, composing keys and Ctrl/Cmd/VoiceOver collisions',async()=>{
 const s=setup(),base={altKey:true,shiftKey:true,code:'KeyM',preventDefault(){},target:{closest:()=>false}};
 for(const variation of [{ctrlKey:true},{metaKey:true},{isComposing:true},{repeat:true},{target:{closest:()=>true}}])s.events.keydown({...base,...variation});
 assert.equal(s.calls.create,0);s.events.keydown(base);await Promise.resolve();assert.equal(s.calls.create,1);
});
