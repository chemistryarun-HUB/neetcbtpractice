import { ImagePlus } from 'lucide-react'

// "Attach image" button that opens the file picker and hands back one file.
export default function ImageButton({ label, onFile }) {
  return (
    <label className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
      <ImagePlus size={14} /> {label}
      <input type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f) }} />
    </label>
  )
}
