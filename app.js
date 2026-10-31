/* CEFR Multilevel Speaking — mock engine, recording, transcription, AI grading
   Static site: no server. The API key lives only in this browser. */

const $ = id => document.getElementById(id);
const pick = a => a[Math.floor(Math.random()*a.length)];
const pickN = (a,n)=>{const c=a.slice(),o=[];while(o.length<n&&c.length)o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);return o};
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:v }catch(e){ return d } },
  set(k,v){ try{ localStorage.setItem(k,v) }catch(e){} },
  getJSON(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch(e){ return d } },
  setJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} }
};

/* ============================ settings ============================ */
const cfg = {
  provider: LS.get("ml.provider","openai"),
  key:      LS.get("ml.key",""),
  model:    LS.get("ml.model",""),
  voice:    LS.get("ml.voice",""),
  rate:     LS.get("ml.rate","0.95"),
  theme:    LS.get("ml.theme","auto")
};
const DEFAULT_MODEL = { openai:"gpt-4o-mini", anthropic:"claude-sonnet-5-5" };
const modelName = () => cfg.model.trim() || DEFAULT_MODEL[cfg.provider];
const hasAI = () => !!cfg.key.trim();

function applyTheme(){
  if(cfg.theme==="auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", cfg.theme);
}
applyTheme();
$("btnTheme").onclick = ()=>{
  cfg.theme = cfg.theme==="auto" ? "light" : cfg.theme==="light" ? "dark" : "auto";
  LS.set("ml.theme",cfg.theme); applyTheme();
};

function openSettings(){
  $("provider").value = cfg.provider;
  $("apikey").value = cfg.key;
  $("model").value = cfg.model;
  $("model").placeholder = DEFAULT_MODEL[cfg.provider];
  $("rate").value = cfg.rate;
  fillVoices();
  $("settings").hidden = false;
}
$("btnSettings").onclick = openSettings;
$("btnCloseSettings").onclick = ()=> $("settings").hidden = true;
$("provider").onchange = ()=>{ $("model").placeholder = DEFAULT_MODEL[$("provider").value]; fillVoices($("provider").value); };
$("btnSaveSettings").onclick = ()=>{
  cfg.provider = $("provider").value;
  cfg.key = $("apikey").value.trim();
  cfg.model = $("model").value.trim();
  cfg.voice = $("voicepick").value;
  cfg.rate = $("rate").value;
  LS.set("ml.provider",cfg.provider); LS.set("ml.key",cfg.key); LS.set("ml.model",cfg.model);
  LS.set("ml.voice",cfg.voice); LS.set("ml.rate",cfg.rate);
  $("settings").hidden = true;
  updateNotes();
};

/* ============================ voices ============================ */
const AI_VOICES = [["nova","Nova — ayol, tiniq"],["alloy","Alloy — neytral"],["sage","Sage — xotirjam"],["onyx","Onyx — erkak, past"],["shimmer","Shimmer — yumshoq"]];
let osVoices = [];
function loadOsVoices(){ try{ osVoices = window.speechSynthesis ? speechSynthesis.getVoices() : [] }catch(e){ osVoices=[] } }
if(window.speechSynthesis){ loadOsVoices(); speechSynthesis.onvoiceschanged = ()=>{ loadOsVoices(); if(!$("settings").hidden) fillVoices(); }; }

function voiceScore(v){
  const n = (v.name||"") + " " + (v.voiceURI||"");
  let s = 0;
  if(/natural/i.test(n)) s += 120;
  if(/online/i.test(n)) s += 40;
  if(/google/i.test(n)) s += 70;
  if(/premium|enhanced/i.test(n)) s += 60;
  if(/siri/i.test(n)) s += 50;
  if(/aria|libby|sonia|ryan|jenny|emma|guy/i.test(n)) s += 30;
  if(/^en-GB/i.test(v.lang)) s += 25;
  if(/^en-US/i.test(v.lang)) s += 15;
  if(/compact|eloquence|espeak/i.test(n)) s -= 60;
  return s;
}
function fillVoices(provider){
  const p = provider || cfg.provider;
  const sel = $("voicepick"); sel.innerHTML = "";
  if(p==="openai"){
    const g = document.createElement("optgroup"); g.label = "Tabiiy AI ovoz (kalit kerak)";
    AI_VOICES.forEach(([v,label])=>{ const o=document.createElement("option"); o.value="ai:"+v; o.textContent=label; g.appendChild(o); });
    sel.appendChild(g);
  }
  const g2 = document.createElement("optgroup"); g2.label = "Qurilma ovozlari";
  const list = osVoices.filter(v=>/^en/i.test(v.lang)).sort((a,b)=>voiceScore(b)-voiceScore(a));
  (list.length?list:osVoices).forEach(v=>{
    const o=document.createElement("option"); o.value="os:"+(v.voiceURI||v.name);
    o.textContent = v.name + " (" + v.lang + ")" + (voiceScore(v)>=70?" ★":"");
    g2.appendChild(o);
  });
  sel.appendChild(g2);
  if(cfg.voice) sel.value = cfg.voice;
  if(!sel.value) sel.selectedIndex = 0;
  $("voiceNote").textContent = p==="openai"
    ? "AI ovoz eng tabiiy eshitiladi, lekin har savol uchun juda kichik to‘lov oladi. Kalit bo‘lmasa qurilma ovozi ishlatiladi."
    : "Chrome’dagi “Google UK English” yoki Edge’dagi “Natural” ovozlar eng tabiiy eshitiladi.";
}

