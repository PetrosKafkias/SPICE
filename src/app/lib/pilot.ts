export function pilotSlug(pilotSite: string) {
  return pilotSite.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
