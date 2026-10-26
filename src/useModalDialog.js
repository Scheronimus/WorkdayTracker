import { useEffect } from 'react'

// Native modal dialogs make the rest of the document inert. Keep them inside
// the visible viewport when a phone keyboard opens and restore the opener.
export default function useModalDialog(ref) {
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    const viewport = window.visualViewport
    function updateViewport() {
      dialog.style.setProperty('--viewport-height', `${viewport?.height ?? window.innerHeight}px`)
      dialog.style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`)
    }
    function containTab(event) {
      if (event.key !== 'Tab') return
      const controls = [...dialog.querySelectorAll('button, input, textarea, select, summary, [href], [tabindex]')]
        .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length)
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    updateViewport()
    dialog.showModal()
    dialog.querySelector('[data-primary-focus]')?.focus()
    document.body.style.overflow = 'hidden'
    dialog.addEventListener('keydown', containTab)
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)
    return () => {
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
      dialog.removeEventListener('keydown', containTab)
      dialog.close()
      document.body.style.overflow = previousOverflow
      const target = opener?.isConnected ? opener : document.querySelector('.action-dock button, .completed-day-actions .primary, .bottom-nav button.active')
      target?.focus({ preventScroll: true })
    }
  }, [ref])
}
