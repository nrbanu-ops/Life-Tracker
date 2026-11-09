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
  const query = url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)(?:\s|\+|%20)*(-?\d+(?:\.\d+)?)/i)
  // What a shared pin opens: …/maps/search/5.81,+-55.11 or …/maps/place/30.95,34.79/…
  const path = url.match(/\/maps\/(?:search|place)\/(-?\d+(?:\.\d+)?)(?:,|%2C)(?:\s|\+|%20)*(-?\d+(?:\.\d+)?)/i)
  const match = pin ?? query ?? path ?? centre
  if (!match) return undefined
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined
  // A coordinate-only "place" name is not a real name.
  return { title: title && !/^-?\d+(\.\d+)?,/.test(title) ? title : undefined, latitude, longitude }
}

/** The place a Google Maps link names without a position, e.g. ?q=Galata+Kulesi,+Beyoğlu&ftid=… */
function linkPlaceName(text: string): string | undefined {
  const raw = text.match(/[?&]q=([^&\s]+)/)?.[1] ?? text.match(/\/maps\/place\/([^/@?\s]+)/)?.[1]
  if (!raw) return undefined
  let name: string
  try {
    name = decodeURIComponent(raw.replace(/\+/g, ' ')).trim()
  } catch {
    return undefined
  }
  // Coordinates and place ids are not names.
  return name && !/^-?\d+(\.\d+)?,/.test(name) && !/^place_id:/i.test(name) ? name : undefined
}

/**
 * Text shared from the Google Maps app ("Share → Copy"): the place's name, its address and a
 * maps.app.goo.gl link (in the Android app already swapped for the long link). A short link can't
 * be opened from the web app (no CORS), so this returns searches to try instead, most exact
 * first: name and city, name and address, name alone. Undefined when the text has no maps link.
 */
export function sharedPlaceQueries(text: string): string[] | undefined {
  if (!/maps\.app\.goo\.gl|goo\.gl\/maps|google\.[a-z.]+\/maps|maps\.google\./i.test(text)) return undefined
  const lines = text
    .split(/\n+|\s\|\s/)
    .map((line) => line.replace(/https?:\/\/\S+/g, '').trim())
    .filter(Boolean)
  if (lines.length === 0) {
    // Only a link: search by the name in it, e.g. "Galata Kulesi, Bereketzade, Beyoğlu".
    const fromLink = linkPlaceName(text)
    if (!fromLink) return []
    const [first] = fromLink.split(',')
    return [...new Set([fromLink, first.trim()])]
  }
  const [name, ...rest] = lines
  const address = rest.join(', ')
  // "34421 Beyoğlu/İstanbul" → "Beyoğlu, İstanbul": OpenStreetMap doesn't like postcodes and slashes.
  const area = address.split(',').at(-1)?.replace(/\d{4,}/g, '').replace(/\//g, ', ').trim()
  return [...new Set([area && `${name}, ${area}`, address && `${name}, ${address}`, name].filter((q): q is string => !!q))]
}

/** A name to start a hand-made place with: the search text without links, e.g. the shared name. */
export function plainTitle(query: string): string {
  const [first = ''] = query
    .replace(/https?:\/\/\S+/g, '')
    .split(/\s\|\s|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
  return first || linkPlaceName(query)?.split(',')[0].trim() || ''
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

/**
 * The place at a position, as OpenStreetMap names it: a venue when there is one, otherwise the
 * street or the neighbourhood. Never empty — the user can always rename it.
 */
export function fromReverse(json: unknown, latitude: number, longitude: number): PlaceResult {
  const r = (typeof json === 'object' && json !== null ? json : {}) as Json
  const a = (typeof r.address === 'object' && r.address !== null ? r.address : {}) as Json
  const title =
    str(r.name) ??
    str(a.amenity) ??
    str(a.shop) ??
    str(a.building) ??
    str(a.road) ??
    str(a.neighbourhood) ??
    str(a.suburb) ??
    str(a.city) ??
    str(a.town) ??
    str(a.village) ??
    'Buradayım'
  const tags = (r.extratags ?? {}) as Json
  return {
    kind: 'place',
    title,
    creator: placeArea(r.address),
    latitude,
    longitude,
    source: 'osm',
    externalId: r.osm_type && r.osm_id ? `${r.osm_type}/${r.osm_id}` : undefined,
    wikipedia: str(tags.wikipedia),
  }
}

/**
 * Where you are, ready to add: the name OpenStreetMap gives the spot, the city, and a photo if
 * something famous is within a short walk. Offline it still returns the position, unnamed.
 */
export async function placeHere(latitude: number, longitude: number, signal?: AbortSignal): Promise<PlaceResult> {
  let place: PlaceResult = { kind: 'place', title: 'Buradayım', latitude, longitude, source: 'osm' }
  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&addressdetails=1&extratags=1&zoom=18&accept-language=tr`,
      { signal },
    )
    place = fromReverse(await res.json(), latitude, longitude)
  } catch {
    // No network: the position alone is still worth keeping, the user can name it.
    return place
  }
  const photo =
    (await wikipediaPhoto(place.wikipedia, signal)) ?? (await nearbyPhoto(latitude, longitude, place.title, signal))
  return { ...place, posterUrl: photo }
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

/**
 * Photo of the closest Wikipedia article with one, within a short walk of a position (Turkish
 * Wikipedia first, then English), e.g. for a place shared from Google Maps. Google's own place
 * photos need a paid key, so ordinary shops and cafés usually get none.
 */
export async function nearbyPhoto(
  latitude: number,
  longitude: number,
  name?: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  for (const lang of ['tr', 'en']) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=geosearch&ggscoord=${latitude}|${longitude}&ggsradius=${NEARBY_METERS}&ggslimit=10&prop=pageimages&piprop=thumbnail&pithumbsize=600`,
        { signal },
      )
      const photo = closestPhoto(await res.json(), name)
      if (photo) return photo
    } catch {
      if (signal?.aborted) return undefined
    }
  }
  return undefined
}

const NEARBY_METERS = 100

type GeoPage = { index?: number; title?: string; thumbnail?: { source?: string } }

/**
 * The geosearch's pages come keyed by id; `index` is their order by distance. With the place's
 * name only an article of that name counts, so a café beside a monument doesn't get its photo.
 */
export function closestPhoto(json: unknown, name?: string): string | undefined {
  const pages = (json as { query?: { pages?: Record<string, GeoPage> } })?.query?.pages
  if (!pages) return undefined
  const simple = (s: string) => s.toLocaleLowerCase('tr').replace(/\s*\(.*\)$/, '').trim()
  const wanted = name && simple(name)
  return Object.values(pages)
    .filter((page) => page.thumbnail?.source)
    .filter((page) => {
      if (!wanted) return true
      const title = simple(page.title ?? '')
      return !!title && (title.includes(wanted) || wanted.includes(title))
    })
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0]?.thumbnail?.source
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
