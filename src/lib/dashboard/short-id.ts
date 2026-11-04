// Dashboard URLs use the last 8 characters of an id (a UUIDv7's leading
// characters are a timestamp, so the tail is the distinguishing part).
export const shortId = (id: string) => id.slice(-8);

// Resolves a URL param: the short form, or a full id (old links/bookmarks).
export const findByShortId = <T extends { id: string }>(
  items: T[],
  ref: string,
): T | undefined =>
  items.find((item) => item.id === ref) ??
    items.find((item) => shortId(item.id) === ref);
