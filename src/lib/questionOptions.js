// Resolves which of a question's 4 options is correct. Normally correct_option
// stores the exact text of the correct option, but that breaks down for
// image-only options (no text to match against) — for those, correct_option
// instead stores the literal sentinel 'option1'..'option4'. This keeps both
// forms working through one lookup instead of scattering `opt === correct_option`
// text comparisons (which silently match ALL options when every option's text
// is '').
export function optionEntries(q) {
  return [1, 2, 3, 4].map(n => ({
    key: `option${n}`,
    text: q[`option${n}`] || '',
    image: q[`option${n}_image`] || null,
  }))
}

export function correctOptionKey(q) {
  const entries = optionEntries(q)
  const byText = entries.find(e => e.text !== '' && e.text === q.correct_option)
  if (byText) return byText.key
  const bySentinel = entries.find(e => e.key === q.correct_option)
  if (bySentinel) return bySentinel.key
  return null
}
