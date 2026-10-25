import { useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import { Download, X } from 'lucide-react'
import { paperTitle } from '../../lib/gseb'

// "PDF" button for one GSEB paper and its small dialog: which parts, answer
// key or not, then the download with page progress. The PDF code (jsPDF,
// html2canvas) loads only when someone actually downloads.
//
// mcq / subjective can be passed when the page already has them (admin);
// otherwise they are fetched. The counts fall back to the paper row.
export default function GsebPdfButton({ paper, mcq, subjective, className = 'btn btn-outline btn-sm', label = 'PDF' }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState({ partA: true, partB: true, withKey: false })
  const [busy, setBusy] = useState(null)
  const nA = mcq?.length ?? paper.mcq_count ?? 0
  const nB = subjective?.length ?? paper.gseb_subjective?.[0]?.count ?? 0
  const partB = opts.partB && nB > 0
  const toggle = k => setOpts(o => ({ ...o, [k]: !o[k] }))

  async function download() {
    setBusy('Preparing…')
    try {
      const { downloadGsebPaperPdf } = await import('../../lib/gsebPaperPdf')
      await downloadGsebPaperPdf(paper, { ...opts, partB, mcq, subjective, onProgress: (d, t) => setBusy(`Page ${d} of ${t}…`) })
      toast.success('PDF downloaded')
      setOpen(false)
    } catch (err) {
      toast.error(err.message || 'Could not make the PDF')
    }
    setBusy(null)
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} title="Download as PDF">
        <Download size={14} /> {label}
      </button>
      {/* On document.body: a card's hover transform would otherwise trap the fixed overlay inside it. */}
      {open && createPortal(
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              Download PDF
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={!!busy} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ fontWeight: 700, marginBottom: '0.85rem' }}>{paperTitle(paper)}</div>
              <label className="pdf-opt">
                <input type="checkbox" checked={opts.partA} onChange={() => toggle('partA')} disabled={!nA} />
                <span><b>Part A</b> · {nA} MCQs</span>
              </label>
              <label className={`pdf-opt${nB ? '' : ' off'}`}>
                <input type="checkbox" checked={partB} onChange={() => toggle('partB')} disabled={!nB} />
                <span><b>Part B</b> · {nB ? `${nB} written questions` : 'not added yet'}</span>
              </label>
              <label className="pdf-opt">
                <input type="checkbox" checked={opts.withKey} onChange={() => toggle('withKey')} />
                <span><b>Answer key</b> on the last page</span>
              </label>
              <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
                A4 pages in two columns, like the printed board paper. Ready to print or keep on your phone.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={!!busy}>Cancel</button>
              <button className="btn btn-primary" onClick={download} disabled={!!busy || (!opts.partA && !partB)}>
                {busy ? <span className="spinner spinner-sm" /> : <Download size={16} />} {busy || 'Download PDF'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
