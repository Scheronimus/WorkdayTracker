export default function Icon({ name, className = '' }) {
  const paths = {
    note: <path d="m15 5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>
}
