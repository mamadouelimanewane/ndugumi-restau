/**
 * OCR réel côté navigateur (Tesseract.js) — l'API DeepSeek ne supporte pas l'entrée image
 * (testé empiriquement : rejette tout content multimodal). On extrait donc le texte ici, puis
 * on l'envoie à DeepSeek (texte uniquement) pour l'interpréter/structurer.
 * Import dynamique pour ne pas alourdir le chunk de la page qui utilise cette fonction —
 * seulement chargé au moment où l'utilisateur lance réellement un scan.
 */
export async function extractTextFromImage(file: File): Promise<string> {
  const { recognize } = await import('tesseract.js')
  const result = await recognize(file, 'fra')
  return result.data.text
}
