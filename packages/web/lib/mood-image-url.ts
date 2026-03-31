/**
 * Build the mood image URL for an adventure, or undefined if no image exists.
 */
export function getMoodImageUrl(
  adventureId: string,
  imagePath: string | undefined | null,
): string | undefined {
  return imagePath ? `/api/daemon/adventures/${adventureId}/mood-image` : undefined;
}
