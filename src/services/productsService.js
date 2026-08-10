import { apiFetch } from './apiClient'

// Public — GET /products. Each product carries its own `status` (active/inactive) and
// `availability` (live/coming_soon), set independently — an active product can still be
// coming_soon. Omit `status` to get every product regardless of status.
export async function listProducts(status) {
  const qs = status ? `?status=${status}` : ''
  const data = await apiFetch(`/products${qs}`)
  return data.products
}
