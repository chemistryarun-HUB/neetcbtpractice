// The report as HTML.
//
// The PDF is produced by photographing this markup (reportPdf.js), rather than
// drawing shapes by hand, for two reasons: the browser's text engine shapes
// Devanagari and Gujarati correctly — matras and conjuncts in the right order,
// which a PDF library that only maps characters to glyphs cannot do — and CSS
// gives gradients, rounded cards and soft shadows that would be painful to
// draw primitive by primitive.
import { t } from './reportI18n'

const A4_W = 794   // A4 width at 96dpi, the canvas this is photographed at
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const TONE = {
  complete:     { bg: '#ecfdf5', fg: '#047857', bar: '#10b981', ring: '#a7f3d0' },
  'on-track':   { bg: '#eff6ff', fg: '#1d4ed8', bar: '#3b82f6', ring: '#bfdbfe' },
  stuck:        { bg: '#fff7ed', fg: '#c2410c', bar: '#f97316', ring: '#fed7aa' },
  paused:       { bg: '#fefce8', fg: '#a16207', bar: '#eab308', ring: '#fde68a' },
  'not-started':{ bg: '#fef2f2', fg: '#b91c1c', bar: '#ef4444', ring: '#fecaca' },
}

export function buildReportHtml(model, lang = 'en') {
  const L = t(lang)
  const s = model.summary
  const tone = TONE[model.status] || TONE['on-track']
  const pct = n => `${Math.round(n)}%`
  const ringPct = s.ladderTotal > 0 ? Math.round((s.levelsCleared / s.ladderTotal) * 100) : 0

  const levelRows = model.levels.map(l => {
    const cleared = l.state === 'cleared'
    const tried = l.state === 'attempted'
    const c = cleared ? '#10b981' : tried ? '#f97316' : '#cbd5e1'
    const mark = cleared ? '✓' : tried ? '!' : '·'
    const phrase = L.levelState[l.state](L, l)
    const cov = (l.seen != null && l.total > 0) ? L.qsOf(l.seen, l.total) : ''
    return `
      <div class="lvl" style="border-left-color:${c}">
        <div class="lvl-mark" style="background:${cleared ? c : '#fff'};border-color:${c};color:${cleared ? '#fff' : c}">${mark}</div>
        <div class="lvl-badge">${esc(l.badge)}</div>
        <div class="lvl-name">${esc(l.name)}</div>
        <div class="lvl-state" style="color:${cleared ? '#047857' : tried ? '#c2410c' : '#94a3b8'}">${esc(phrase)}</div>
        <div class="lvl-cov">${esc(cov)}</div>
      </div>`
  }).join('')

  // No cleared/not-cleared verdict here on purpose: the Complete Chapter Test
  // is open from day one, so there is no gate to pass and calling it "not
  // cleared" would invent a failure. Coverage is the honest measure.
  const cctBlock = model.cct ? `
    <div class="cct">
      <div class="cct-left">
        <div class="cct-title">${esc(L.cctTitle)}</div>
        <div class="cct-sub">${esc(L.cctSub(model.unit.levelCount))}</div>
      </div>
      <div class="cct-qs">${esc(model.cct.total > 0 ? L.cctQs(model.cct.seen ?? 0, model.cct.total) : '—')}</div>
    </div>` : ''

  const supportItems = L.support(model.scheme).map((txt, i) => `
    <li><span class="sup-n">${i + 1}</span><span>${esc(txt)}</span></li>`).join('')

  const howItems = L.how(model.scheme, model.unit.levelCount).map(txt => `<li>${esc(txt)}</li>`).join('')

  const meta = [model.student.class, model.student.neet_year ? `NEET ${model.student.neet_year}` : null]
    .filter(Boolean).join(' · ')

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${A4_W}px;font-family:${L.fontStack};color:#0f172a;background:#fff;-webkit-font-smoothing:antialiased}
  .page{padding:0 0 26px}
  .hero{background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#4f46e5 100%);color:#fff;padding:26px 34px 30px;position:relative;overflow:hidden}
  .hero:after{content:'';position:absolute;right:-70px;top:-70px;width:230px;height:230px;border-radius:50%;background:rgba(255,255,255,.08)}
  .hero:before{content:'';position:absolute;right:40px;bottom:-90px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.06)}
  .brand{font-size:11px;letter-spacing:.09em;text-transform:uppercase;opacity:.85;font-weight:600}
  .title{font-size:27px;font-weight:800;margin-top:7px;letter-spacing:-.4px}
  .hero-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;position:relative;z-index:2;gap:20px}
  .who{font-size:21px;font-weight:800}
  .who-meta{font-size:12.5px;opacity:.9;margin-top:3px}
  .chap{text-align:right;max-width:360px}
  .chap-name{font-size:14.5px;font-weight:700;line-height:1.32}
  .chap-sub{font-size:11.5px;opacity:.88;margin-top:4px}
  .date{font-size:11.5px;opacity:.85;margin-top:5px}

  .verdict{margin:-16px 24px 0;background:${tone.bg};border:1.5px solid ${tone.ring};border-radius:14px;padding:16px 18px;display:flex;gap:14px;align-items:flex-start;position:relative;z-index:3;box-shadow:0 6px 18px rgba(15,23,42,.07)}
  .pill{background:${tone.bar};color:#fff;font-size:11px;font-weight:800;padding:5px 11px;border-radius:999px;white-space:nowrap;letter-spacing:.02em}
  .verdict p{font-size:14px;line-height:1.55;color:${tone.fg};font-weight:600}

  .tiles{display:flex;gap:11px;margin:18px 24px 0}
  .tile{flex:1;background:#f8fafc;border:1.5px solid #e8eef6;border-radius:13px;padding:13px 8px;text-align:center}
  .tile b{display:block;font-size:20px;font-weight:800;color:#1d4ed8;line-height:1.15}
  .tile b.sm{font-size:14px;padding-top:3px}
  .tile span{display:block;font-size:10.5px;color:#64748b;margin-top:5px;font-weight:500}

  .ring-wrap{display:flex;align-items:center;gap:13px;margin:16px 24px 0;background:linear-gradient(90deg,#f8fafc,#fff);border:1.5px solid #e8eef6;border-radius:13px;padding:13px 16px}
  .ring{width:52px;height:52px;border-radius:50%;flex-shrink:0;background:conic-gradient(${tone.bar} ${ringPct * 3.6}deg,#e8eef6 0);display:flex;align-items:center;justify-content:center}
  .ring i{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:12.5px;font-weight:800;color:${tone.fg}}
  .ring-txt{font-size:12.5px;color:#475569;line-height:1.5}

  h2{font-size:14px;font-weight:800;margin:22px 24px 0;color:#0f172a;display:flex;align-items:center;gap:8px}
  h2:before{content:'';width:4px;height:15px;border-radius:2px;background:${tone.bar}}
  .intro{font-size:11.5px;color:#64748b;line-height:1.6;margin:8px 24px 0}

  .levels{margin:11px 24px 0;display:flex;flex-direction:column;gap:5px}
  .lvl{display:flex;align-items:center;gap:9px;background:#fff;border:1.5px solid #eef2f7;border-left-width:4px;border-radius:9px;padding:8px 12px}
  .lvl-mark{width:17px;height:17px;border-radius:50%;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
  .lvl-badge{font-size:11.5px;font-weight:800;color:#0f172a;width:52px;flex-shrink:0}
  .lvl-name{font-size:11.5px;color:#475569;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .lvl-state{font-size:11.5px;font-weight:700;width:188px;flex-shrink:0}
  .lvl-cov{font-size:10.5px;color:#94a3b8;width:118px;text-align:right;flex-shrink:0}

  .cct{margin:9px 24px 0;display:flex;justify-content:space-between;align-items:center;gap:14px;background:linear-gradient(90deg,#f5f3ff,#eef2ff);border:1.5px solid #ddd6fe;border-radius:11px;padding:11px 14px}
  .cct-title{font-size:12.5px;font-weight:800;color:#4c1d95}
  .cct-sub{font-size:10.5px;color:#6d28d9;margin-top:2px;opacity:.9}
  .cct-qs{font-size:12px;font-weight:800;color:#5b21b6;white-space:nowrap}

  .support{margin:11px 24px 0;background:linear-gradient(135deg,#ecfeff,#f0fdfa);border:1.5px solid #a5f3fc;border-radius:13px;padding:15px 17px}
  .support ul{list-style:none;display:flex;flex-direction:column;gap:9px}
  .support li{display:flex;gap:10px;font-size:12px;line-height:1.55;color:#134e4a}
  .sup-n{width:19px;height:19px;border-radius:50%;background:#0891b2;color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}

  .how{margin:14px 24px 0;background:#f8fafc;border:1.5px solid #e8eef6;border-radius:11px;padding:13px 16px}
  .how h3{font-size:11.5px;font-weight:800;color:#334155;margin-bottom:7px}
  .how ul{list-style:none;display:flex;flex-direction:column;gap:6px}
  .how li{font-size:10.5px;line-height:1.6;color:#64748b;padding-left:12px;position:relative}
  .how li:before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:#cbd5e1}

  .foot{margin:16px 24px 0;padding-top:11px;border-top:1.5px dashed #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  </style></head><body><div class="page">

  <div class="hero">
    <div class="brand">${esc(L.brand)}</div>
    <div class="title">${esc(L.reportTitle)}</div>
    <div class="hero-row">
      <div>
        <div class="who">${esc(model.student.name || '—')}</div>
        ${meta ? `<div class="who-meta">${esc(meta)}</div>` : ''}
      </div>
      <div class="chap">
        <div class="chap-name">${esc(model.unit.label)}</div>
        <div class="chap-sub">${esc(L.levelsLine(model.unit.levelCount))}</div>
        <div class="date">${esc(model.generatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))}</div>
      </div>
    </div>
  </div>

  <div class="verdict">
    <span class="pill">${esc(L.status[model.status])}</span>
    <p>${esc(L.headline(model))}</p>
  </div>

  <div class="tiles">
    <div class="tile"><b>${s.levelsCleared} / ${s.ladderTotal}</b><span>${esc(L.tiles.cleared)}</span></div>
    <div class="tile"><b>${s.questionsPractised}</b><span>${esc(L.tiles.questions)}</span></div>
    <div class="tile"><b>${pct(s.accuracy)}</b><span>${esc(L.tiles.accuracy)}</span></div>
    <div class="tile"><b class="sm">${esc(L.ago(s.lastActiveDays))}</b><span>${esc(L.tiles.last)}</span></div>
  </div>

  <div class="ring-wrap">
    <div class="ring"><i>${ringPct}%</i></div>
    <div class="ring-txt">${esc(
      s.classAccuracy != null && s.attempts > 0
        ? L.classAvg(s.accuracy, s.classAccuracy)
        : L.levelsLine(model.unit.levelCount),
    )}</div>
  </div>

  <h2>${esc(L.levelByLevel)}</h2>
  <div class="intro">${esc(L.levelIntro(model.unit.levelCount))}</div>
  <div class="levels">${levelRows}</div>
  ${cctBlock}

  <h2>${esc(L.supportTitle)}</h2>
  <div class="support"><ul>${supportItems}</ul></div>

  <div class="how">
    <h3>${esc(L.howTitle)}</h3>
    <ul>${howItems}</ul>
  </div>

  <div class="foot"><span>${esc(L.brand)}</span><span>${esc(model.student.name || '')}</span></div>
  </div></body></html>`
}

export const REPORT_WIDTH_PX = A4_W