let ttsCache = new Map();
async function aiSpeak(text){
  const voice = (cfg.voice||"ai:nova").split(":")[1] || "nova";
  const ck = voice+"|"+cfg.rate+"|"+text;
  if(ttsCache.has(ck)) return ttsCache.get(ck);
  let res = await fetch("https://api.openai.com/v1/audio/speech",{
    method:"POST",
    headers:{ "Authorization":"Bearer "+cfg.key, "Content-Type":"application/json" },
    body: JSON.stringify({ model:"gpt-4o-mini-tts", voice, input:text, speed: parseFloat(cfg.rate) })
  });
  if(!res.ok){
    res = await fetch("https://api.openai.com/v1/audio/speech",{
      method:"POST",
      headers:{ "Authorization":"Bearer "+cfg.key, "Content-Type":"application/json" },
      body: JSON.stringify({ model:"tts-1", voice, input:text, speed: parseFloat(cfg.rate) })
    });
  }
  if(!res.ok) throw new Error("tts");
  const url = URL.createObjectURL(await res.blob());
  ttsCache.set(ck,url);
  return url;
}

let currentAudio = null;
function stopSpeech(){
  try{ speechSynthesis.cancel() }catch(e){}
  if(currentAudio){ try{ currentAudio.pause() }catch(e){} currentAudio = null; }
}
function say(text, done){
  if(!text || !$("optVoice").checked){ setTimeout(done,250); return; }
  const token = runToken;
  const fin = ()=>{ if(token===runToken) done(); };
  const useAI = cfg.provider==="openai" && hasAI() && (cfg.voice||"").startsWith("ai:");
  if(useAI){
    aiSpeak(text).then(url=>{
      if(token!==runToken) return;
      const a = new Audio(url); currentAudio = a;
      a.onended = fin; a.onerror = ()=> osSpeak(text, fin, token);
      a.play().catch(()=> osSpeak(text, fin, token));
    }).catch(()=> osSpeak(text, fin, token));
  } else osSpeak(text, fin, token);
}
function osSpeak(text, fin, token){
  if(!window.speechSynthesis){ fin(); return; }
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB"; u.rate = parseFloat(cfg.rate); u.pitch = 1;
    const want = (cfg.voice||"").startsWith("os:") ? cfg.voice.slice(3) : null;
    const v = osVoices.find(x=>(x.voiceURI||x.name)===want)
           || osVoices.filter(x=>/^en/i.test(x.lang)).sort((a,b)=>voiceScore(b)-voiceScore(a))[0];
    if(v) u.voice = v;
    let done = false;
    const end = ()=>{ if(done) return; done=true; if(token===runToken) fin(); };
    u.onend = end; u.onerror = end;
    speechSynthesis.speak(u);
    setTimeout(end, Math.max(2500, text.split(/\s+/).length*520/u.rate + 2500));
  }catch(e){ fin(); }
}
$("btnTestVoice").onclick = ()=>{
  const prev = {...cfg};
  cfg.voice = $("voicepick").value; cfg.rate = $("rate").value;
  cfg.provider = $("provider").value; cfg.key = $("apikey").value.trim();
  const t = "Part two. In this part, I'm going to show you a picture and ask you three questions. You have one minute to prepare.";
  say(t, ()=>{ Object.assign(cfg, {voice:$("voicepick").value, rate:$("rate").value, provider:$("provider").value, key:$("apikey").value.trim()}); });
};

/* ============================ chime ============================ */
let actx = null;
function audioCtx(){ actx = actx || new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==="suspended") actx.resume(); return actx; }
function chime(){
  try{
    const c = audioCtx();
    [880,1245].forEach((f,i)=>{
      const o=c.createOscillator(), g=c.createGain(); o.type="sine"; o.frequency.value=f;
      const t=c.currentTime+i*0.18;
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(0.25,t+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+0.45);
    });
  }catch(e){}
}

