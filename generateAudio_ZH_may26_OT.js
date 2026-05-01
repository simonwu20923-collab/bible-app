// generateAudio_ZH_may26_OT.js  (v3 — retry logic + model fallback)
// Run: node generateAudio_ZH_may26_OT.js

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const GEMINI_KEY   = 'AIzaSyBuhsZSPv9QAN7vjDeE59FeNvD9xxzQzQQ';
const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VC2J0-DqMbG87ANco-xAvA_7SslVPKc';
const TARGET_DATE  = '2026-05-26';
const OUTPUT_FILE  = path.join(__dirname, 'may26_OT_zh.wav');

// Run: node generateAudio_ZH_may26_OT.js --list-models  to see all available models
// Available TTS models confirmed from API:
const GEMINI_MODELS = [
  'gemini-2.5-flash-preview-tts',   // confirmed available
  'gemini-3.1-flash-tts-preview',   // newer model
  'gemini-2.5-pro-preview-tts',     // pro version
];
const VOICE_NAME   = 'Zephyr';

// Add --list-models flag to discover available TTS models
if (process.argv.includes('--list-models')) {
  const https = require('https');
  https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`, res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      const models = JSON.parse(d).models || [];
      console.log('All available models:');
      models.forEach(m => console.log(' ', m.name, '-', (m.description||'').slice(0,60)));
    });
  }).on('error', e => console.error(e.message));
  return; // don't proceed with audio generation
}
const MAX_RETRIES  = 3;
const RETRY_DELAY  = 2000;

const PREFIX_SPEECH_ZH = {
  '王上':'列王紀上','王下':'列王紀下',
  '太':'馬太福音','可':'馬可福音','路':'路加福音','約':'約翰福音',
  '徒':'使徒行傳','羅':'羅馬書',
  '林前':'哥林多前書','林後':'哥林多後書',
  '創':'創世記','出':'出埃及記','利':'利未記','民':'民數記','申':'申命記',
  '撒上':'撒母耳記上','撒下':'撒母耳記下',
  '代上':'歷代志上','代下':'歷代志下',
  '詩':'詩篇','箴':'箴言','傳':'傳道書',
  '賽':'以賽亞書','耶':'耶利米書','結':'以西結書','但':'但以理書',
  '來':'希伯來書','雅':'雅各書',
  '彼前':'彼得前書','彼後':'彼得後書',
  '約一':'約翰一書','啟':'啟示錄',
};
function prefixZh(p) { return PREFIX_SPEECH_ZH[p] || p; }
function verseSpeechZh(p, c, v) { return `${prefixZh(p)}第${c}章第${v}節`; }

function parseVerseLines(raw) {
  if (!raw) return [];
  return raw.split('\n').map(l=>l.trim()).filter(Boolean).reduce((acc, line) => {
    const m = line.match(/^(\S+)\s+(\d+)\s*:\s*(\d+)\s+(.+)$/);
    if (m && +m[2]>0 && +m[3]>0) acc.push({prefix:m[1],chap:+m[2],verse:+m[3],text:m[4].trim()});
    return acc;
  }, []);
}

function groupByChapter(verses) {
  const chapters=[]; let cur=null;
  for (const v of verses) {
    const key=`${v.prefix}-${v.chap}`;
    if (!cur||`${cur.prefix}-${cur.chap}`!==key){cur={prefix:v.prefix,chap:v.chap,startVerse:v.verse,verses:[]};chapters.push(cur);}
    cur.verses.push(v);
  }
  return chapters;
}

function buildIntroZh(title) {
  const clean=title.replace(/^(Old|New) Testament\s*-\s*/i,'').trim();
  const N={'1 King':'王上','2 King':'王下','1 Kings':'王上','2 Kings':'王下'};
  const cross=clean.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)\s*[~\-]\s*(.+?)\s+(\d+)\s*:\s*(\d+)$/);
  if(cross){const b1=N[cross[1].trim()]||cross[1].trim(),b2=N[cross[4].trim()]||cross[4].trim();
    return `${prefixZh(b1)}第${cross[2]}章第${cross[3]}節，至${prefixZh(b2)}第${cross[5]}章第${cross[6]}節。`;}
  return clean;
}

function buildSegments(chapters, title) {
  const segs=[{label:'intro',text:buildIntroZh(title)}];
  for(const ch of chapters){
    segs.push({label:`${ch.prefix}_ch${ch.chap}_hdr`,text:verseSpeechZh(ch.prefix,ch.chap,ch.startVerse)});
    segs.push({label:`${ch.prefix}_ch${ch.chap}_body`,text:ch.verses.map(v=>v.text).join('')});
  }
  return segs;
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function geminiTTS(text, modelIdx=0) {
  if(modelIdx>=GEMINI_MODELS.length) throw new Error('All Gemini models exhausted');
  const model=GEMINI_MODELS[modelIdx];
  for(let attempt=1;attempt<=MAX_RETRIES;attempt++){
    try { return await geminiTTSOnce(text,model); }
    catch(e){
      const msg=e.message||'';
      if(msg.includes('404')||msg.includes('not found')){
        console.log(`\n    ${model} not available, trying next model...`);
        return geminiTTS(text,modelIdx+1);
      }
      if((msg.includes('500')||msg.includes('503')||msg.includes('INTERNAL'))&&attempt<MAX_RETRIES){
        console.log(`\n    Attempt ${attempt} failed: ${msg.slice(0,80)}. Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY); continue;
      }
      throw e;
    }
  }
}

