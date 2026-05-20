// ════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════
let score = 0, fcIdx = 0, fcSeen = new Set();
let vqAns = {}, tfAns = {}, synAns = {};
let ttsRate = 0.8, ttsU = null;
let awDone = new Set();

const API_URL = "https://api.anthropic.com/v1/messages";

// ════════════════════════════════════════
// SCORE
// ════════════════════════════════════════
function addScore(n) {
  score += n;
  const scoreNumEl = document.getElementById('score-num');
  if (scoreNumEl) scoreNumEl.textContent = score;
}

// ════════════════════════════════════════
// STAGE NAV & NAVIGATION
// ════════════════════════════════════════
function gS(n) {
  const hasAW = typeof AW_PROMPTS !== 'undefined' && AW_PROMPTS.length > 0;
  const maxStage = hasAW ? 5 : 4;
  for (let i = 0; i <= maxStage; i++) {
    const stageEl = document.getElementById(`s${i}`);
    const navEl = document.getElementById(`sn${i}`);
    if (stageEl) stageEl.classList.toggle('on', i === n);
    if (navEl) navEl.className = 'snav' + (i === n ? ' on' : (i < n ? ' done' : ''));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollTo2(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' });
}

// ════════════════════════════════════════
// SPEECH SYNTHESIS (TTS)
// ════════════════════════════════════════
function setSp(r, btn) {
  ttsRate = r;
  document.querySelectorAll('.spd-btn').forEach(b => b.classList.remove('on'));
  // Sync all buttons across multiple TTS bars having same speed value
  document.querySelectorAll('.spd').forEach(container => {
    container.querySelectorAll('.spd-btn').forEach(b => {
      if (parseFloat(b.textContent) === r) b.classList.add('on');
    });
  });
  if (btn) btn.classList.add('on');
}

function ttsSay(text, onEnd) {
  ttsStop();
  if (!window.speechSynthesis) return;
  ttsU = new SpeechSynthesisUtterance(text);
  ttsU.lang = 'en-US';
  ttsU.rate = ttsRate;
  if (onEnd) ttsU.onend = onEnd;
  window.speechSynthesis.speak(ttsU);
}

function ttsStop() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const playBtn = document.getElementById('art-play-btn');
  if (playBtn) playBtn.classList.remove('on');
}

function ttsWord() {
  if (VOCAB && VOCAB[fcIdx]) {
    ttsSay(VOCAB[fcIdx].w.replace(/\(.*\)/, '').trim());
  }
}

function ttsEx() {
  if (VOCAB && VOCAB[fcIdx]) {
    ttsSay(VOCAB[fcIdx].ex.replace(/<[^>]+>/g, ''));
  }
}

function ttsArt() {
  const btn = document.getElementById('art-play-btn');
  if (!btn) return;
  btn.classList.add('on');
  const sents = ART_PLAIN.split(/(?<=[.!?"])\s+/);
  let i = 0;
  const prog = document.getElementById('art-prog');
  function next() {
    if (i >= sents.length) {
      btn.classList.remove('on');
      if (prog) prog.style.width = '0%';
      return;
    }
    if (prog) prog.style.width = Math.round(i / sents.length * 100) + '%';
    ttsSay(sents[i++], next);
  }
  next();
}

// ════════════════════════════════════════
// STAGE 0: FLASHCARDS & VOCAB LIST
// ════════════════════════════════════════
function buildFC() {
  if (typeof VOCAB === 'undefined' || !VOCAB.length) return;
  const dots = document.getElementById('fc-dots');
  if (dots) {
    dots.innerHTML = '';
    VOCAB.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'dot';
      d.id = `dot-${i}`;
      d.onclick = () => { fcIdx = i; renderFC(); };
      dots.appendChild(d);
    });
  }
  const vl = document.getElementById('vl');
  if (vl) {
    vl.innerHTML = '';
    VOCAB.forEach((v, i) => {
      vl.innerHTML += `
        <div class="vl-item" onclick="fcIdx=${i};renderFC();gS(0)">
          <div>
            <div class="vl-w">${esc(v.w)}</div>
            <div class="vl-v">${esc(v.viet)}</div>
          </div>
          <button class="vl-sp" onclick="event.stopPropagation();ttsSay('${esc(v.w)}')">🔊</button>
        </div>`;
    });
  }
  renderFC();
}

function renderFC() {
  if (typeof VOCAB === 'undefined' || !VOCAB.length) return;
  const v = VOCAB[fcIdx];
  const fcEl = document.getElementById('fc');
  if (fcEl) fcEl.classList.remove('flipped');
  
  const fcN = document.getElementById('fc-n');
  if (fcN) fcN.textContent = `${fcIdx + 1} / ${VOCAB.length}`;
  
  const fcWord = document.getElementById('fc-word');
  if (fcWord) fcWord.textContent = v.w;
  
  const fcPos = document.getElementById('fc-pos');
  if (fcPos) fcPos.textContent = v.pos;
  
  const fcIpa = document.getElementById('fc-ipa');
  if (fcIpa) fcIpa.textContent = v.ipa || '';
  
  const fcViet = document.getElementById('fc-viet');
  if (fcViet) fcViet.textContent = v.viet;
  
  const fcDef = document.getElementById('fc-def');
  if (fcDef) fcDef.textContent = v.def;
  
  const fcEx = document.getElementById('fc-ex');
  if (fcEx) fcEx.innerHTML = v.ex;
  
  const prevBtn = document.getElementById('fc-prev');
  if (prevBtn) prevBtn.disabled = (fcIdx === 0);
  
  const nextBtn = document.getElementById('fc-next');
  if (nextBtn) nextBtn.textContent = fcIdx === VOCAB.length - 1 ? '⟳ Đầu' : 'Tiếp →';
  
  fcSeen.add(fcIdx);
  VOCAB.forEach((_, i) => {
    const d = document.getElementById(`dot-${i}`);
    if (d) d.className = 'dot' + (fcSeen.has(i) ? ' seen' : '');
  });
}

function flipFC() {
  const fcEl = document.getElementById('fc');
  if (fcEl) fcEl.classList.toggle('flipped');
}

function fcMv(d) {
  if (typeof VOCAB === 'undefined' || !VOCAB.length) return;
  fcIdx = (fcIdx + d + VOCAB.length) % VOCAB.length;
  renderFC();
}

// ════════════════════════════════════════
// STAGE 1: VOCABULARY QUIZ
// ════════════════════════════════════════
function buildVQ() {
  if (typeof VOCAB === 'undefined' || !VOCAB.length) return;
  vqAns = {};
  const wrap = document.getElementById('vq-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const vqOut = document.getElementById('vq-out');
  if (vqOut) vqOut.style.display = 'none';
  const vqNext = document.getElementById('vq-next');
  if (vqNext) vqNext.classList.remove('show');
  
  const pool = shuffleArr([...VOCAB]).slice(0, 12);
  pool.forEach((item, i) => {
    const wrongs = shuffleArr(VOCAB.filter(v => v.w !== item.w)).slice(0, 3).map(v => v.viet);
    const opts = shuffleArr([item.viet, ...wrongs]);
    wrap.innerHTML += `
      <div class="vq" id="vqc-${i}" data-correct="${esc(item.viet)}">
        <div class="vq-q">Từ "<strong>${esc(item.w)}</strong>" (${esc(item.pos)}) nghĩa là gì?</div>
        <div class="vq-opts">
          ${opts.map(o => `<button class="vq-o" id="vqo-${i}-${esc(o)}" onclick="selVQ(${i},'${esc(o)}')">${esc(o)}</button>`).join('')}
        </div>
        <div class="vq-res" id="vqr-${i}"></div>
      </div>`;
  });
}

function selVQ(i, val) {
  vqAns[i] = val;
  const card = document.getElementById(`vqc-${i}`);
  if (card) {
    card.querySelectorAll('.vq-o').forEach(b => { b.classList.remove('selected'); });
  }
  const selectedBtn = document.getElementById(`vqo-${i}-${val}`);
  if (selectedBtn) selectedBtn.classList.add('selected');
}

function checkVQ() {
  let c = 0, tot = 0;
  document.querySelectorAll('.vq').forEach((card, i) => {
    tot++;
    const correct = card.dataset.correct;
    const ans = vqAns[i];
    card.querySelectorAll('.vq-o').forEach(b => b.disabled = true);
    const res = document.getElementById(`vqr-${i}`);
    if (ans === correct) {
      c++;
      const correctBtn = document.getElementById(`vqo-${i}-${correct}`);
      if (correctBtn) correctBtn.className = 'vq-o ok';
      if (res) res.innerHTML = `<span style="color:var(--green)">✓ Đúng!</span>`;
    } else {
      if (ans) {
        const selectedBtn = document.getElementById(`vqo-${i}-${ans}`);
        if (selectedBtn) selectedBtn.className = 'vq-o bad';
      }
      const correctBtn = document.getElementById(`vqo-${i}-${correct}`);
      if (correctBtn) correctBtn.className = 'vq-o ok';
      if (res) res.innerHTML = `<span style="color:var(--red)">✗ Đáp án: ${esc(correct)}</span>`;
    }
  });
  addScore(c * 3);
  const out = document.getElementById('vq-out');
  if (out) {
    out.style.display = '';
    out.innerHTML = `✅ <strong>${c}/${tot}</strong> đúng · +${c * 3} điểm ${c >= 9 ? '🎉' : '💪'}`;
  }
  const vqNext = document.getElementById('vq-next');
  if (vqNext) vqNext.classList.add('show');
}

// ════════════════════════════════════════
// STAGE 3: TRUE / FALSE
// ════════════════════════════════════════
function buildTF() {
  if (typeof TF_DATA === 'undefined' || !TF_DATA.length) return;
  tfAns = {};
  const wrap = document.getElementById('tf-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  const tfNext = document.getElementById('tf-next');
  if (tfNext) tfNext.classList.remove('show');
  TF_DATA.forEach((item, i) => {
    wrap.innerHTML += `
      <div class="tf-row">
        <div>
          <div class="tf-txt">${i + 1}. ${esc(item.text)}</div>
          <div class="tf-exp" id="tfe-${i}"></div>
        </div>
        <div class="tf-btns">
          <button class="tf-b" id="tfT-${i}" onclick="selTF(${i},'T')">True</button>
          <button class="tf-b" id="tfF-${i}" onclick="selTF(${i},'F')">False</button>
        </div>
      </div>`;
  });
}

function selTF(i, v) {
  const tBtn = document.getElementById(`tfT-${i}`);
  const fBtn = document.getElementById(`tfF-${i}`);
  if (tBtn && tBtn.disabled) return;
  tfAns[i] = v;
  if (tBtn) tBtn.className = 'tf-b' + (v === 'T' ? ' selT' : '');
  if (fBtn) fBtn.className = 'tf-b' + (v === 'F' ? ' selF' : '');
}

function checkTF() {
  if (typeof TF_DATA === 'undefined') return;
  let c = 0;
  TF_DATA.forEach((item, i) => {
    const a = tfAns[i];
    const tBtn = document.getElementById(`tfT-${i}`);
    const fBtn = document.getElementById(`tfF-${i}`);
    if (tBtn) tBtn.disabled = true;
    if (fBtn) fBtn.disabled = true;
    const exp = document.getElementById(`tfe-${i}`);
    if (a === item.ans) {
      c++;
      const ansBtn = document.getElementById(`tf${item.ans}-${i}`);
      if (ansBtn) ansBtn.classList.add('ok');
      if (exp) exp.innerHTML = `<span style="color:var(--green)">✓ ${esc(item.exp)}</span>`;
    } else {
      if (a) {
        const selectedBtn = document.getElementById(`tf${a}-${i}`);
        if (selectedBtn) selectedBtn.classList.add('bad');
      }
      const ansBtn = document.getElementById(`tf${item.ans}-${i}`);
      if (ansBtn) ansBtn.classList.add('ok');
      if (exp) exp.innerHTML = `<span style="color:var(--red)">✗ ${esc(item.exp)}</span>`;
    }
  });
  addScore(c * 5);
  const tfNext = document.getElementById('tf-next');
  if (tfNext) tfNext.classList.add('show');
}

// ════════════════════════════════════════
// STAGE 3: GAP FILL
// ════════════════════════════════════════
function buildGF() {
  if (typeof GF === 'undefined') return;
  const gfNext = document.getElementById('gf-next');
  if (gfNext) gfNext.classList.remove('show');
  const bk = document.getElementById('gf-bank');
  if (bk) {
    bk.innerHTML = '';
    shuffleArr([...GF.bank]).forEach(w => {
      bk.innerHTML += `<div class="gf-chip" id="gfc-${esc(w)}" onclick="fillGap('${esc(w)}')">${esc(w)}</div>`;
    });
  }
  const txt = document.getElementById('gf-text');
  if (txt) {
    txt.innerHTML = '';
    GF.parts.forEach(part => {
      const p = document.createElement('p');
      p.className = 'gf-p';
      p.innerHTML = part.replace(/\((\d+)\)____/g, (_, n) => `<input class="gap" id="gap-${n}" placeholder="${n}" readonly/>`);
      txt.appendChild(p);
    });
  }
}

function fillGap(w) {
  if (typeof GF === 'undefined') return;
  for (let n = 1; n <= GF.ans.length; n++) {
    const inp = document.getElementById(`gap-${n}`);
    if (inp && !inp.value) {
      inp.value = w;
      const chip = document.getElementById(`gfc-${w}`);
      if (chip) chip.classList.add('used');
      return;
    }
  }
}

function checkGF() {
  if (typeof GF === 'undefined') return;
  let c = 0;
  GF.ans.forEach((ans, i) => {
    const inp = document.getElementById(`gap-${i + 1}`);
    if (!inp) return;
    inp.readOnly = true;
    if (inp.value.trim().toLowerCase() === ans.toLowerCase()) {
      inp.classList.add('ok');
      c++;
    } else {
      inp.classList.add('bad');
      inp.title = `Đáp án: ${ans}`;
    }
  });
  addScore(c * 4);
  const gfNext = document.getElementById('gf-next');
  if (gfNext) gfNext.classList.add('show');
}

// ════════════════════════════════════════
// STAGE 3: SYNONYM MATCH
// ════════════════════════════════════════
function buildSyn() {
  if (typeof SYN_DATA === 'undefined') return;
  synAns = {};
  const synNext = document.getElementById('syn-next');
  if (synNext) synNext.classList.remove('show');
  const synCur = document.getElementById('syn-cur');
  if (synCur) synCur.textContent = '0';
  const allSyns = SYN_DATA.pairs.map(p => p.syn);
  const wrap = document.getElementById('syn-list');
  if (!wrap) return;
  wrap.innerHTML = '';
  SYN_DATA.pairs.forEach((pair, i) => {
    const wrongs = shuffleArr(allSyns.filter(s => s !== pair.syn)).slice(0, 3);
    const opts = shuffleArr([pair.syn, ...wrongs]);
    wrap.innerHTML += `
      <div class="syn-row" id="synrow-${i}">
        <div class="syn-left">
          ${esc(pair.w)}
          <button class="disc-speak" style="min-height:32px;min-width:36px;padding:2px 7px;font-size:0.85rem;" onclick="event.stopPropagation();ttsSay('${esc(pair.w)}')">🔊</button>
        </div>
        <div class="syn-select">
          <div class="syn-opts">
            ${opts.map(o => `<button class="syn-o" data-val="${esc(o)}" onclick="selSyn(${i},this)">${esc(o)}</button>`).join('')}
          </div>
        </div>
      </div>`;
  });
}

function selSyn(i, btn) {
  synAns[i] = btn.dataset.val;
  const row = document.getElementById(`synrow-${i}`);
  if (row) {
    row.querySelectorAll('.syn-o').forEach(b => b.classList.remove('selected'));
  }
  btn.classList.add('selected');
  const synCur = document.getElementById('syn-cur');
  if (synCur) synCur.textContent = Object.keys(synAns).length;
}

function checkSyn() {
  if (typeof SYN_DATA === 'undefined') return;
  let c = 0;
  SYN_DATA.pairs.forEach((pair, i) => {
    const row = document.getElementById(`synrow-${i}`);
    if (row) {
      row.querySelectorAll('.syn-o').forEach(b => {
        b.disabled = true;
        b.classList.remove('selected');
        if (b.dataset.val === pair.syn) b.classList.add('ok');
        else if (b.dataset.val === synAns[i]) b.classList.add('bad');
      });
    }
    if (synAns[i] === pair.syn) c++;
  });
  addScore(c * 3);
  const synNext = document.getElementById('syn-next');
  if (synNext) synNext.classList.add('show');
}

// ════════════════════════════════════════
// STAGE 4: DISCUSSION QUESTION BOARDS
// ════════════════════════════════════════
function buildDisc() {
  if (typeof DISC_COMP === 'undefined' || typeof DISC_OPEN === 'undefined') return;
  renderDiscSection('disc-comp', DISC_COMP);
  renderDiscSection('disc-open', DISC_OPEN);
}

function renderDiscSection(id, items) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.innerHTML = '';
  const aiEnabled = LESSON_CONFIG.aiEnabled;
  items.forEach((item, i) => {
    const uid = `${id}-${i}`;
    
    let boxContent = `
      <div class="disc-item" id="ditem-${uid}">
        <div class="disc-top">
          <div class="disc-num">${i + 1}</div>
          <div class="disc-q">${esc(item.q)}</div>
          <div class="disc-actions">
            <button class="disc-speak" onclick="ttsSay('${esc(item.q)}')" title="Nghe câu hỏi">🔊</button>
            <button class="disc-model-btn" id="dmb-${uid}" onclick="toggleModel('${uid}')">📖 Mẫu</button>
          </div>
        </div>

        <div class="model-box" id="model-${uid}">
          <div class="model-lbl">✅ Câu trả lời gợi ý</div>
          <div class="model-text">${formatModel(item.model)}</div>
          <div class="model-note">💡 ${esc(item.note)}</div>
          <button class="model-speak-btn" onclick="ttsSay('${esc(item.model)}')">🔊 Nghe câu mẫu</button>
        </div>
    `;

    if (aiEnabled) {
      boxContent += `
        <div class="disc-input-wrap" id="inp-${uid}">
          <div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;">✍️ Viết câu trả lời của bạn → AI chấm điểm</div>
          <textarea class="disc-ta" id="ta-${uid}" placeholder="Viết câu trả lời tiếng Anh của bạn…"></textarea>
          <div class="disc-ta-row">
            <button class="btn btn-ai" id="aibtn-${uid}" onclick="checkDiscAI('${uid}','${esc(item.q)}','${esc(item.model)}')">
              <span id="aiic-${uid}">✨</span><span id="ailb-${uid}">AI chấm</span>
            </button>
            <button class="btn btn-gh" style="font-size:0.75rem;" onclick="ttsSay(document.getElementById('ta-${uid}').value)">🔊 Nghe lại</button>
          </div>
          <div class="ai-fb" id="aifb-${uid}">
            <div class="ai-fb-top">
              <div class="ai-sc" id="aisc-${uid}">—</div>
              <div class="ai-track"><div class="ai-fill" id="aifl-${uid}"></div></div>
            </div>
            <div class="ai-body" id="aitx-${uid}"></div>
            <div class="ai-model" id="aimo-${uid}" style="display:none">
              <div class="ai-model-lbl">✅ Gợi ý câu tốt hơn</div>
              <div class="ai-model-txt" id="aimt-${uid}"></div>
            </div>
          </div>
        </div>

        <div style="padding:0 16px 12px;">
          <button class="btn btn-gh" style="font-size:0.75rem;width:100%;" onclick="toggleWrite('${uid}')">✍️ Viết &amp; nhận AI chấm điểm</button>
        </div>
      `;
    }

    boxContent += `</div>`;
    wrap.innerHTML += boxContent;
  });
}

function formatModel(text) {
  return esc(text).replace(/(Personally|In my opinion|Honestly|Not really|Yes, I|However|Furthermore|Besides|According to|I imagine|I find|Perhaps|I am not sure|That said|In addition|Such as|Indeed|Surprisingly|Obviously|Interestingly)/g, '<em>$1</em>');
}

function toggleModel(uid) {
  const box = document.getElementById(`model-${uid}`);
  if (!box) return;
  box.classList.toggle('show');
  const btn = document.getElementById(`dmb-${uid}`);
  if (btn) btn.textContent = box.classList.contains('show') ? '✕ Ẩn' : '📖 Mẫu';
}

function toggleWrite(uid) {
  const wrap = document.getElementById(`inp-${uid}`);
  if (!wrap) return;
  wrap.classList.toggle('show');
  const btn = event.target;
  btn.textContent = wrap.classList.contains('show') ? '▲ Thu gọn' : '✍️ Viết & nhận AI chấm điểm';
  if (wrap.classList.contains('show')) {
    const textarea = document.getElementById(`ta-${uid}`);
    if (textarea) textarea.focus();
  }
}

async function checkDiscAI(uid, question, modelAns) {
  const input = document.getElementById(`ta-${uid}`).value.trim();
  if (!input) { alert('Hãy viết câu trả lời trước nhé!'); return; }
  const btn = document.getElementById(`aibtn-${uid}`);
  if (btn) btn.disabled = true;
  const aiic = document.getElementById(`aiic-${uid}`);
  if (aiic) aiic.innerHTML = '<span class="spin"></span>';
  const ailb = document.getElementById(`ailb-${uid}`);
  if (ailb) ailb.textContent = 'Đang chấm…';

  const lessonTitle = LESSON_CONFIG.title;
  const SYS = LESSON_CONFIG.discSysPrompt || `You are an English teacher helping a Vietnamese student practice discussion questions. The student is studying a lesson titled "${lessonTitle}".
Evaluate their English answer. Respond ONLY with valid JSON (no backticks):
{"score":<0-100>,"feedback_viet":"<2-3 sentences Vietnamese: what's good, what to improve>","corrections":"<specific grammar/vocab corrections in Vietnamese, empty string if none>","better_version":"<a more natural or complete English answer>"}`;
  const USR = `Discussion question: "${question}"\nModel answer reference: "${modelAns}"\nStudent's answer: "${input}"`;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYS,
        messages: [{ role: "user", content: USR }]
      })
    });
    const data = await res.json();
    const raw = data.content.map(c => c.text || '').join('').trim();
    let p;
    try {
      p = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      p = { score: 50, feedback_viet: "Không phân tích được kết quả JSON từ AI.", corrections: "", better_version: "" };
    }
    const fb = document.getElementById(`aifb-${uid}`);
    if (fb) fb.classList.add('show');
    const aisc = document.getElementById(`aisc-${uid}`);
    if (aisc) aisc.textContent = p.score + '/100';
    
    const aifl = document.getElementById(`aifl-${uid}`);
    if (aifl) setTimeout(() => { aifl.style.width = p.score + '%'; }, 80);
    
    let txt = p.feedback_viet;
    if (p.corrections) txt += `\n\n⚠️ Sửa lỗi: ${p.corrections}`;
    const aitx = document.getElementById(`aitx-${uid}`);
    if (aitx) aitx.textContent = txt;
    
    if (p.better_version) {
      const aimo = document.getElementById(`aimo-${uid}`);
      if (aimo) aimo.style.display = '';
      const aimt = document.getElementById(`aimt-${uid}`);
      if (aimt) aimt.textContent = p.better_version;
    }
    addScore(Math.max(0, Math.floor(p.score / 10)));
  } catch (e) {
    const aitx = document.getElementById(`aitx-${uid}`);
    if (aitx) aitx.textContent = 'Lỗi kết nối đến máy chủ AI. Vui lòng thử lại.';
    const fb = document.getElementById(`aifb-${uid}`);
    if (fb) fb.classList.add('show');
    if (btn) btn.disabled = false;
  } finally {
    if (aiic) aiic.textContent = '✨';
    if (ailb) ailb.textContent = 'Chấm lại';
  }
}