/* ============================ photos (Wikimedia Commons) ============================ */
const imgCache = new Map();
async function commons(term){
  if(imgCache.has(term)) return imgCache.get(term);
  const cached = LS.getJSON("ml.img."+term, null);
  if(cached && cached.length){ imgCache.set(term,cached); return cached; }
  const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search"
    + "&gsrsearch=" + encodeURIComponent("filetype:bitmap " + term)
    + "&gsrnamespace=6&gsrlimit=14&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=900&format=json&origin=*";
  try{
    const r = await fetch(url);
    const j = await r.json();
    const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
    const out = pages
      .filter(p=>p.imageinfo && /jpeg|png/.test(p.imageinfo[0].mime||""))
      .map(p=>({
        url: p.imageinfo[0].thumburl || p.imageinfo[0].url,
        page: p.imageinfo[0].descriptionurl,
        author: ((p.imageinfo[0].extmetadata||{}).Artist||{}).value ? String(((p.imageinfo[0].extmetadata||{}).Artist||{}).value).replace(/<[^>]*>/g,"").slice(0,60) : "",
        lic: ((p.imageinfo[0].extmetadata||{}).LicenseShortName||{}).value || "Wikimedia Commons"
      }));
    LS.setJSON("ml.img."+term, out);
    imgCache.set(term,out);
    return out;
  }catch(e){ imgCache.set(term,[]); return []; }
}
function photoCard(term, caption, fallback){
  const idx = parseInt(LS.get("ml.imgi."+term,"0"),10) || 0;
  const id = "ph"+Math.random().toString(36).slice(2,9);
  commons(term).then(list=>{
    const box = document.getElementById(id);
    if(!box) return;
    if(!list.length) return;
    const it = list[idx % list.length];
    box.innerHTML = '<img src="'+esc(it.url)+'" alt="'+esc(caption)+'" loading="lazy">'
      + '<span class="credit">'+esc(it.lic)+(it.author?" · "+esc(it.author):"")+'</span>';
    const img = box.querySelector("img");
    img.onerror = ()=>{ box.innerHTML = '<span class="fallback">'+fallback+'</span>'; };
  });
  return '<figure class="photo"><div class="ph" id="'+id+'"><span class="fallback">'+fallback+'</span></div>'
    + '<figcaption>'+esc(caption)+' <button class="swap" data-term="'+esc(term)+'" title="Boshqa rasm">⟳</button></figcaption></figure>';
}
document.addEventListener("click", e=>{
  const b = e.target.closest(".swap"); if(!b) return;
  const term = b.dataset.term;
  const cur = parseInt(LS.get("ml.imgi."+term,"0"),10) || 0;
  LS.set("ml.imgi."+term, String(cur+1));
  const fig = b.closest(".photo"), box = fig.querySelector(".ph");
  commons(term).then(list=>{
    if(!list.length) return;
    const it = list[(cur+1) % list.length];
    box.innerHTML = '<img src="'+esc(it.url)+'" alt="" loading="lazy"><span class="credit">'+esc(it.lic)+'</span>';
  });
});

/* ============================ variant ============================ */
let V = null;
function newVariant(){
  const cats = pickN(BANK.p11,3);
  const i12 = Math.floor(Math.random()*BANK.p12.length);
  const i2  = Math.floor(Math.random()*BANK.p2.length);
  const i3  = Math.floor(Math.random()*BANK.p3.length);
  V = { q11: cats.map(c=>pick(c.q)), i12, i2, i3,
        t12: BANK.p12[i12], t2: BANK.p2[i2], t3: BANK.p3[i3] };
  $("variantNote").textContent = "Bu variant: " + V.t12.t + " · " + V.t2.t;
}
$("btnShuffle").onclick = newVariant;

/* ============================ microphone ============================ */
let micStream=null, mediaRec=null, recChunks=[], analyser=null, meterRaf=null;
let slotStats=null, SR=null, srActive=false;

