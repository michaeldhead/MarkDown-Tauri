import { useEffect } from 'react'
import { Clipboard, Download, FileText } from 'lucide-react'

type ExportDialogProps = {
  isOpen: boolean
  onClose: () => void
  fileName: string
  onExportHtmlStyled: () => void
  onExportHtmlClean: () => void
  onExportDocx: () => void
  onExportPdf: () => void
  onExportText: () => void
  onCopyMarkdown: () => void
}

type RowProps = {
  Icon: typeof Download
  label: string
  sublabel: string
  onClick: () => void
}

function Row({ Icon, label, sublabel, onClick }: RowProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className="w-full flex items-center text-left transition-colors hover:cursor-pointer"
      style={{
        gap: 10,
        padding: '10px 12px',
        borderRadius: 6,
        background: 'transparent',
        border: 'none',
        color: 'var(--text-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <Icon size={15} strokeWidth={1.75} color="var(--accent)" />
      <span className="flex-1" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sublabel}</span>
    </button>
  )
}

export default function ExportDialog({
  isOpen,
  onClose,
  fileName,
  onExportHtmlStyled,
  onExportHtmlClean,
  onExportDocx,
  onExportPdf,
  onExportText,
  onCopyMarkdown,
}: ExportDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const run = (fn: () => void) => () => {
    onClose()
    queueMicrotask(fn)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export Document"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 380,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          Export Document
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: '1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={fileName}
        >
          {fileName}
        </div>

        <Row
          Icon={Download}
          label="HTML — Styled"
          sublabel="with CSS"
          onClick={run(onExportHtmlStyled)}
        />
        <Row
          Icon={Download}
          label="HTML — Clean"
          sublabel="raw HTML"
          onClick={run(onExportHtmlClean)}
        />
        <Row
          Icon={FileText}
          label="Word Document"
          sublabel=".docx"
          onClick={run(onExportDocx)}
        />
        <Row
          Icon={Download}
          label="PDF"
          sublabel="print dialog"
          onClick={run(onExportPdf)}
        />
        <Row
          Icon={Download}
          label="Plain Text"
          sublabel=".txt"
          onClick={run(onExportText)}
        />

        <div
          style={{
            borderTop: '1px solid var(--border)',
            margin: '6px 0',
          }}
        />

        <Row
          Icon={Clipboard}
          label="Copy Markdown to Clipboard"
          sublabel=""
          onClick={run(onCopyMarkdown)}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              border: 'none',
              fontSize: 12,
              padding: '4px 8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
