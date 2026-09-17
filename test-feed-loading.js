const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('learn/index.html','utf8');
for(const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!m[1].includes('src=')&&!m[1].includes('application/ld+json'))new vm.Script(m[2]);
const code=source.slice(source.indexOf('    async function sfMaybeShowFeed(scopeFolder) {'),source.indexOf('    // Per-subject feed'));
let release;let appended=false;let status={textContent:''};const track={innerHTML:'',isConnected:true,querySelector(){return {...status,addEventListener(){}}}};
const ctx={console:{error(){}},fetchScheduleData:async()=>[],sfComputeFolderRecommendation:async()=>({node:{label:'Observation'}}),sfLoadSidePracticePanel(){},sfBuildSlidesForRecommendation:()=>new Promise(r=>release=r),sfAppendBuiltSlides(){appended=true},sfRefreshImmediateRecalls(){}};
ctx.sfMountFeedShell=()=>{ctx.sfFeed={};return{trackEl:track,viewportEl:{focus(){}}}};vm.createContext(ctx);vm.runInContext(code,ctx);
(async()=>{const loading=ctx.sfMaybeShowFeed({subject:'Biology'});assert.match(track.innerHTML,/Loading your next lesson/);await new Promise(setImmediate);release([{lesson:true}]);assert.equal(await loading,true);assert.equal(appended,true);ctx.sfComputeFolderRecommendation=async()=>{throw Error('network')};await ctx.sfMaybeShowFeed({subject:'Biology'});assert.match(track.innerHTML,/Try again/);console.log('PASS: script syntax; visible feed loading, lesson arrival, retry on failure');})().catch(e=>{console.error(e);process.exitCode=1});
