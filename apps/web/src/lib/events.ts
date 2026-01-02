export const SHELVES_UPDATED = "nukbook:shelves-updated";

export function emitShelvesUpdated(bookId: number) {
  window.dispatchEvent(new CustomEvent(SHELVES_UPDATED, { detail: { bookId } }));
}
