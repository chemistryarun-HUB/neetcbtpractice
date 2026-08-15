import { supabase } from './supabase'

// Uploads one image to the public `question-images` bucket and returns its
// public URL. Shared by every surface that attaches an image to a question
// (Add Manually, the edit panel) so the path/naming scheme stays in one place.
export async function uploadQuestionImage(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: false })
  if (error) throw new Error(`Image upload failed: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(path)
  return publicUrl
}
