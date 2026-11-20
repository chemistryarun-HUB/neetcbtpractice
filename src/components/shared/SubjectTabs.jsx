export const TAB_SUBJECTS = ['Chemistry', 'Physics', 'Biology']

// All / Chemistry / Physics / Biology, each with how many things are under it.
// `counts` is keyed by subject, plus `all`; `labels` overrides the names (Gujarati).
export default function SubjectTabs({ value, onChange, counts, labels = {}, allLabel = 'All' }) {
  const tabs = [['all', allLabel], ...TAB_SUBJECTS.map(s => [s, labels[s] || s])]
  return (
    <div className="perf-subjects" role="tablist" aria-label="Subject">
      {tabs.map(([key, label]) => (
        <button key={key} role="tab" aria-selected={value === key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>
          {label} <span>{counts[key] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}