async function initMic(){
  if(micStream) return true;
  if(!$("optRecord").checked && !$("optStt").checked) return false;
  try{
    micStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    const c = audioCtx();
    const src = c.createMediaStreamSource(micStream);
    analyser = c.createAnalyser(); analyser.fftSize = 1024;
    src.connect(analyser);
    return true;
  }catch(e){ micStream=null; return false; }
}
function pickMime(){
  const opts = ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"];
  for(const m of opts) if(window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
function startSlotRecording(){
  slotStats = { start: Date.now(), silent: 0, longest: 0, run: 0, frames: 0, voiced: 0 };
  if(micStream && $("optRecord").checked && window.MediaRecorder){
    try{
      const m = pickMime();
      mediaRec = m ? new MediaRecorder(micStream,{mimeType:m}) : new MediaRecorder(micStream);
      recChunks = [];
      mediaRec.ondataavailable = e => { if(e.data && e.data.size) recChunks.push(e.data); };
      mediaRec.start();
      $("recDot").hidden = false;
    }catch(e){ mediaRec=null; }
  }
  if(analyser){
    $("meter").hidden = false;
    const buf = new Uint8Array(analyser.fftSize);
    const tick = ()=>{
      if(!slotStats){ return; }
      analyser.getByteTimeDomainData(buf);
      let sum=0; for(let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; sum+=v*v; }
      const rms = Math.sqrt(sum/buf.length);
      slotStats.frames++;
      if(rms < 0.015){ slotStats.run += 1/60; slotStats.silent += 1/60; if(slotStats.run>slotStats.longest) slotStats.longest=slotStats.run; }
      else { slotStats.run = 0; slotStats.voiced++; }
      $("meterBar").style.width = Math.min(100, rms*420) + "%";
      meterRaf = requestAnimationFrame(tick);
    };
    meterRaf = requestAnimationFrame(tick);
  }
  startSR();
}
function stopSlotRecording(){
  return new Promise(resolve=>{
    cancelAnimationFrame(meterRaf);
    $("meter").hidden = true; $("recDot").hidden = true;
    const stats = slotStats ? {
      seconds: (Date.now()-slotStats.start)/1000,
      silence: Math.round(slotStats.silent),
      longestPause: Math.round(slotStats.longest*10)/10
    } : null;
    slotStats = null;
    const text = stopSR();
    if(mediaRec && mediaRec.state !== "inactive"){
      const mr = mediaRec; mediaRec = null;
      mr.onstop = ()=>{
        const blob = new Blob(recChunks, {type: mr.mimeType || "audio/webm"});
        recChunks = [];
        resolve({ blob, stats, text });
      };
      try{ mr.stop() }catch(e){ resolve({blob:null, stats, text}) }
    } else resolve({ blob:null, stats, text });
  });
}
/* speech recognition */
let srText = "", srObj = null;
function startSR(){
  srText = "";
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!Rec || !$("optStt").checked) return;
  try{
    srObj = new Rec();
    srObj.lang = "en-US"; srObj.continuous = true; srObj.interimResults = true;
    srObj.onresult = e => {
      let fin = "";
      for(let i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
      if(fin) srText += fin;
    };
    srObj.onerror = ()=>{};
    srObj.onend = ()=>{ if(srActive){ try{ srObj.start() }catch(e){} } };
    srActive = true;
    srObj.start();
  }catch(e){ srObj=null; }
}
function stopSR(){
  srActive = false;
  if(srObj){ try{ srObj.stop() }catch(e){} srObj = null; }
  const t = srText.trim(); srText = "";
  return t;
}

/* ============================ exam engine ============================ */
let steps=[], idx=-1, runToken=0, raf=null, endAt=0, paused=false, pauseLeft=0, answers=[];
const CIRC = 2*Math.PI*55;

function instrP11(){ return "Part one. In this part, I'm going to ask you three short questions about yourself and your interests. You will have thirty seconds to answer each question. Begin speaking when you hear the signal."; }
function instrP12(){ return "Now look at the two pictures. I'm going to ask you three questions about them. You will have forty-five seconds for the first question, and thirty seconds for each of the other two."; }
function instrP2(){ return "Part two. Here is a picture and three questions about the topic. You do not need to describe the picture. You have one minute to prepare, and then two minutes to answer all three questions."; }
function instrP3(){ return "Part three. Here is a statement, with a list of points for it and a list of points against it. Choose two points from each list and give a balanced argument that shows both sides. You have one minute to prepare, and then two minutes to speak."; }

function buildSteps(){
  steps = []; answers = [];
  if($("p11").checked){
    steps.push({k:"instr",part:"Part 1.1",say:instrP11(),show:"Part 1.1 — three short questions about you.<br><small>30 seconds for each answer</small>"});
    V.q11.forEach((q,i)=>{
      const slot = answers.push({part:"Part 1.1",label:"Savol "+(i+1),question:q,max:null,sec:30})-1;
      steps.push({k:"q",part:"Part 1.1",label:"Savol "+(i+1)+" / 3",say:q,text:q,sec:30,slot});
    });
  }
  if($("p12").checked){
    const t = V.t12;
    steps.push({k:"instr",part:"Part 1.2",say:instrP12(),show:"Part 1.2 — "+esc(t.t),pics:t});
    t.q.forEach((q,i)=>{
      const slot = answers.push({part:"Part 1.2",label:"Savol "+(i+4),question:q,topic:t.t,sec:i===0?45:30})-1;
      steps.push({k:"q",part:"Part 1.2",label:"Savol "+(i+4)+" / 6",say:q,text:q,sec:i===0?45:30,pics:t,slot});
    });
  }
  if($("p2").checked){
    const t = V.t2;
    steps.push({k:"prep",part:"Part 2",say:instrP2(),sec:60,topic:t});
    const slot = answers.push({part:"Part 2",label:t.t,question:t.q.join(" / "),topic:t.t,sec:120})-1;
    steps.push({k:"talk",part:"Part 2",sec:120,topic:t,slot});
  }
  if($("p3").checked){
    const t = V.t3;
    steps.push({k:"prep",part:"Part 3",say:instrP3(),sec:60,fa:t});
    const slot = answers.push({part:"Part 3",label:"For and against",question:t.s,fa:t,sec:120})-1;
    steps.push({k:"talk",part:"Part 3",sec:120,fa:t,slot});
  }
}

function picsHTML(t,i){
  const terms = BANK.p12img[i] || ["",""];
  return '<div class="pics">'
    + photoCard(terms[0], t.a[1], t.a[0])
    + photoCard(terms[1], t.b[1], t.b[0]) + '</div>';
}
function topicHTML(t,i){
  return '<div class="pics one">' + photoCard(BANK.p2img[i]||"", t.t, t.e) + '</div>'
    + '<ol class="qlist">' + t.q.map(q=>"<li>"+esc(q)+"</li>").join("") + '</ol>';
}
function faHTML(t){
  return '<div class="statement">'+esc(t.s)+'</div>'
    + '<div class="cols"><div class="col for"><h4>For</h4><ul>'+t.f.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ul></div>'
    + '<div class="col against"><h4>Against</h4><ul>'+t.a.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ul></div></div>'
    + '<p class="note">Har ro‘yxatdan ikkitadan punkt tanlang, ikkala tomonni ham ko‘rsating va xulosa qiling.</p>';
}

function render(s){
  $("partLabel").textContent = s.part;
  const p = $("prompt");
  if(s.k==="instr"){
    $("phaseLabel").textContent = "Ko‘rsatma";
    p.innerHTML = '<div class="qtext">'+s.show+'</div>' + (s.pics?picsHTML(s.pics,V.i12):"");
  } else if(s.k==="q"){
    $("phaseLabel").textContent = s.label;
    p.innerHTML = (s.pics?picsHTML(s.pics,V.i12):"") + '<div class="qtext">'+esc(s.text)+'</div>';
  } else if(s.k==="prep"){
    $("phaseLabel").textContent = "Tayyorgarlik · 1 daqiqa";
    p.innerHTML = s.topic ? topicHTML(s.topic,V.i2) : faHTML(s.fa);
  } else if(s.k==="talk"){
    $("phaseLabel").textContent = "Gapiring · 2 daqiqa";
    p.innerHTML = s.topic ? topicHTML(s.topic,V.i2) : faHTML(s.fa);
  }
}

const fmt = s => Math.floor(s/60)+":"+String(Math.max(0,s%60)).padStart(2,"0");
function paint(remain,total){
  $("clock").textContent = fmt(Math.max(0,Math.ceil(remain)));
  $("arc").setAttribute("stroke-dashoffset", String(CIRC*(1-(total?Math.max(0,remain)/total:0))));
  $("ring").classList.toggle("urgent", remain<=10);
}
function startTimer(sec, onEnd){
  const token = runToken;
  endAt = Date.now()+sec*1000;
  cancelAnimationFrame(raf);
  (function tick(){
    if(token!==runToken) return;
    if(paused){ raf = requestAnimationFrame(tick); return; }
    const remain = (endAt-Date.now())/1000;
    paint(remain, sec);
    if(remain<=0){ onEnd(); return; }
    raf = requestAnimationFrame(tick);
  })();
}

function nextStep(){
  idx++;
  if(idx>=steps.length) return finish();
  const s = steps[idx], token = runToken;
  render(s);
  paint(s.sec||0, s.sec||1);
  if(s.k==="instr"){
    say(s.say, ()=>{ if(token===runToken) nextStep(); });
  } else if(s.k==="q" || s.k==="talk"){
    const begin = ()=>{
      if(token!==runToken) return;
      chime();
      setTimeout(()=>{
        if(token!==runToken) return;
        startSlotRecording();
        startTimer(s.sec, async ()=>{
          chime();
          const r = await stopSlotRecording();
          if(token!==runToken) return;
          const a = answers[s.slot];
          a.blob = r.blob; a.stats = r.stats; a.text = r.text;
          nextStep();
        });
      }, 600);
    };
    if(s.k==="q") say(s.say, begin); else begin();
  } else if(s.k==="prep"){
    say(s.say, ()=>{ if(token===runToken) startTimer(s.sec, ()=>nextStep()); });
  }
}

async function startExam(){
  if(!($("p11").checked||$("p12").checked||$("p2").checked||$("p3").checked)) return;
  audioCtx();
  const ok = await initMic();
  if(!ok && ($("optRecord").checked||$("optStt").checked)){
    alert("Mikrofonga ruxsat berilmadi. Mock ovoz yozuvisiz davom etadi — javoblarni oxirida qo‘lda yozishingiz mumkin.");
  }
  buildSteps();
  runToken++; idx = -1; paused = false;
  $("btnPause").textContent = "Pauza";
  $("home").hidden = true; $("results").hidden = true; $("stage").hidden = false;
  window.scrollTo(0,0);
  nextStep();
}
function stopExam(){
  runToken++; cancelAnimationFrame(raf); stopSpeech(); stopSR();
  if(mediaRec && mediaRec.state!=="inactive"){ try{ mediaRec.stop() }catch(e){} }
  mediaRec = null; slotStats = null;
  $("meter").hidden = true; $("recDot").hidden = true;
  $("stage").hidden = true; $("results").hidden = true; $("home").hidden = false;
}
$("btnStart").onclick = startExam;
$("btnStop").onclick = stopExam;
$("btnAgain").onclick = ()=>{ newVariant(); startExam(); };
$("btnPause").onclick = ()=>{
  if(!paused){ paused = true; pauseLeft = endAt - Date.now(); $("btnPause").textContent = "Davom ettirish"; try{speechSynthesis.pause()}catch(e){} if(currentAudio) currentAudio.pause(); }
  else { paused = false; endAt = Date.now()+pauseLeft; $("btnPause").textContent = "Pauza"; try{speechSynthesis.resume()}catch(e){} if(currentAudio) currentAudio.play().catch(()=>{}); }
};
$("btnRepeat").onclick = ()=>{
  const s = steps[idx]; if(!s) return;
  const t = s.say || (s.fa ? s.fa.s : (s.topic ? s.topic.q.join(". ") : ""));
  say(t, ()=>{});
};
$("btnSkip").onclick = async ()=>{
  const s = steps[idx];
  cancelAnimationFrame(raf); stopSpeech();
  if(s && (s.k==="q"||s.k==="talk") && s.slot!=null){
    const r = await stopSlotRecording();
    const a = answers[s.slot]; a.blob=r.blob; a.stats=r.stats; a.text=r.text;
  }
  paused = false; $("btnPause").textContent = "Pauza";
  nextStep();
};

/* ============================ results ============================ */
function wordCount(t){ return (t||"").trim() ? t.trim().split(/\s+/).length : 0; }
const FILLERS = /\b(um+|uh+|er+|ehm+|like|you know|i mean|actually)\b/gi;

function statLine(a){
  const w = wordCount(a.text);
  const secs = a.stats ? Math.round(a.stats.seconds) : a.sec;
  const wpm = secs ? Math.round(w/secs*60) : 0;
  const bits = [];
  bits.push(w + " so‘z");
  if(wpm) bits.push(wpm + " so‘z/daq");
  if(a.stats){
    bits.push("sukut " + a.stats.silence + " s");
    if(a.stats.longestPause >= 1.5) bits.push("eng uzun pauza " + a.stats.longestPause + " s");
  }
  const f = (a.text||"").match(FILLERS);
  if(f && f.length) bits.push("to‘ldiruvchi " + f.length + " ta");
  return bits.join(" · ");
}

function renderAnswers(){
  const box = $("answers");
  box.innerHTML = answers.map((a,i)=>{
    const audio = a.blob ? '<audio controls preload="none" src="'+URL.createObjectURL(a.blob)+'"></audio>' : '<span class="note">Ovoz yozuvi yo‘q</span>';
    return '<div class="card ans">'
      + '<div class="anshead"><span class="badge small">'+esc(a.part)+'</span><span class="note">'+esc(statLine(a))+'</span></div>'
      + '<p class="q">'+esc(a.question)+'</p>'
      + audio
      + '<textarea id="tx'+i+'" rows="4" placeholder="Javob matni shu yerda chiqadi. Chiqmasa — telefon klaviaturasidagi mikrofon bilan aytib yozdiring yoki yozing.">'+esc(a.text||"")+'</textarea>'
      + '</div>';
  }).join("");
  answers.forEach((a,i)=>{ const t=$("tx"+i); if(t) t.oninput = ()=>{ a.text = t.value; }; });
}

async function transcribeAll(){
  if(cfg.provider!=="openai" || !hasAI()) return;
  const todo = answers.filter(a=>a.blob && !(a.text||"").trim());
  if(!todo.length) return;
  $("gradeNote").textContent = "Ovoz matnga aylantirilmoqda… (" + todo.length + " ta javob)";
  for(const a of todo){
    try{
      const fd = new FormData();
      const ext = (a.blob.type||"").includes("mp4") ? "mp4" : (a.blob.type||"").includes("ogg") ? "ogg" : "webm";
      fd.append("file", a.blob, "answer."+ext);
      fd.append("model","whisper-1");
      fd.append("language","en");
      const r = await fetch("https://api.openai.com/v1/audio/transcriptions",{
        method:"POST", headers:{ "Authorization":"Bearer "+cfg.key }, body: fd });
      if(r.ok){ const j = await r.json(); a.text = (j.text||"").trim(); }
    }catch(e){}
  }
  renderAnswers();
  updateNotes();
}

function finish(){
  runToken++; cancelAnimationFrame(raf); stopSpeech();
  $("stage").hidden = true; $("results").hidden = false;
  $("grade").hidden = true; $("grade").innerHTML = "";
  renderAnswers();
  updateNotes();
  window.scrollTo(0,0);
  transcribeAll();
}

$("btnDownload").onclick = ()=>{
  answers.forEach((a,i)=>{
    if(!a.blob) return;
    const ext = (a.blob.type||"").includes("mp4") ? "m4a" : "webm";
    const url = URL.createObjectURL(a.blob);
    const el = document.createElement("a");
    el.href = url; el.download = "multilevel-"+(i+1)+"-"+a.part.replace(/[^\w.]+/g,"-")+"."+ext;
    document.body.appendChild(el); el.click(); el.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  });
};

/* ============================ grading ============================ */
const CRITERIA = `
Official UZBMB Multilevel speaking rating scale (simplified).
Part 1.1 (questions 1-3, max 5): 5 = clearly above A2, connected sentences with reasons and examples. 4 = all three answers on topic, simple grammar mostly correct, basic mistakes recur, enough vocabulary, frequent pauses but meaning clear. 3 = only two answers on topic. 2 = at least two answers on topic but only words and phrases, errors block understanding. 1 = only one answer on topic. 0 = no meaningful language, off topic or memorised.
Part 1.2 (questions 4-6, max 5): 5 = clearly above B1, complex ideas with control and clear links. 4 = all three on topic, simple grammar correct, errors in complex structures, generally clear pronunciation, only simple linkers. 3 = only two on topic. 2 = at least two on topic, systematic basic mistakes, ideas listed with little linking. 1 = only one on topic. 0 = below A2 or off topic.
Part 2 (max 5): 5 = clearly above B2. 4 = all three questions answered on topic, some complex grammar accurate, wide enough vocabulary, some pausing, limited linking devices. 3 = only two questions on topic. 2 = at least two on topic, limited vocabulary makes the task hard. 1 = only one question on topic. 0 = below B1 or off topic.
Part 3 (max 6): 6 = clearly above C1. 5 = clear presentation of points from each side with reasons for and against, range of complex grammar, range of cohesive devices. 4 = addresses points from each section, some complex grammar accurate, limited linking. 3 = addresses only one side. 2 = cannot sustain a response, depends on prompts, simple grammar only. 1 = reads the prompts directly. 0 = off topic.
Memorised answers score 0. Examiners judge: how many questions are answered on topic, grammar, vocabulary, pausing and restarts, and how ideas are linked.`;

function buildPrompt(){
  const parts = {};
  answers.forEach(a=>{ (parts[a.part] = parts[a.part] || []).push(a); });
  let body = "";
  Object.keys(parts).forEach(p=>{
    body += "\n### " + p + "\n";
    parts[p].forEach(a=>{
      body += "Question: " + a.question + "\n";
      body += "Time allowed: " + a.sec + " s. Measured: " + (a.stats?Math.round(a.stats.seconds)+" s spoken, "+a.stats.silence+" s silence, longest pause "+a.stats.longestPause+" s":"not measured") + "\n";
      body += "Transcript: " + ((a.text||"").trim() || "(no speech recorded)") + "\n\n";
    });
    if(p==="Part 3" && V.t3) body += "FOR list: " + V.t3.f.join("; ") + "\nAGAINST list: " + V.t3.a.join("; ") + "\n";
  });
  return `You are an experienced CEFR Multilevel (UZBMB) speaking examiner in Uzbekistan.
Score the candidate's performance below using this rating scale.

${CRITERIA}

The transcripts come from automatic speech recognition, so ignore punctuation, capitalisation and obvious recognition errors; judge the language the candidate produced. You cannot hear pronunciation, so never comment on accent or pronunciation; use the timing data for fluency (speaking far less than the time allowed, or long pauses, means the answer was underdeveloped).

CANDIDATE PERFORMANCE
${body}

Return ONLY valid JSON in exactly this shape, with all feedback written in Uzbek (latin script), and all example English sentences in English:
{
 "parts":[{"part":"Part 1.1","raw":4,"max":5,"onTopic":"3/3","good":"...","fix":["...","..."],"upgrade":"one English sentence from the candidate rewritten at a higher level"}],
 "summary":"2-3 sentences in Uzbek about the overall performance",
 "priority":["the single most valuable thing to work on","second","third"]
}
Give half points where the scale allows (e.g. 4.5). Be strict but fair: an answer that is short, off topic, or only one-sided in Part 3 must lose marks.`;
}

async function callAI(prompt){
  if(cfg.provider==="anthropic"){
    const r = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{ "content-type":"application/json", "x-api-key":cfg.key,
                "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
      body: JSON.stringify({ model: modelName(), max_tokens: 3000, messages:[{role:"user",content:prompt}] })
    });
    if(!r.ok) throw new Error("API xatosi " + r.status + ": " + (await r.text()).slice(0,200));
    const j = await r.json();
    return (j.content||[]).map(c=>c.text||"").join("");
  }
  const r = await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":"Bearer "+cfg.key },
    body: JSON.stringify({ model: modelName(), messages:[{role:"user",content:prompt}],
                           response_format:{type:"json_object"} })
  });
  if(!r.ok) throw new Error("API xatosi " + r.status + ": " + (await r.text()).slice(0,200));
  const j = await r.json();
  return j.choices[0].message.content;
}

