import { createStore, get, set, del } from 'idb-keyval'

// Les métadonnées (nom, type, taille, date) vivent dans le store zustand persisté en localStorage ;
// les blobs eux-mêmes vivent ici, dans IndexedDB (localStorage a une limite ~5-10 Mo bien trop
// petite pour des photos/fichiers/enregistrements audio de 235 restaurants).
const attachmentsStore = createStore('restau-crm-attachments', 'blobs')

export function saveAttachmentBlob(id: string, blob: Blob): Promise<void> {
  return set(id, blob, attachmentsStore)
}

export function getAttachmentBlob(id: string): Promise<Blob | undefined> {
  return get(id, attachmentsStore)
}

export function deleteAttachmentBlob(id: string): Promise<void> {
  return del(id, attachmentsStore)
}
