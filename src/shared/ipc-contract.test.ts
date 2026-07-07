import { describe, expect, it } from 'vitest'
import * as ipcContract from './ipc-contract'

describe('ipc-contract', () => {
  it('loads without throwing', () => {
    expect(ipcContract).toBeDefined()
  })
})
