// Read-only: what the student Chapter-wise view sees per subject.
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
for (const subject of ['physics', 'chemistry', 'biology']) {
  const { data: papers } = await sb.from('gseb_papers').select('id, year, session, is_published').eq('subject', subject).eq('is_published', true)
  const ids = papers.map(p => p.id)
  for (const t of ['gseb_questions', 'gseb_subjective']) {
    const r = await sb.from(t).select('id, chapter_no, paper_id', { count: 'exact' }).in('paper_id', ids).order('id').range(0, 999)
    const c = {}; let none = 0
    for (const q of r.data || []) { if (q.chapter_no == null) none++; else c[q.chapter_no] = (c[q.chapter_no] || 0) + 1 }
    const perPaper = {}; for (const q of r.data || []) perPaper[q.paper_id] = (perPaper[q.paper_id] || 0) + 1
    console.log(subject, t, 'papers', papers.length, 'rows', r.data?.length, 'count', r.count, 'err', r.error?.message, 'noChapter', none, 'type', typeof r.data?.[0]?.chapter_no, JSON.stringify(c))
    console.log('   per paper', JSON.stringify(papers.map(p => `${p.year}${p.session[0]}:${perPaper[p.id] || 0}`)))
  }
}
