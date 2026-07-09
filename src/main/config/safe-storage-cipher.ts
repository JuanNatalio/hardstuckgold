import { safeStorage } from 'electron'
import type { SecretCipher } from './config-store'

/** Production SecretCipher backed by Electron's OS-level safeStorage. */
export const safeStorageCipher: SecretCipher = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plaintext) => safeStorage.encryptString(plaintext).toString('base64'),
  decrypt: (blob) => safeStorage.decryptString(Buffer.from(blob, 'base64'))
}
