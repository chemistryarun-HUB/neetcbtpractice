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

// The write-side counterpart of correctOptionKey(): given which option is
// correct and the bank's four option TEXTS (not entries — callers may be
// working from unsaved form state that has no image URLs yet), decide what to
// store in correct_option.
//
// An option's own text is fine to store UNLESS it's empty (image-only option,
// nothing to match against) or shared by more than one option — the classic
// case being every option reading the literal placeholder "Image" because the
// source book's figures couldn't be transcribed. Storing shared text would
// make correctOptionKey()'s lookup ambiguous: `entries.find(text === stored)`
// always returns the FIRST option with that text, not necessarily the one
// meant. The positional sentinel ('option1'..'option4') sidesteps ambiguity
// entirely, which is why it exists.
//
// Single source of truth for this rule — the Excel importer and the manual
// edit panel both need it, and diverging here is exactly how the edit panel
// ended up silently defaulting every image-only question to "option1 is
// correct" while the importer got it right.
export function resolveCorrectOptionValue(key, optionTexts) {
  const idx = Number(String(key).replace('option', '')) - 1
  const text = optionTexts[idx]
  const isAmbiguous = text && optionTexts.filter(o => o === text).length > 1
  return (!text || isAmbiguous) ? key : text
}
