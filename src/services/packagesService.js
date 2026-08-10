import { PACKAGES, TOUR_THEMES } from '../data/packagesData'

export async function listPackages({ theme } = {}) {
  const results = theme ? PACKAGES.filter(p => p.theme === theme) : PACKAGES
  return Promise.resolve(results)
}

export async function getPackageById(id) {
  return Promise.resolve(PACKAGES.find(p => p.id === id) || null)
}

export async function listThemes() {
  return Promise.resolve(TOUR_THEMES)
}
