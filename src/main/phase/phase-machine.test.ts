import { describe, expect, it, vi } from 'vitest'
import { PhaseMachine } from './phase-machine'

describe('PhaseMachine', () => {
  it('starts as LeagueClosed', () => {
    expect(new PhaseMachine().getPhase()).toBe('LeagueClosed')
  })

  it.each([
    ['None', 'Idle'],
    ['Lobby', 'Lobby'],
    ['Matchmaking', 'Lobby'],
    ['ReadyCheck', 'Lobby'],
    ['ChampSelect', 'ChampSelect'],
    ['GameStart', 'InProgress'],
    ['InProgress', 'InProgress'],
    ['Reconnect', 'InProgress'],
    ['WaitingForStats', 'EndOfGame'],
    ['PreEndOfGame', 'EndOfGame'],
    ['EndOfGame', 'EndOfGame']
  ] as const)('maps LCU gameflow %s to app phase %s', (gameflow, appPhase) => {
    const machine = new PhaseMachine()
    machine.update(gameflow)
    expect(machine.getPhase()).toBe(appPhase)
  })

  it('maps an unknown gameflow value to Idle', () => {
    const machine = new PhaseMachine()
    machine.update('SomeFuturePhase')
    expect(machine.getPhase()).toBe('Idle')
  })

  it('maps null (client gone) to LeagueClosed', () => {
    const machine = new PhaseMachine()
    machine.update('ChampSelect')
    machine.update(null)
    expect(machine.getPhase()).toBe('LeagueClosed')
  })

  it('emits change with previous and current on transitions', () => {
    const machine = new PhaseMachine()
    const onChange = vi.fn()
    machine.on('change', onChange)

    machine.update('None')
    machine.update('ChampSelect')

    expect(onChange).toHaveBeenNthCalledWith(1, { previous: 'LeagueClosed', current: 'Idle' })
    expect(onChange).toHaveBeenNthCalledWith(2, { previous: 'Idle', current: 'ChampSelect' })
  })

  it('does not emit when the mapped phase is unchanged', () => {
    const machine = new PhaseMachine()
    const onChange = vi.fn()
    machine.on('change', onChange)

    machine.update('Lobby')
    machine.update('Matchmaking') // both map to Lobby
    machine.update('ReadyCheck')

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