// ════════════════════════════════════════
// STAGE 5: AI WRITING
// ════════════════════════════════════════
function buildAW() {
  if (typeof AW_PROMPTS === 'undefined' || !AW_PROMPTS.length) return;
  const wrap = document.getElementById('aw-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  AW_PROMPTS.forEach((p, i) => {
    wrap.innerHTML += `
      <div class="aw-block">
        <div class="prompt-block">
          <div class="pb-lbl">Dịch sang tiếng Anh</div>
          <div class="pb-txt">${esc(p.viet)}</div>
          <div class="pb-hint">💡 ${esc(p.hint)} · 📌 ${esc(p.grammar)}</div>
        </div>
        <div style="display:flex;gap:7px;align-items:flex-start;">
          <textarea class="aw-ta" id="aw-ta-${i}" placeholder="Viết câu tiếng Anh…"></textarea>
          <button onclick="ttsSay(document.getElementById('aw-ta-${i}').value)" title="Nghe lại" style="padding:8px;border:1.5px solid var(--border);border-radius:7px;background:var(--bg);cursor:pointer;font-size:0.9rem;flex-shrink:0;margin-top:2px;">🔊</button>
        </div>
        <div class="btn-row">
          <button class="btn btn-ai" id="awbtn-${i}" onclick="checkAW(${i})">
            <span id="awic-${i}">✨</span><span id="awlb-${i}">AI chấm bài</span>
          </button>
        </div>
        <div class="ai-fb" id="awfb-${i}">
          <div class="ai-fb-top">
            <div class="ai-sc" id="awsc-${i}">—</div>
            <div class="ai-track"><div class="ai-fill" id="awfl-${i}"></div></div>
          </div>
          <div class="ai-body" id="awtx-${i}"></div>
          <div class="ai-model" id="awmo-${i}" style="display:none">
            <div class="ai-model-lbl">✅ Câu mẫu</div>
            <div class="ai-model-txt" id="awmt-${i}"></div>
          </div>
        </div>
      </div>`;
  });
}

