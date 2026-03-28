// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  }),
}));

// Mock jose so tests don't depend on WebCrypto availability
const mockSign = vi.fn().mockResolvedValue("header.payload.signature");
const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  })),
  jwtVerify: mockJwtVerify,
}));

const { createSession, getSession, deleteSession, verifySession } =
  await import("@/lib/auth");

beforeEach(() => {
  mockSet.mockClear();
  mockGet.mockClear();
  mockDelete.mockClear();
  mockSign.mockClear();
  mockJwtVerify.mockClear();
});

// ─── createSession ────────────────────────────────────────────────────────────

test("createSession sets an httpOnly auth-token cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [name, , options] = mockSet.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(options.httpOnly).toBe(true);
});

test("createSession cookie value is the signed JWT token", async () => {
  await createSession("user-1", "user@example.com");

  const [, token] = mockSet.mock.calls[0];
  expect(token).toBe("header.payload.signature");
});

test("createSession sets cookie path to /", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.path).toBe("/");
});

test("createSession sets cookie expiry roughly 7 days in the future", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [, , options] = mockSet.mock.calls[0];
  const expiresMs = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession sets sameSite to lax", async () => {
  await createSession("user-1", "user@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.sameSite).toBe("lax");
});

// ─── getSession ───────────────────────────────────────────────────────────────

test("getSession returns null when no cookie is present", async () => {
  mockGet.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns the decoded session payload when the token is valid", async () => {
  mockGet.mockReturnValue({ value: "valid.jwt.token" });
  mockJwtVerify.mockResolvedValue({
    payload: { userId: "user-1", email: "user@example.com", expiresAt: new Date() },
  });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("user@example.com");
});

test("getSession returns null when the token is expired or invalid", async () => {
  mockGet.mockReturnValue({ value: "bad.jwt.token" });
  mockJwtVerify.mockRejectedValue(new Error("JWTExpired"));

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when jwtVerify throws an unexpected error", async () => {
  mockGet.mockReturnValue({ value: "some.token" });
  mockJwtVerify.mockRejectedValue(new TypeError("Unexpected failure"));

  const session = await getSession();

  expect(session).toBeNull();
});

// ─── deleteSession ────────────────────────────────────────────────────────────

test("deleteSession deletes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockDelete).toHaveBeenCalledOnce();
  expect(mockDelete).toHaveBeenCalledWith("auth-token");
});

// ─── verifySession ────────────────────────────────────────────────────────────

function makeRequest(token?: string) {
  const cookieGet = vi.fn().mockReturnValue(token ? { value: token } : undefined);
  return { cookies: { get: cookieGet } } as any;
}

test("verifySession returns null when the request has no auth cookie", async () => {
  const request = makeRequest();

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns the decoded payload for a valid token", async () => {
  const request = makeRequest("valid.jwt.token");
  mockJwtVerify.mockResolvedValue({
    payload: { userId: "user-2", email: "other@example.com", expiresAt: new Date() },
  });

  const session = await verifySession(request);

  expect(session?.userId).toBe("user-2");
  expect(session?.email).toBe("other@example.com");
});

test("verifySession returns null when the token is invalid", async () => {
  const request = makeRequest("tampered.token");
  mockJwtVerify.mockRejectedValue(new Error("JWTInvalid"));

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession reads from the request cookies, not next/headers", async () => {
  // next/headers mock should never be called during verifySession
  const request = makeRequest("valid.jwt.token");
  mockJwtVerify.mockResolvedValue({ payload: { userId: "u", email: "e", expiresAt: new Date() } });

  await verifySession(request);

  expect(mockGet).not.toHaveBeenCalled(); // mockGet belongs to next/headers cookies
});
