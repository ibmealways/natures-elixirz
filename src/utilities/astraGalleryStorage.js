const KEY_PREFIX = "naturesElixirz.astraGallery.v1";
const keyFor = (scope = "guest") => `${KEY_PREFIX}.${String(scope).replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export function getAstraGallerySlides(scope) {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(scope)) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function addAstraGallerySlide(slide, scope) {
  const current = getAstraGallerySlides(scope);
  if (current.some((item) => item.sourceId === slide.sourceId)) return current;
  const next = [...current, { ...slide, id: crypto.randomUUID(), addedAt: new Date().toISOString() }].slice(-20);
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  return next;
}

export function removeAstraGallerySlide(id, scope) {
  const next = getAstraGallerySlides(scope).filter((slide) => slide.id !== id);
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  return next;
}
