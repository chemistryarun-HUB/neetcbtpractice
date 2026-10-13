import { optionEntries, correctOptionKey } from '../../lib/questionOptions'

const LETTERS = ['A', 'B', 'C', 'D']

/**
 * A GSEB question sheet laid out for paper: header, a Section A of MCQs,
 * then one section per group of written questions, and an optional answer
 * key that starts on a new page. Shown on screen as a preview; the browser's
 * Print dialog turns it into a PDF ("Save as PDF").
 *
 * Used by the paper generator and by the "Download PDF" of questions picked
 * on a paper's admin page.
 *
 * - mcq: MCQ rows (gseb_questions)
 * - groups: [{ key, heading, label, items }] of written rows (gseb_subjective);
 *   numbering runs on across groups, label names the group in the key
 * - tag(q): small grey note after a question, e.g. "(March 2025)"
 * - extra(q, kind, groupKey): on-screen-only controls after a question
 */
export default function GsebPrintSheet({ title, subtitle, meta = [], mcq = [], groups = [], withKey, tag, extra }) {
  let n = 0
  const shownGroups = groups.filter(g => g.items.length).map(g => {
    const start = n + 1
    n += g.items.length
    return { ...g, start }
  })
  return (
    <div className="gseb-print">
      <div className="gp-head">
        <div className="gp-title">{title}</div>
        {subtitle && <div>{subtitle}</div>}
        {meta.length > 0 && <div className="gp-meta">{meta.map(m => <span key={m}>{m}</span>)}</div>}
      </div>

      {mcq.length > 0 && (
        <section>
          <div className="gp-section">Section A · Choose the correct option ({mcq.length} × 1 = {mcq.length} marks)</div>
          <ol className="gp-list">
            {mcq.map(q => (
              <li key={q.id}>
                <div className="gp-q">{q.question}{' '}{tag?.(q)}{extra?.(q, 'mcq')}</div>
                {q.question_image && <img src={q.question_image} alt="" className="gp-img" />}
                <div className="gp-opts">
                  {optionEntries(q).map((o, i) => (
                    <div key={o.key}>({LETTERS[i]}) {o.text}{o.image && <img src={o.image} alt="" className="gp-img" />}</div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {shownGroups.map(g => (
        <section key={g.key}>
          <div className="gp-section">{g.heading}</div>
          <ol className="gp-list" start={g.start}>
            {g.items.map(q => (
              <li key={q.id}>
                <div className="gp-q">{q.question}{' '}{tag?.(q)}{extra?.(q, 'sub', g.key)}</div>
                {q.question_image && <img src={q.question_image} alt="" className="gp-img" />}
              </li>
            ))}
          </ol>
        </section>
      ))}

      {withKey && (
        <section className="gp-key">
          <div className="gp-title" style={{ fontSize: '1.1rem' }}>Answer key · {title}</div>
          {mcq.length > 0 && (
            <div className="gp-keygrid">
              {mcq.map((q, i) => {
                const k = correctOptionKey(q)
                return <span key={q.id}>{i + 1}. {k ? LETTERS[Number(k.slice(-1)) - 1] : '?'}</span>
              })}
            </div>
          )}
          {shownGroups.map(g => g.items.some(q => q.answer || q.answer_image) && (
            <div key={g.key}>
              <div className="gp-section">{g.label || g.heading.split(' · ')[0]} · model answers</div>
              <ol className="gp-list" start={g.start}>
                {g.items.map(q => (
                  <li key={q.id}>
                    {q.answer || <em>No model answer added.</em>}
                    {q.answer_image && <img src={q.answer_image} alt="" className="gp-img" />}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
