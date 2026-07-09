/** Credentials for the LCU API, read from the League client's lockfile. */
export interface LockfileCredentials {
  processName: string
  pid: number
  port: number
  password: string
  protocol: string
}

/**
 * Parses lockfile content of the form `process:pid:port:password:protocol`
 * (single line, written by the League client on startup).
 */
export function parseLockfile(content: string): LockfileCredentials {
  const trimmed = content.trim()
  const parts = trimmed.split(':')
  if (parts.length !== 5) {
    throw new Error(`Invalid lockfile: expected 5 colon-separated parts, got ${parts.length}`)
  }

  const [processName, pidRaw, portRaw, password, protocol] = parts
  const pid = Number(pidRaw)
  const port = Number(portRaw)

  if (!Number.isInteger(pid) || pidRaw === '') {
    throw new Error(`Invalid lockfile: pid "${pidRaw}" is not a number`)
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid lockfile: port "${portRaw}" is not a valid TCP port`)
  }
  if (password === '') {
    throw new Error('Invalid lockfile: password is empty')
  }

  return { processName, pid, port, password, protocol }
}