async function checkAW(i) {
  const input = document.getElementById(`aw-ta-${i}`).value.trim();
  if (!input) { alert('Hãy viết câu trước nhé!'); return; }
  const btn = document.getElementById(`awbtn-${i}`);
  if (btn) btn.disabled = true;
  const awic = document.getElementById(`awic-${i}`);
  if (awic) awic.innerHTML = '<span class="spin"></span>';
  const awlb = document.getElementById(`awlb-${i}`);
  if (awlb) awlb.textContent = 'Đang chấm…';

  const p = AW_PROMPTS[i];
  const SYS = LESSON_CONFIG.awSysPrompt || `You are an English teacher helping a Vietnamese student. Evaluate their English sentence translation. Respond ONLY with valid JSON (no backticks): {"score":<0-100>,"feedback_viet":"<2-3 sentences Vietnamese>","corrections":"<corrections Vietnamese or empty>","better_version":"<natural English sentence>"}`;
  const USR = `Vietnamese: "${p.viet}"\nStudent wrote: "${input}"\nGrammar focus: ${p.grammar}`;
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYS,
        messages: [{ role: "user", content: USR }]
      })
    });
    const data = await res.json();
    const raw = data.content.map(c => c.text || '').join('').trim();
    let p2;
    try {
      p2 = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      p2 = { score: 50, feedback_viet: "Không phân tích được kết quả JSON từ AI.", corrections: "", better_version: "" };
    }
    const fb = document.getElementById(`awfb-${i}`);
    if (fb) fb.classList.add('show');
    const awsc = document.getElementById(`awsc-${i}`);
    if (awsc) awsc.textContent = p2.score + '/100';
    
    const awfl = document.getElementById(`awfl-${i}`);
    if (awfl) setTimeout(() => { awfl.style.width = p2.score + '%'; }, 80);
    
    let txt = p2.feedback_viet;
    if (p2.corrections) txt += `\n\n⚠️ Sửa: ${p2.corrections}`;
    const awtx = document.getElementById(`awtx-${i}`);
    if (awtx) awtx.textContent = txt;
    
    if (p2.better_version) {
      const awmo = document.getElementById(`awmo-${i}`);
      if (awmo) awmo.style.display = '';
      const awmt = document.getElementById(`awmt-${i}`);
      if (awmt) awmt.textContent = p2.better_version;
    }
    addScore(Math.max(0, Math.floor(p2.score / 10)));
    awDone.add(i);
    if (awDone.size === AW_PROMPTS.length) {
      const awDoneEl = document.getElementById('aw-done');
      if (awDoneEl) awDoneEl.classList.add('show');
    }
  } catch (e) {
    const awtx = document.getElementById(`awtx-${i}`);
    if (awtx) awtx.textContent = 'Lỗi kết nối. Thử lại.';
    const fb = document.getElementById(`awfb-${i}`);
    if (fb) fb.classList.add('show');
    if (btn) btn.disabled = false;
  } finally {
    if (awic) awic.textContent = '✨';
    if (awlb) awlb.textContent = 'Chấm lại';
  }
}

