/**
 * The request URL without its query string.
 *
 * Request logs record this instead of request.url. The API now serves the web
 * app, so a page load such as GET /?invite=<token> reaches it, and an
 * invitation token is a bearer secret until it is accepted. Logs are kept and
 * read by other people, so secrets must not be written to them.
 */
export function pathOnly(url: string): string {
  const queryStart = url.indexOf("?");

  return queryStart === -1 ? url : url.slice(0, queryStart);
}
