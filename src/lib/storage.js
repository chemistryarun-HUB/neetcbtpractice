import { supabase } from './supabase'

// Uploads one image to the public `question-images` bucket and returns its
// public URL. Shared by every surface that attaches an image to a question
// (Add Manually, the edit panel) so the path/naming scheme stays in one place.
/**
 * Uploads a generated parent report and returns its public URL.
 *
 * The path carries a random UUID because the bucket is public — see
 * migration_student_reports_bucket.sql for why it's public and what that
 * means. Reports are never overwritten (each send is its own file), so an
 * older link a parent already has keeps working after a newer report is sent.
 */
export async function uploadStudentReport(blob, studentId, fileName) {
  const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const path = `${studentId}/${id}/${fileName}`
  const { error } = await supabase.storage.from('student-reports')
    .upload(path, blob, { contentType: 'application/pdf', upsert: false })
  if (error) throw new Error(`Could not upload the report: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from('student-reports').getPublicUrl(path)
  return publicUrl
}

export async function uploadQuestionImage(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: false })
  if (error) throw new Error(`Image upload failed: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(path)
  return publicUrl
}
