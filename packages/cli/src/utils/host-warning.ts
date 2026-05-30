/**
 * Helper for the preview / canvas banners: classify the bind host into either
 * "loopback (private, fine)" or "non-loopback (reachable from elsewhere on the
 * network — the user should know)".
 *
 * We're deliberately lenient: anything other than the well-known IPv4 / IPv6
 * loopback aliases counts as non-loopback. That includes `0.0.0.0`,
 * `192.168.x.x`, an explicit LAN address, or a Docker bridge IP. Default
 * behaviour (`127.0.0.1` / `localhost` / `::1`) prints the simple "accessible
 * only from this machine" line; everything else gets the explicit non-loopback
 * notice instead.
 *
 * No warning means a clean banner for the 99% case (loopback). Non-loopback
 * binds are normal for Docker / DevContainers / Codespaces / LAN sharing, so
 * we don't error out — we just surface the fact in the banner.
 */

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.trim().toLowerCase());
}

/**
 * The banner line that describes the network reachability for a given bind
 * host. Returns the loopback-friendly note for `127.0.0.1` / `localhost` and
 * an explicit non-loopback notice (prefixed with `⚠`) otherwise.
 */
export function reachabilityNote(host: string): string {
  return isLoopbackHost(host)
    ? 'localhost-only — accessible only from this machine.'
    : '⚠ Non-loopback bind: this server is reachable from other machines on your network.';
}
