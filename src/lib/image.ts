/**
 * Shrinks a photo to fit in `maxSize` px and re-encodes it as JPEG, so what we store stays small.
 *
 * Phones hand over all sorts of files: 100 MP camera shots, HEIC, pictures saved sideways with
 * only an EXIF tag to say so. `createImageBitmap` is the fast path and handles orientation; when
 * it refuses (a format it can't decode, or an image too big for the WebView's memory) the
 * platform's own <img> decoder gets a turn, which manages some of what the first one won't.
 */
export async function shrinkImage(file: Blob, maxSize = 600): Promise<Blob> {
  const source = await decode(file)
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Bu cihaz fotoğrafı işleyemedi')
  context.drawImage(source.image, 0, 0, canvas.width, canvas.height)
  source.done()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Fotoğraf kaydedilecek biçime çevrilemedi'))),
      'image/jpeg',
      0.85,
    ),
  )
}

type Decoded = { image: CanvasImageSource; width: number; height: number; done: () => void }

async function decode(file: Blob): Promise<Decoded> {
  try {
    // 'from-image' turns the EXIF tag into real pixels, so a sideways photo isn't stored sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { image: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() }
  } catch {
    return decodeWithImg(file)
  }
}

function decodeWithImg(file: Blob): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () =>
      resolve({
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        done: () => URL.revokeObjectURL(url),
      })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Bu fotoğraf açılamadı${file.type ? ` (${file.type})` : ''}`))
    }
    image.src = url
  })
}