function geminiTTSOnce(text, model) {
  return new Promise((resolve,reject)=>{
    const body=JSON.stringify({
      system_instruction:{parts:[{text:'Read the provided text aloud exactly as written in Traditional Chinese. Do not generate any other content.'}]},
      contents:[{parts:[{text}]}],
      generationConfig:{
        responseModalities:['AUDIO'],
        speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:VOICE_NAME}}},
      },
    });
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const req=https.request(url,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
      let data=''; res.on('data',c=>data+=c);
      res.on('end',()=>{
        try{
          const json=JSON.parse(data);
          if(json.error) {reject(new Error(`${json.error.code}: ${json.error.message}`));return;}
          const parts=json?.candidates?.[0]?.content?.parts||[];
          const audio=parts.find(p=>p.inlineData?.mimeType?.startsWith('audio/'));
          if(!audio){reject(new Error('No audio part in response'));return;}
          resolve({bytes:Buffer.from(audio.inlineData.data,'base64'),mimeType:audio.inlineData.mimeType,model});
        }catch(e){reject(new Error(`Parse: ${e.message} — ${data.slice(0,200)}`));}
      });
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

function buildWavHeader(len,rate=24000,ch=1,bits=16){
  const h=Buffer.alloc(44);
  h.write('RIFF',0); h.writeUInt32LE(36+len,4); h.write('WAVE',8);
  h.write('fmt ',12); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20);
  h.writeUInt16LE(ch,22); h.writeUInt32LE(rate,24);
  h.writeUInt32LE(rate*ch*bits/8,28); h.writeUInt16LE(ch*bits/8,32);
  h.writeUInt16LE(bits,34); h.write('data',36); h.writeUInt32LE(len,40);
  return h;
}

function supabaseGet(p){
  return new Promise((resolve,reject)=>{
    https.get(`${SUPABASE_URL}/rest/v1/${p}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}},
    res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve(JSON.parse(d)));}).on('error',reject);
  });
}

async function main(){
  console.log(`Traditional Chinese OT audio for ${TARGET_DATE}\n`);
  const [row]=await supabaseGet(`verses?select=ot_title,ot_text_zh&date=eq.${TARGET_DATE}`);
  if(!row?.ot_text_zh){console.error('No text');process.exit(1);}

  console.log(`Title: "${row.ot_title}"`);
  const verses=parseVerseLines(row.ot_text_zh);
  const chapters=groupByChapter(verses);
  console.log(`Parsed ${verses.length} verses, ${chapters.length} chapters:`);
  chapters.forEach(ch=>console.log(`  ${ch.prefix} ch${ch.chap}: ${ch.verses.length} verses`));

  const segs=buildSegments(chapters,row.ot_title);
  console.log(`\n${segs.length} segments. Calling Gemini TTS...\n`);

  const pcmChunks=[]; let finalMime=null, usedModel=null;
  for(const seg of segs){
    process.stdout.write(`  [${seg.label}]... `);
    const r=await geminiTTS(seg.text);
    pcmChunks.push(r.bytes); finalMime=r.mimeType; usedModel=r.model;
    console.log(`${(r.bytes.length/1024).toFixed(1)}KB — ${r.model} (${r.mimeType})`);
  }

  const all=Buffer.concat(pcmChunks);
  let outFile=OUTPUT_FILE;
  if(finalMime?.includes('mp3')){
    outFile=OUTPUT_FILE.replace('.wav','.mp3');
    fs.writeFileSync(outFile,all);
  } else {
    const rate=(finalMime||'').match(/rate=(\d+)/);
    const wav=Buffer.concat([buildWavHeader(all.length,rate?+rate[1]:24000),all]);
    fs.writeFileSync(outFile,wav);
  }
  console.log(`\n✅ ${outFile} (${(all.length/1024).toFixed(1)}KB via ${usedModel})`);
}

main().catch(e=>{console.error(e.message);process.exit(1);});