// ════════════════════════════════════════
// UNIFIED SUMMARY CALCULATOR
// ════════════════════════════════════════
function showResult() {
  let max = 12 * 3; // Vocab Quiz is always 12 items * 3 pts
  if (typeof TF_DATA !== 'undefined') {
    max += TF_DATA.length * 5;
  }
  if (typeof GF !== 'undefined') {
    max += GF.ans.length * 4;
  } else if (typeof SYN_DATA !== 'undefined') {
    max += SYN_DATA.pairs.length * 3;
  }
  const hasAW = typeof AW_PROMPTS !== 'undefined' && AW_PROMPTS.length > 0;
  if (hasAW) {
    max += AW_PROMPTS.length * 10;
  }

  const pct = max > 0 ? Math.round(score / max * 100) : 0;
  let emoji = '💪', msg = 'Cố lên nhé!';
  if (pct >= 90) { emoji = '🏆'; msg = 'Xuất sắc!'; }
  else if (pct >= 70) { emoji = '🎉'; msg = 'Rất tốt!'; }
  else if (pct >= 50) { emoji = '👍'; msg = 'Khá tốt!'; }

  alert(`${emoji} Tổng điểm: ${score} / ${max} điểm!\nTỷ lệ: ${pct}%\n${msg}`);
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════
function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ════════════════════════════════════════
// CORE INITIALIZER
// ════════════════════════════════════════
function generateHTML() {
  const hasAW = typeof AW_PROMPTS !== 'undefined' && AW_PROMPTS.length > 0;
  const aiEnabled = LESSON_CONFIG.aiEnabled;

  const headerHtml = `
    <!-- HERO -->
    <div class="hero">
      <div class="hero-tag">${esc(LESSON_CONFIG.tag)}</div>
      <div class="hero-title">${LESSON_CONFIG.titleHtml || LESSON_CONFIG.title}</div>
      <div class="hero-sub">${esc(LESSON_CONFIG.sub)}</div>
      <div class="hero-score">Điểm: <strong id="score-num">0</strong> 🏆</div>
    </div>

    <!-- STAGE NAV -->
    <div class="stage-nav">
      <div class="snav on" id="sn0" onclick="gS(0)"><span class="si">📚</span>Từ vựng</div>
      <div class="snav" id="sn1" onclick="gS(1)"><span class="si">🎯</span>Quiz</div>
      <div class="snav" id="sn2" onclick="gS(2)"><span class="si">📰</span>Bài đọc</div>
      <div class="snav" id="sn3" onclick="gS(3)"><span class="si">✏️</span>Bài tập</div>
      <div class="snav" id="sn4" onclick="gS(4)"><span class="si">💬</span>Thảo luận</div>
      ${hasAW ? `<div class="snav" id="sn5" onclick="gS(5)"><span class="si">✍️</span>AI Viết</div>` : ''}
    </div>
  `;

  const stage0Html = `
    <!-- ══ STAGE 0: VOCAB ══ -->
    <div class="stage on" id="s0">
      <div class="tts-bar">
        <span class="tts-lbl">🔊 TTS</span>
        <button class="tts-btn" onclick="ttsWord()">▶ Nghe từ</button>
        <button class="tts-btn" onclick="ttsEx()">▶ Nghe ví dụ</button>
        <div class="spd">Tốc độ:
          <button class="spd-btn on" onclick="setSp(0.8,this)">0.8×</button>
          <button class="spd-btn" onclick="setSp(1.0,this)">1×</button>
          <button class="spd-btn" onclick="setSp(1.2,this)">1.2×</button>
        </div>
      </div>

      <div class="fc" id="fc" onclick="flipFC()">
        <button class="fc-speak" onclick="event.stopPropagation();ttsWord()">🔊</button>
        <div class="fc-front">
          <div class="fc-n" id="fc-n">1 / 12</div>
          <div class="fc-word" id="fc-word">—</div>
          <div class="fc-pos" id="fc-pos">—</div>
          <div class="fc-ipa" id="fc-ipa"></div>
          <div class="fc-tap">👆 Nhấn để xem nghĩa</div>
        </div>
        <div class="fc-back">
          <div class="fc-viet" id="fc-viet">—</div>
          <div class="fc-def" id="fc-def">—</div>
          <div class="fc-ex" id="fc-ex">—</div>
        </div>
      </div>
      <div class="fc-nav">
        <button class="nav-btn" id="fc-prev" onclick="fcMv(-1)" disabled>← Trước</button>
        <div class="fc-dots" id="fc-dots"></div>
        <button class="nav-btn" id="fc-next" onclick="fcMv(1)">Tiếp →</button>
      </div>

      <div class="sec">📋 Tất cả từ vựng</div>
      <div class="vl" id="vl"></div>
      <div class="btn-row">
        <button class="btn btn-g" onclick="gS(1)">Làm Quiz →</button>
      </div>
    </div>
  `;

  const stage1Html = `
    <!-- ══ STAGE 1: QUIZ ══ -->
    <div class="stage" id="s1">
      <div class="sec">🎯 Quiz — Chọn nghĩa đúng (12 câu ngẫu nhiên)</div>
      <div id="vq-wrap"></div>
      <div class="btn-row">
        <button class="btn btn-g" id="vq-check" onclick="checkVQ()">Kiểm tra</button>
        <button class="btn btn-gh" onclick="buildVQ()">Làm lại</button>
      </div>
      <div id="vq-out" style="margin-top:10px;font-size:0.88rem;display:none;"></div>
      <div class="next-row" id="vq-next">
        <button class="btn btn-gold" onclick="gS(2)">📰 Đọc bài →</button>
      </div>
    </div>
  `;

  const stage2Html = `
    <!-- ══ STAGE 2: READING ══ -->
    <div class="stage" id="s2">
      <div class="tts-bar">
        <span class="tts-lbl">🔊 Nghe bài đọc</span>
        <button class="tts-btn" id="art-play-btn" onclick="ttsArt()">▶ Đọc toàn bài</button>
        <button class="tts-btn" onclick="ttsStop()">⏹ Dừng</button>
        <div class="spd">Tốc độ:
          <button class="spd-btn on" onclick="setSp(0.8,this)">0.8×</button>
          <button class="spd-btn" onclick="setSp(1.0,this)">1×</button>
          <button class="spd-btn" onclick="setSp(1.2,this)">1.2×</button>
        </div>
        <div class="tts-prog"><div class="tts-prog-fill" id="art-prog"></div></div>
      </div>
      <div class="card">
        <div class="art-kicker">${esc(LESSON_CONFIG.kicker)}</div>
        <div class="art-hl">${esc(LESSON_CONFIG.artHl)}</div>
        <div class="art-body">
          ${LESSON_CONFIG.artHtml || ''}
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" onclick="gS(3)">✏️ Làm bài tập →</button>
        <button class="btn btn-gh" onclick="gS(0)">← Từ vựng</button>
      </div>
    </div>
  `;

  let exerciseContent = `
    <!-- TF -->
    <div class="card">
      <div class="card-hd">
        <div class="badge">01</div>
        <div><div class="card-ttl">True / False</div><div class="card-desc">Đúng hay sai dựa theo bài đọc?</div></div>
      </div>
      <div id="tf-list"></div>
      <div class="btn-row">
        <button class="btn btn-g" onclick="checkTF()">Kiểm tra</button>
        <button class="btn btn-gh" onclick="buildTF()">Làm lại</button>
      </div>
      <div class="next-row" id="tf-next"><button class="btn btn-gold" onclick="scrollTo2('${typeof GF !== 'undefined' ? 'ex-gf' : 'ex-syn'}')">Tiếp →</button></div>
    </div>
  `;

  if (typeof GF !== 'undefined') {
    exerciseContent += `
      <!-- Gap fill -->
      <div class="card" id="ex-gf">
        <div class="card-hd">
          <div class="badge">02</div>
          <div><div class="card-ttl">Gap Fill — Điền từ vào chỗ trống</div><div class="card-desc">Nhấn từ trong ngân hàng để điền</div></div>
        </div>
        <div class="gf-bank" id="gf-bank"></div>
        <div id="gf-text"></div>
        <div class="btn-row">
          <button class="btn btn-g" onclick="checkGF()">Kiểm tra</button>
          <button class="btn btn-gh" onclick="buildGF()">Làm lại</button>
        </div>
        <div class="next-row" id="gf-next"><button class="btn btn-gold" onclick="gS(4)">💬 Thảo luận →</button></div>
      </div>
    `;
  } else if (typeof SYN_DATA !== 'undefined') {
    exerciseContent += `
      <!-- Synonym Match -->
      <div class="card" id="ex-syn">
        <div class="card-hd">
          <div class="badge">02</div>
          <div><div class="card-ttl">Synonym Match — Ghép từ đồng nghĩa</div><div class="card-desc">Chọn từ đồng nghĩa cho mỗi từ in đậm</div></div>
        </div>
        <div class="syn-hint">💡 Mỗi từ bên trái chọn 1 từ đồng nghĩa đúng từ các lựa chọn.</div>
        <div class="ex-hdr">Đã trả lời: <strong id="syn-cur">0</strong>/${SYN_DATA.pairs.length}</div>
        <div id="syn-list"></div>
        <div class="btn-row">
          <button class="btn btn-g" onclick="checkSyn()">Kiểm tra</button>
          <button class="btn btn-gh" onclick="buildSyn()">Làm lại</button>
        </div>
        <div class="next-row" id="syn-next"><button class="btn btn-gold" onclick="gS(4)">💬 Thảo luận →</button></div>
      </div>
    `;
  }

  const stage3Html = `
    <!-- ══ STAGE 3: EXERCISES ══ -->
    <div class="stage" id="s3">
      ${exerciseContent}
    </div>
  `;

  const stage4Html = `
    <!-- ══ STAGE 4: DISCUSSION ══ -->
    <div class="stage" id="s4">
      <div class="card-hd" style="background:var(--light);border-radius:10px;padding:12px 16px;margin-bottom:16px;border:1.5px solid var(--border);">
        <div class="badge ${aiEnabled ? 'ai' : ''}">${aiEnabled ? 'AI' : '💬'}</div>
        <div>
          <div class="card-ttl">Câu hỏi thảo luận</div>
          <div class="card-desc">${aiEnabled ? 'Xem câu trả lời mẫu 📖 · Viết câu trả lời của bạn ✍️ · AI chấm điểm ✨' : 'Suy nghĩ câu trả lời · Nhấn 📖 Mẫu để xem gợi ý · Nhấn 🔊 để nghe'}</div>
        </div>
      </div>

      <div class="sec">CÂU HỎI HIỂU BÀI (theo bài đọc)</div>
      <div id="disc-comp"></div>

      <div class="sec" style="margin-top:20px;">CÂU HỎI MỞ RỘNG</div>
      <div id="disc-open"></div>

      <div class="btn-row" style="margin-top:20px;">
        ${hasAW ? `
          <button class="btn btn-gold" onclick="gS(5)">✍️ AI Writing →</button>
        ` : `
          <button class="btn btn-gold" onclick="showResult()">🏆 Xem kết quả</button>
          <button class="btn btn-gh" onclick="gS(0)">↺ Học lại từ đầu</button>
        `}
      </div>
    </div>
  `;

  let stage5Html = '';
  if (hasAW) {
    stage5Html = `
      <!-- ══ STAGE 5: AI WRITING ══ -->
      <div class="stage" id="s5">
        <div class="card-hd" style="background:var(--light);border-radius:10px;padding:12px 16px;margin-bottom:16px;border:1.5px solid var(--border);">
          <div class="badge ai">✨ AI</div>
          <div>
            <div class="card-ttl">Luyện viết câu — AI chấm bài</div>
            <div class="card-desc">Dịch câu tiếng Việt sang tiếng Anh, AI nhận xét chi tiết bằng tiếng Việt</div>
          </div>
        </div>
        <div id="aw-wrap"></div>
        <div class="next-row" id="aw-done">
          <button class="btn btn-gold" onclick="showResult()">🏆 Xem kết quả</button>
        </div>
      </div>
    `;
  }

  document.body.innerHTML = `
    ${headerHtml}
    <div class="wrap">
      ${stage0Html}
      ${stage1Html}
      ${stage2Html}
      ${stage3Html}
      ${stage4Html}
      ${stage5Html}
    </div>
  `;
}

function initLesson() {
  generateHTML();

  // Set theme dynamic custom variables
  if (LESSON_CONFIG.theme) {
    const root = document.documentElement;
    for (const [key, val] of Object.entries(LESSON_CONFIG.theme)) {
      root.style.setProperty(`--${key}`, val);
    }
  }

  // Set emoji style dynamically
  const emojiStyle = document.createElement('style');
  emojiStyle.textContent = `.hero::after { content: '${LESSON_CONFIG.emoji || "📚"}'; }`;
  document.head.appendChild(emojiStyle);

  // Setup click listeners for tooltips
  document.addEventListener('click', e => {
    const hl = e.target.closest('.hl');
    document.querySelectorAll('.hl.open').forEach(el => { if (el !== hl) el.classList.remove('open'); });
    if (hl && !e.target.closest('.hl-tt-sp')) hl.classList.toggle('open');
  });

  // Dynamic creation of tooltip element inside `.hl` spans if not already present
  document.querySelectorAll('.hl').forEach(hl => {
    if (!hl.querySelector('.hl-tt')) {
      const word = hl.dataset.w || hl.textContent.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      const viet = hl.dataset.viet || '';
      hl.innerHTML = `${hl.textContent.trim()}<span class="hl-tt"><span class="hl-tt-w">${esc(word)}</span>${esc(viet)}<button class="hl-tt-sp" onclick="event.stopPropagation();ttsSay('${esc(word)}')">🔊 Nghe</button></span>`;
    }
  });

  // Initialize all exercises
  buildFC();
  buildVQ();
  buildTF();

  if (typeof GF !== 'undefined') {
    buildGF();
  } else if (typeof SYN_DATA !== 'undefined') {
    buildSyn();
  }

  buildDisc();

  const hasAW = typeof AW_PROMPTS !== 'undefined' && AW_PROMPTS.length > 0;
  if (hasAW) {
    buildAW();
  }
}

// Bind DOMContentLoaded hook to compile the lesson page
window.addEventListener('DOMContentLoaded', initLesson);
