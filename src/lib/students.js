// Student profile options shared by the admin and faculty screens.

export const CLASSES = ['Class 11', 'Class 12', 'Class 13 (Repeater)']

// The exam a student is preparing for. Practice content is the same NEET
// level-wise course for now; the exam is stored so batches can be filtered
// and reports show "JEE 2027" instead of "NEET 2027".
export const EXAMS = ['NEET', 'JEE']

// Target years on offer: this year's exam until it is over (both NEET and
// JEE Main finish by May), then the next four years.
export function targetYears(now = new Date()) {
  const first = now.getFullYear() + (now.getMonth() >= 5 ? 1 : 0)
  return [0, 1, 2, 3].map(i => String(first + i))
}

// Options for a year dropdown, keeping a student's older year selectable.
export function yearOptions(current) {
  const years = targetYears()
  return current && !years.includes(current) ? [current, ...years] : years
}

export const examOf = s => (s?.exam === 'JEE' ? 'JEE' : 'NEET')

// "NEET 2027", or just "NEET" when no year is set.
export function examTarget(s) {
  return s?.neet_year ? `${examOf(s)} ${s.neet_year}` : examOf(s)
}
