import type { LibraryItem } from '../db/types'

/** A place found by search or read from a Google Maps link. */
export type PlaceResult = {
  kind: 'place'
  title: string
  /** "İstanbul, Türkiye" */
  creator?: string
  latitude: number
  longitude: number
  posterUrl?: string
  source: 'osm' | 'google-link'
  externalId?: string
  /** Wikipedia article as OpenStreetMap tags it, e.g. "tr:Galata Kulesi"; used for a photo. */
  wikipedia?: string
}

type Json = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** "İstanbul, Türkiye" from an OpenStreetMap address. */
export function placeArea(address: unknown): string | undefined {
  if (typeof address !== 'object' || address === null) return undefined
  const a = address as Json
  // The province reads better than a district: "İstanbul" rather than "Beyoğlu".
  const city = str(a.city) ?? str(a.province) ?? str(a.state) ?? str(a.town) ?? str(a.village)
  return [city, str(a.country)].filter(Boolean).join(', ') || undefined
}

export function fromNominatim(json: unknown): PlaceResult[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((r: Json) => {
    const latitude = Number(r.lat)
    const longitude = Number(r.lon)
    const title = str(r.name) ?? str(r.display_name)?.split(',')[0]
    if (!title || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
    const tags = (r.extratags ?? {}) as Json
    return [
      {
        kind: 'place' as const,
        title,
        creator: placeArea(r.address),
        latitude,
        longitude,
        source: 'osm' as const,
        externalId: r.osm_type && r.osm_id ? `${r.osm_type}/${r.osm_id}` : undefined,
        wikipedia: str(tags.wikipedia),
      },
    ]
  })
}

/**
 * Name and position from a Google Maps link copied from the address bar, e.g.
 * …/maps/place/Galata+Kulesi/@41.0256,28.9741,17z/…!3d41.0256!4d28.9742…
 * Short share links (maps.app.goo.gl) only redirect there and can't be read from the app.
 */
export function parseGoogleMapsUrl(text: string): { title?: string; latitude: number; longitude: number } | undefined {
  const url = text.trim()
  if (!/google\.[a-z.]+\/maps|maps\.google\./i.test(url)) return undefined
  const name = url.match(/\/maps\/place\/([^/@?]+)/)?.[1]
  let title: string | undefined
  if (name) {
    try {
      title = decodeURIComponent(name.replace(/\+/g, ' ')).trim() || undefined
    } catch {
      title = undefined
    }
  }
  // The place's own pin (!3d!4d) is more exact than the map's centre (@lat,lng).
  const pin = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  const centre = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  const query = url.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  const match = pin ?? query ?? centre
  if (!match) return undefined
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined
  // A coordinate-only "place" name is not a real name.
  return { title: title && !/^-?\d+(\.\d+)?,/.test(title) ? title : undefined, latitude, longitude }
}

/**
 * Text shared from the Google Maps app ("Share → Copy"): the place's name, its address and a
 * short maps.app.goo.gl link. The link can't be opened from the app (no CORS), so this returns
 * searches to try instead, most exact first: name and city, name and address, name alone.
 * Undefined when the text has no short link.
 */
export function sharedPlaceQueries(text: string): string[] | undefined {
  if (!/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text)) return undefined
  const lines = text
    .split(/\n+|\s\|\s/)
    .map((line) => line.replace(/https?:\/\/\S+/g, '').trim())
    .filter(Boolean)
  if (lines.length === 0) return []
  const [name, ...rest] = lines
  const address = rest.join(', ')
  // "34421 Beyoğlu/İstanbul" → "Beyoğlu, İstanbul": OpenStreetMap doesn't like postcodes and slashes.
  const area = address.split(',').at(-1)?.replace(/\d{4,}/g, '').replace(/\//g, ', ').trim()
  return [...new Set([area && `${name}, ${area}`, address && `${name}, ${address}`, name].filter((q): q is string => !!q))]
}

/** Single-line inputs drop line breaks, which would glue the shared name onto the address. */
export const keepLines = (pasted: string): string => pasted.trim().replace(/\s*\n+\s*/g, ' | ')

/** Opens the place in Google Maps: at its position when known, else by name. */
export function googleMapsLink(item: Pick<LibraryItem, 'title' | 'creator' | 'latitude' | 'longitude'>): string {
  const query =
    item.latitude !== undefined && item.longitude !== undefined
      ? `${item.latitude},${item.longitude}`
      : [item.title, item.creator].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/** Free OpenStreetMap search, in Turkish where names exist; famous places get a Wikipedia photo. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = encodeURIComponent(query.trim())
  const res = await fetch(
    `${NOMINATIM}/search?q=${q}&format=jsonv2&addressdetails=1&extratags=1&limit=8&accept-language=tr`,
    { signal },
  )
  const results = fromNominatim(await res.json())
  return Promise.all(results.map(async (r) => ({ ...r, posterUrl: await wikipediaPhoto(r.wikipedia, signal) })))
}

/** City and country for a position, e.g. one read from a Google Maps link. */
export async function areaAt(latitude: number, longitude: number, signal?: AbortSignal): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&accept-language=tr`,
      { signal },
    )
    return placeArea(((await res.json()) as Json).address)
  } catch {
    return undefined
  }
}

/** Lead photo of a Wikipedia article given as "lang:Title"; undefined when there is none. */
export async function wikipediaPhoto(tag: string | undefined, signal?: AbortSignal): Promise<string | undefined> {
  const match = tag?.match(/^([a-z-]{2,12}):(.+)$/)
  if (!match) return undefined
  try {
    const [, lang, title] = match
    const res = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=600&titles=${encodeURIComponent(title)}`,
      { signal },
    )
    const pages = ((await res.json()) as { query?: { pages?: Record<string, { thumbnail?: { source?: string } }> } })
      .query?.pages
    return pages ? Object.values(pages)[0]?.thumbnail?.source : undefined
  } catch {
    return undefined
  }
}