function toRating(raw, maxTotal){
  const scaled = maxTotal ? raw/maxTotal*21 : 0;
  let best = BANK.scale[BANK.scale.length-1];
  for(const [r,v] of BANK.scale){ if(scaled >= r - 0.001){ best = [r,v]; break; } }
  return Math.round(best[1]);
}
const levelOf = r => r>=65 ? "C1" : r>=51 ? "B2" : r>=38 ? "B1" : "B1 dan quyi";

$("btnGrade").onclick = async ()=>{
  if(!hasAI()){ openSettings(); return; }
  const any = answers.some(a=>(a.text||"").trim());
  if(!any){ $("gradeNote").textContent = "Baholash uchun javob matni kerak. Matn maydoniga yozing yoki diktovka qiling."; return; }
  $("btnGrade").disabled = true;
  $("gradeNote").textContent = "Baholanmoqda…";
  try{
    const out = await callAI(buildPrompt());
    const clean = out.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
    const data = JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}")+1));
    const raw = (data.parts||[]).reduce((s,p)=>s+(parseFloat(p.raw)||0),0);
    const max = (data.parts||[]).reduce((s,p)=>s+(parseFloat(p.max)||0),0);
    const rating = toRating(raw,max);
    $("grade").hidden = false;
    $("grade").innerHTML =
      '<div class="score"><div class="big"><b>'+raw+'</b><span>/ '+max+' xom ball</span></div>'
      + '<div class="big"><b>'+rating+'</b><span>/ 75 reyting</span></div>'
      + '<div class="big level"><b>'+levelOf(rating)+'</b><span>taxminiy daraja</span></div></div>'
      + (data.summary?'<p class="summary">'+esc(data.summary)+'</p>':"")
      + (data.parts||[]).map(p=>
          '<div class="pgrade"><div class="ph2"><b>'+esc(p.part)+'</b><span class="pill">'+esc(p.raw)+' / '+esc(p.max)+'</span>'
          + (p.onTopic?'<span class="note">mavzuda: '+esc(p.onTopic)+'</span>':"")+'</div>'
          + (p.good?'<p class="good">'+esc(p.good)+'</p>':"")
          + (p.fix&&p.fix.length?'<ul class="fix">'+p.fix.map(f=>"<li>"+esc(f)+"</li>").join("")+'</ul>':"")
          + (p.upgrade?'<p class="upg"><span>Kuchliroq variant</span>'+esc(p.upgrade)+'</p>':"")
          + '</div>').join("")
      + (data.priority&&data.priority.length?'<div class="pgrade"><div class="ph2"><b>Nimadan boshlash kerak</b></div><ol class="fix">'+data.priority.map(x=>"<li>"+esc(x)+"</li>").join("")+'</ol></div>':"");
    $("gradeNote").textContent = "Talaffuz va ravonlikni ovoz yozuvini tinglab o‘zingiz baholang — bu baho matn asosida qo‘yilgan.";
  }catch(e){
    $("gradeNote").textContent = "Baholab bo‘lmadi: " + (e.message||e) + " — kalit va model nomini Sozlamalardan tekshiring.";
  }
  $("btnGrade").disabled = false;
};

/* ============================ notes / init ============================ */
function updateNotes(){
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const n = [];
  if(!hasSR){
    n.push(cfg.provider==="openai" && hasAI()
      ? "Bu brauzer nutqni o‘zi matnga aylantirmaydi — ovoz yozuvi OpenAI orqali matnga aylantiriladi."
      : "Bu brauzer (Safari / iPhone) nutqni matnga aylantirmaydi. OpenAI kalitini kiriting yoki javobni klaviatura mikrofoni bilan diktovka qiling.");
  }
  if(!hasAI()) n.push("Baholash uchun Sozlamalardan API kalit kiriting.");
  const el = $("capNote");
  el.hidden = !n.length; el.innerHTML = n.join("<br>");
  $("gradeNote").textContent = hasAI()
    ? "Baho matn asosida qo‘yiladi: grammatika, lug‘at, topshiriqni bajarish va bog‘lanish. Talaffuzni yozuvni tinglab o‘zingiz baholaysiz."
    : "Baholash uchun Sozlamalarda API kalit kiritilgan bo‘lishi kerak.";
}
newVariant();
paint(30,30);
updateNotes();
if(!LS.get("ml.seen","")){ LS.set("ml.seen","1"); if(!hasAI()) setTimeout(openSettings, 800); }
