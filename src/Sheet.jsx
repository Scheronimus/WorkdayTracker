import { useRef } from 'react'
import useModalDialog from './useModalDialog'

export default function Sheet({ titleId, className = '', onClose, children }) {
  const dialog = useRef(null)
  useModalDialog(dialog)
  return <dialog ref={dialog} className="sheet-backdrop" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className={`customer-sheet ${className}`}>
      <div className="sheet-handle" aria-hidden="true" />
      {children}
    </div>
  </dialog>
}
