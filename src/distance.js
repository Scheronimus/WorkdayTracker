// Add the entered decimal values without exposing binary floating-point tails.
// Only the displayed total changes; recorded legs retain their original values.
export function totalKilometres(day) {
  const values = [...day.visits.map(visit => visit.kilometres), day.kilometresHome]
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(Number)
  if (!values.length) return null
  if (values.some(value => !Number.isFinite(value))) return values.reduce((sum, value) => sum + value, 0)
  const parts = values.map(value => {
    const [mantissa, exponent = '0'] = String(value).split('e')
    const [integer, fraction = ''] = mantissa.split('.')
    return { digits: BigInt(integer + fraction), scale: fraction.length - Number(exponent) }
  })
  const scale = Math.max(0, ...parts.map(part => part.scale))
  const digits = parts.reduce((sum, part) => sum + part.digits * 10n ** BigInt(scale - part.scale), 0n)
  return Number(`${digits}e-${scale}`)
}
