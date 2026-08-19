import { useState } from 'react'
import { Image } from 'react-native'

// Renders the remote branding logo from /app-config when available, falling back to the bundled
// local asset if no remote URL is set yet (config still loading / never fetched) or the image
// fails to load (offline, URL not deployed yet, etc) — mirrors AirlineLogo's fallback pattern.
export default function BrandLogo({ uri, style, resizeMode = 'contain' }) {
  const [failed, setFailed] = useState(false)
  const source = uri && !failed ? { uri } : require('../../assets/logo.png')
  return <Image source={source} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />
}
