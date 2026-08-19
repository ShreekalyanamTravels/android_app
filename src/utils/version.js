// Simple dotted-numeric version compare ("1.2.0" vs "1.10.0") — no need for a full semver lib
// since app.json versions are always plain "major.minor.patch".
export function isVersionBelow(current, min) {
  if (!current || !min) return false

  const a = String(current).split('.').map(Number)
  const b = String(min).split('.').map(Number)

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0
    const y = b[i] || 0
    if (x < y) return true
    if (x > y) return false
  }
  return false
}
