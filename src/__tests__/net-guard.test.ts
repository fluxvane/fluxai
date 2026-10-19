import { describe, it, expect } from "vitest";
import {
  isBlockedIp,
  validateProxyPath,
  assertPublicHttpEndpoint,
  assertPublicAddresses,
  EndpointError,
} from "../lib/net-guard";

describe("isBlockedIp", () => {
  it.each([
    "0.0.0.0",
    "10.0.0.1",
    "10.255.255.255",
    "100.64.0.1",
    "100.127.255.255",
    "127.0.0.1",
    "127.53.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "192.168.255.255",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "11.0.0.1",
    "100.63.0.1",
    "172.15.0.1",
    "172.32.0.1",
    "192.167.0.1",
    "192.169.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ])("allows %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });

  it("blocks non-IP strings outright", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
    expect(isBlockedIp("999.1.1.1")).toBe(true);
  });
});

describe("validateProxyPath", () => {
  it("joins normal OpenAI-style paths", () => {
    expect(validateProxyPath(["chat", "completions"])).toBe(
      "chat/completions",
    );
    expect(validateProxyPath(["v1", "models"])).toBe("v1/models");
    expect(validateProxyPath(["images", "generations"])).toBe(
      "images/generations",
    );
  });

  it.each([
    [[".."]],
    [["..", "etc", "passwd"]],
    [["a..b"]],
    [["."]],
    [["a\\b"]],
    [["a b"]],
    [["a", ""]],
    [[]],
  ])("rejects %j", (path) => {
    expect(validateProxyPath(path as string[])).toBeNull();
  });

  it("rejects overlong paths", () => {
    expect(validateProxyPath(["x".repeat(3000)])).toBeNull();
    expect(validateProxyPath(new Array(33).fill("a"))).toBeNull();
  });
});

describe("assertPublicHttpEndpoint", () => {
  it("rejects non-http schemes", async () => {
    await expect(assertPublicHttpEndpoint("ftp://example.com")).rejects.toThrow(
      EndpointError,
    );
    await expect(
      assertPublicHttpEndpoint("file:///etc/passwd"),
    ).rejects.toThrow(EndpointError);
  });

  it("rejects credentials, query, and fragments", async () => {
    await expect(
      assertPublicHttpEndpoint("https://user:pass@example.com"),
    ).rejects.toThrow(EndpointError);
    await expect(
      assertPublicHttpEndpoint("https://example.com/v1?x=1"),
    ).rejects.toThrow(EndpointError);
    await expect(
      assertPublicHttpEndpoint("https://example.com/v1#frag"),
    ).rejects.toThrow(EndpointError);
  });

  it.each([
    "http://localhost",
    "http://localhost:8080/v1",
    "http://127.0.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.1",
    "http://192.168.1.1",
    "http://[::1]",
    "http://foo.local",
    "http://db.internal",
    "http://metadata.google.internal",
  ])("rejects %s without external fetches", async (endpoint) => {
    await expect(assertPublicHttpEndpoint(endpoint)).rejects.toThrow(
      EndpointError,
    );
  });
});

describe("assertPublicAddresses", () => {
  it("returns all-public address sets untouched", () => {
    const addresses = [
      { address: "8.8.8.8", family: 4 },
      { address: "1.1.1.1", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ];
    expect(assertPublicAddresses("example.com", addresses)).toBe(addresses);
  });

  it("rejects the whole set when any record is private/reserved", () => {
    // A mixed answer must not be filtered to just its public records —
    // a rebinding lookup could smuggle a private address in that way.
    for (const privateIp of ["10.0.0.1", "169.254.169.254", "::1"]) {
      expect(() =>
        assertPublicAddresses("example.com", [
          { address: "8.8.8.8", family: 4 },
          { address: privateIp, family: privateIp.includes(":") ? 6 : 4 },
        ]),
      ).toThrow(EndpointError);
    }
  });

  it("rejects empty address sets", () => {
    expect(() => assertPublicAddresses("example.com", [])).toThrow(
      EndpointError,
    );
  });
});
