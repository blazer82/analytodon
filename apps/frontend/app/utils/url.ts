/**
 * Strips the schema (http://, https://) from a URL
 * @param url URL to strip schema from
 * @returns URL without schema
 */
export function stripSchema(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
