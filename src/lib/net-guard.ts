import { promises as dns } from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import { isIP } from "node:net";
import { Agent, type Dispatcher } from "undici";

/**
 * SSRF defenses for the outbound proxy and image-generation routes. A
 * signed-in user picks their own upstream "endpoint"; without checks they
 * could point the server at cloud metadata (169.254.169.254), internal
 * services, or non-HTTP schemes. Node-only (dns/net) — route handlers run on
 * the nodejs runtime, so keep this module out of the edge middleware.
 */

export class EndpointError extends Error {}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.azure.com",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".internal", ".local"];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const v = Number(part);
    if (!Number.isInteger(v) || v < 0 || v > 255 || part !== String(v)) {
      return null;
    }
    n = n * 256 + v;
  }
  return n >>> 0;
}

// CIDR ranges (as [network, prefixBits]) that must never be reachable through
// the proxy: loopback, RFC 1918, link-local / cloud metadata, CGNAT,
// documentation ranges, multicast, and reserved space.
const BLOCKED_V4: Array<readonly [number, number]> = [
  [ipv4ToInt("0.0.0.0") ?? 0, 8],
  [ipv4ToInt("10.0.0.0") ?? 0, 8],
  [ipv4ToInt("100.64.0.0") ?? 0, 10],
  [ipv4ToInt("127.0.0.0") ?? 0, 8],
  [ipv4ToInt("169.254.0.0") ?? 0, 16],
  [ipv4ToInt("172.16.0.0") ?? 0, 12],
  [ipv4ToInt("192.0.0.0") ?? 0, 24],
  [ipv4ToInt("192.0.2.0") ?? 0, 24],
  [ipv4ToInt("192.88.99.0") ?? 0, 24],
  [ipv4ToInt("192.168.0.0") ?? 0, 16],
  [ipv4ToInt("198.18.0.0") ?? 0, 15],
  [ipv4ToInt("198.51.100.0") ?? 0, 24],
  [ipv4ToInt("203.0.113.0") ?? 0, 24],
  [ipv4ToInt("224.0.0.0") ?? 0, 4],
  [ipv4ToInt("240.0.0.0") ?? 0, 4],
];

export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) {
    const n = ipv4ToInt(ip);
    if (n === null) return true;
    return BLOCKED_V4.some(
      ([base, bits]) => n >>> (32 - bits) === base >>> (32 - bits),
    );
  }
  if (kind === 6) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return true;
    if (/^fe[89ab]/.test(s)) return true; // fe80::/10 link-local
    if (s.startsWith("fc") || s.startsWith("fd")) return true; // fc00::/7 ULA
    if (s.startsWith("ff")) return true; // ff00::/8 multicast
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  // Not a parseable IP literal at all — refuse it.
  return true;
}

function assertAllowedHostname(host: string): void {
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => host.endsWith(suffix))
  ) {
    throw new EndpointError(`Endpoint host "${host}" is not allowed.`);
  }
}

/**
 * Parses `endpoint` and enforces that it is a plain http(s) URL whose host is
 * neither a blocked hostname nor resolves to a private/reserved address.
 * Returns the parsed URL (origin + path preserved). Throws EndpointError.
 *
 * This is the cheap up-front gate; it cannot stop DNS rebinding or redirects
 * on its own because fetch() re-resolves at connect time. Pair it with
 * {@link ssrfDispatcher} so every connection (initial + redirect hops)
 * re-validates the hostname and resolved IPs.
 */
export async function assertPublicHttpEndpoint(
  endpoint: string,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new EndpointError("Endpoint is not a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new EndpointError(
      "Only http:// and https:// endpoints are allowed.",
    );
  }
  if (url.username || url.password) {
    throw new EndpointError("Endpoint must not contain credentials.");
  }
  if (url.search || url.hash) {
    throw new EndpointError(
      "Endpoint must not contain a query string or fragment.",
    );
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  assertAllowedHostname(host);

  if (isIP(host)) {
    if (isBlockedIp(host)) {
      throw new EndpointError(
        `Endpoint resolves to a private or reserved address (${host}).`,
      );
    }
    return url;
  }

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new EndpointError(`Endpoint host "${host}" could not be resolved.`);
  }
  if (
    addresses.length === 0 ||
    addresses.some((a) => isBlockedIp(a.address))
  ) {
    throw new EndpointError(
      `Endpoint host "${host}" resolves to a private or reserved address.`,
    );
  }
  return url;
}

// RFC 3986 pchar minus '/' and '%' — each segment arrives already decoded,
// so a literal "..", a backslash, or any control/space character is rejected
// instead of being re-encoded into an upstream path traversal.
const SAFE_SEGMENT = /^[\w~!$&'()*+,;=:@.-]+$/;

/**
 * Validates the proxy catch-all path segments and returns them joined.
 * Returns null when any segment is unsafe or the path is absurdly long.
 */
export function validateProxyPath(path: string[]): string | null {
  if (path.length === 0 || path.length > 32) return null;
  for (const segment of path) {
    if (!segment || segment === "." || segment === "..") return null;
    if (segment.includes("..")) return null;
    if (!SAFE_SEGMENT.test(segment)) return null;
  }
  const joined = path.join("/");
  return joined.length <= 2048 ? joined : null;
}

/**
 * DNS-rebinding / redirect hardening for upstream fetches.
 *
 * `assertPublicHttpEndpoint` checks the hostname once, but undici resolves
 * DNS itself when it opens the socket — and again for each redirect hop. A
 * hostile DNS server (or a public upstream that 302s to an internal URL)
 * could therefore serve a private address at connect time and bypass the
 * up-front check entirely.
 *
 * This dispatcher installs a custom `lookup` that re-runs the hostname
 * blocklist and the private/reserved-IP filter on EVERY connection undici
 * opens, so rebinding and redirect hops get the same scrutiny as the
 * original endpoint. Serves only allowed addresses to the socket layer.
 *
 * Usage: `fetch(url, { ...init, dispatcher: ssrfDispatcher() })`.
 */
export function ssrfDispatcher(): Dispatcher {
  const lookup = (
    hostname: string,
    options: LookupOptions,
    callback: (
      err: NodeJS.ErrnoException | null,
      address?: unknown,
      family?: number,
    ) => void,
  ): void => {
    const host = hostname.toLowerCase();
    try {
      assertAllowedHostname(host);
    } catch (err) {
      callback(err as NodeJS.ErrnoException);
      return;
    }
    dns.lookup(hostname, { ...options, all: true }).then(
      (addresses) => {
        const safe = (addresses as LookupAddress[]).filter(
          (a) => !isBlockedIp(a.address),
        );
        if (safe.length === 0) {
          callback(
            new EndpointError(
              `Host "${host}" resolves only to private or reserved addresses.`,
            ),
          );
          return;
        }
        if (options.all) {
          callback(null, safe);
        } else {
          callback(null, safe[0].address, safe[0].family);
        }
      },
      (err: NodeJS.ErrnoException) => callback(err),
    );
  };
  return new Agent({ connect: { lookup } });
}
