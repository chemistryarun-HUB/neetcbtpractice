// The strip under a test's question palette: what the palette's colours mean, plus
// the keyboard shortcuts on screens big enough to have a keyboard.
export default function TestLegend({ t, submitOnLast = false }) {
  return (
    <div className="tp-legend">
      <span><i className="tp-swatch" /> {t.notAnswered}</span>
      <span><i className="tp-swatch done" /> {t.answered}</span>
      <span><i className="tp-swatch current" /> {t.currentQuestion}</span>
      {submitOnLast && <span className="tp-legend-note">{t.submitOnLast}</span>}
      <span className="tp-legend-keys"><kbd>←</kbd> <kbd>→</kbd> {t.hintNav}</span>
      <span className="tp-legend-keys"><kbd>1</kbd>–<kbd>4</kbd> {t.hintChoose}</span>
      <span className="tp-legend-keys"><kbd>Backspace</kbd> {t.hintClear}</span>
    </div>
  )
}
