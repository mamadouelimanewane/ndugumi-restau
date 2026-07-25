// Partagé entre useCrmStore.ts et supabaseStorage.ts pour éviter un import circulaire.
// tant que ready est false, supabaseStorage doit ignorer les écritures (voir supabaseStorage.ts) :
// sans ça, le premier rendu (avec l'état par défaut, avant que le GET distant ait répondu) peut
// écraser les vraies données côté serveur avec un PUT prématuré.
export const hydrationGuard = { ready: false }
