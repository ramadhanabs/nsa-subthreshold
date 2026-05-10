import { describe, it, expect } from "bun:test"
import { encrypt, decrypt } from "./Crypto"

// Set test encryption key (32 bytes = 64 hex chars)
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

describe("Crypto", () => {
  it("encrypts and decrypts a string", () => {
    const plaintext = "my-secret-api-key"
    const encrypted = encrypt(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted).toContain(":") // iv:tag:ciphertext format
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it("produces different ciphertexts for same input (random IV)", () => {
    const plaintext = "same-input"
    const a = encrypt(plaintext)
    const b = encrypt(plaintext)
    expect(a).not.toBe(b)
  })

  it("decrypt fails on tampered data", () => {
    const encrypted = encrypt("test")
    const parts = encrypted.split(":")
    parts[2] = "ff" + parts[2].slice(2) // tamper ciphertext
    expect(() => decrypt(parts.join(":"))).toThrow()
  })
})
