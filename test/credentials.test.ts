import { describe, it, expect } from "vitest";
import { CREDENTIAL_KEYS, createCredentials, memoryStorage } from "../src/credentials";

describe("credentials", () => {
  it("stores each kind under its own key", () => {
    const storage = memoryStorage();
    const creds = createCredentials(storage);
    creds.set("github", "ghp_x");
    creds.set("ai", "sk-y");
    expect(storage.getItem(CREDENTIAL_KEYS.github)).toBe("ghp_x");
    expect(storage.getItem(CREDENTIAL_KEYS.ai)).toBe("sk-y");
  });

  it("returns null when nothing is stored", () => {
    expect(createCredentials(memoryStorage()).get("github")).toBeNull();
  });

  it("trims what it stores and ignores a blank value", () => {
    const creds = createCredentials(memoryStorage());
    creds.set("ai", "  sk-y  ");
    expect(creds.get("ai")).toBe("sk-y");
    creds.set("ai", "   ");
    expect(creds.get("ai")).toBeNull();
  });

  it("clears one kind without touching the other", () => {
    const creds = createCredentials(memoryStorage());
    creds.set("ai", "a");
    creds.set("github", "b");
    creds.clear("ai");
    expect(creds.get("ai")).toBeNull();
    expect(creds.get("github")).toBe("b");
  });

  it("survives a storage that throws", () => {
    const hostile = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
      clear() {}, key: () => null, length: 0,
    } as unknown as Storage;
    const creds = createCredentials(hostile);
    expect(() => creds.set("ai", "x")).not.toThrow();
    expect(creds.get("ai")).toBeNull();
  });
});
