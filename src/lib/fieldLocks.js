// Per-field locks: which metadata an Excel re-upload is allowed to overwrite.
//
// Background — there are two independent locking mechanisms on a question, and
// they cover disjoint halves of the row:
//
//   content_locked  → the CONTENT half (question text, options, correct_option,
//                     images, question_type). Set automatically whenever an admin
//                     saves the Edit panel. A re-upload skips these columns but
//                     deliberately still re-syncs the metadata half, which is the
//                     whole point of it being separate.
//
//   the five below  → the METADATA half, one lock per field. A re-upload skips
//                     exactly the fields that are pinned and updates the rest
//                     normally, so locking Level leaves Unit still following Excel.
//
// New Q IDs are never affected: locks only exist on rows that are already in the
// DB, so a first insert always takes every value from the sheet.

// field = the questions column the Excel upload writes
// lockCol = the boolean column that pins it
export const LOCKABLE_FIELDS = [
  { field: 'unit',             lockCol: 'unit_locked',       label: 'Unit' },
  { field: 'level',            lockCol: 'level_locked',      label: 'Level' },
  { field: 'difficulty_level', lockCol: 'difficulty_locked', label: 'Difficulty' },
  { field: 'question_tag',     lockCol: 'tag_locked',        label: 'Question Tag' },
  { field: 'source',           lockCol: 'source_locked',     label: 'Source' },
]

export const LOCK_COLUMNS = LOCKABLE_FIELDS.map(f => f.lockCol)

export const LOCK_COL_BY_FIELD = Object.fromEntries(LOCKABLE_FIELDS.map(f => [f.field, f.lockCol]))

// Columns an Excel re-upload must leave alone on this row.
//
// `topic` rides along with unit/level rather than having a lock of its own: it's
// derived from the two via deriveTopic(), but the Excel sheet supplies it as its
// own column, so letting a re-upload rewrite topic while unit/level are pinned
// would leave a row whose topic contradicts its level.
export function lockedColumnsFor(row) {
  const locked = new Set()
  for (const { field, lockCol } of LOCKABLE_FIELDS) {
    if (row?.[lockCol]) locked.add(field)
  }
  if (locked.has('unit') || locked.has('level')) locked.add('topic')
  return locked
}

export function hasAnyFieldLock(row) {
  return LOCK_COLUMNS.some(c => row?.[c])
}

// Short human list of what's pinned on a row, for tooltips. Returns '' when
// nothing is locked.
export function lockSummary(row) {
  const parts = LOCKABLE_FIELDS.filter(f => row?.[f.lockCol]).map(f => f.label)
  if (row?.content_locked) parts.unshift('Question, options & answer')
  if (parts.length === 0) return ''
  return `Protected from Excel re-upload: ${parts.join(', ')}`
}

// Everything a content_locked row still accepts from a sheet. Anything not
// listed is content, and stays as the admin left it.
const METADATA_FIELDS = ['subject', 'unit', 'chapter_name', 'topic', 'level',
                         'difficulty_level', 'question_tag', 'source', 'uploaded_by']

/**
 * Decides what an Excel upload is allowed to write, row by row.
 *
 * @param records     rows built from the sheet, each including its qid
 * @param lockByQid   Map<qid, lockRow> for the Q IDs that ALREADY exist in the
 *                    DB; a qid absent from the map is a new question, which
 *                    always inserts in full — locks only guard existing rows.
 * @returns {
 *   fullRecords,    // nothing locked → batch upsert, the fast common path
 *   partialUpdates, // [{ qid, fields }] → per-row UPDATE of what's still allowed
 *   skippedQids,    // every column this sheet would write is pinned
 *   contentLockedCount,
 *   fieldLockCounts // { 'Level': 2, ... } for the summary toast
 * }
 *
 * No lock column ever appears in a payload — records are built purely from
 * sheet cells — so honouring a lock can never also clear it.
 */
export function planLockedUpload(records, lockByQid) {
  const fullRecords = []
  const partialUpdates = []
  const skippedQids = []
  let contentLockedCount = 0
  const fieldLockCounts = Object.fromEntries(LOCKABLE_FIELDS.map(f => [f.label, 0]))

  for (const record of records) {
    const lockRow = lockByQid.get(record.qid)
    const lockedCols = lockedColumnsFor(lockRow)
    if (!lockRow?.content_locked && lockedCols.size === 0) {
      fullRecords.push(record)
      continue
    }
    if (lockRow.content_locked) contentLockedCount++
    for (const f of LOCKABLE_FIELDS) if (lockRow[f.lockCol]) fieldLockCounts[f.label]++

    const { qid, ...fields } = record
    let allowed = Object.entries(fields)
    if (lockRow.content_locked) allowed = allowed.filter(([k]) => METADATA_FIELDS.includes(k))
    allowed = allowed.filter(([k]) => !lockedCols.has(k))
    if (allowed.length === 0) { skippedQids.push(qid); continue }
    partialUpdates.push({ qid, fields: Object.fromEntries(allowed) })
  }

  return { fullRecords, partialUpdates, skippedQids, contentLockedCount, fieldLockCounts }
}
