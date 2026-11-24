/**
 * Reads TRUST_PROXY: how many reverse proxies sit between the internet and this
 * process.
 *
 * It is a hop count and never a boolean. Fastify's `trustProxy: true` believes
 * the LEFTMOST X-Forwarded-For entry, and that entry is whatever the client
 * chose to send. The rate limiter keys on request.ip, so with `true` anyone
 * could rotate a forged header to get a fresh bucket on every request. With a
 * hop count N, Fastify skips exactly N addresses from the right (the ones our
 * own proxies appended) and ignores everything a client could have put to the
 * left of them.
 *
 * Unset, empty, "0" and "false" all mean "no proxy": request.ip is the socket
 * peer, which is correct when the process is reached directly.
 */
export function parseTrustProxy(
  value: string | undefined,
): false | number {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === undefined ||
    normalized === "" ||
    normalized === "0" ||
    normalized === "false"
  ) {
    return false;
  }

  if (!/^[1-9][0-9]{0,1}$/.test(normalized)) {
    throw new Error(
      'TRUST_PROXY must be a number of proxy hops between 1 and 99 (or unset). "true" is not accepted because it trusts a client-controlled header.',
    );
  }

  return Number(normalized);
}
