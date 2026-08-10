import { ITINERARIES, buildItineraryFromPackage } from '../data/itinerariesData'
import { getPackageById } from './packagesService'

const draftItineraries = new Map()

export async function getItineraryById(id) {
  const seeded = ITINERARIES.find(it => it.id === id)
  if (seeded) return Promise.resolve(seeded)
  if (draftItineraries.has(id)) return Promise.resolve(draftItineraries.get(id))
  return Promise.resolve(null)
}

export async function createItineraryFromPackage(packageId, options) {
  const pkg = await getPackageById(packageId)
  if (!pkg) return Promise.resolve(null)
  const itinerary = buildItineraryFromPackage(pkg, options)
  draftItineraries.set(itinerary.id, itinerary)
  return Promise.resolve(itinerary)
}
