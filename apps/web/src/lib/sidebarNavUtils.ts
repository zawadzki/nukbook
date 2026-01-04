export function normalizePath(path: string) {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "");
}

export function getActiveHref(hrefs: string[], pathname: string | null) {
  if (!pathname) return null;
  const normalizedPath = normalizePath(pathname);
  let bestMatch: string | null = null;

  for (const href of hrefs) {
    const normalizedHref = normalizePath(href);
    if (normalizedHref === "/") {
      if (normalizedPath === "/") bestMatch = href;
      continue;
    }

    if (
      normalizedPath === normalizedHref ||
      normalizedPath.startsWith(`${normalizedHref}/`)
    ) {
      if (!bestMatch) {
        bestMatch = href;
        continue;
      }
      if (normalizedHref.length > normalizePath(bestMatch).length) {
        bestMatch = href;
      }
    }
  }

  return bestMatch;
}
