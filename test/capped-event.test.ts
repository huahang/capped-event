import { link } from '@jacobbubu/scuttlebutt-pull'
import { CappedEvent } from '../src'
import { delay } from './utils'

describe('basic', () => {
  it('get length', () => {
    const a = new CappedEvent({ id: 'A' })
    a.push('event1', '0')
    a.push('event1', '1')
    a.push('event2', '0')
    expect(a.getLengthByEvent('event1')).toBe(2)
    expect(a.getLengthByEvent('event2')).toBe(1)
    expect(a.getTotalLength()).toBe(3)
  })

  it('overflow', done => {
    const total = 9
    const warningLine = 5
    let count = total - warningLine
    const a = new CappedEvent({ id: 'A', warningLine })

    a.on('__overflow__', (key, len) => {
      expect(key).toBe('event1')
      expect(len).toBeGreaterThanOrEqual(warningLine)
      if (--count === 0) {
        done()
      }
    })

    for (let i = 0; i < total; i++) {
      a.push('event1', i)
    }
  })

  it('overflow on remote', done => {
    const total = 9
    const warningLine = 5
    let count = total - warningLine
    const a = new CappedEvent({ id: 'A' })
    const b = new CappedEvent({ id: 'B', warningLine })

    // in a <-> b relationship, a is read-only and b is write-only
    const s1 = a.createStream({ name: 'a->b' })
    const s2 = b.createStream({ name: 'b->a' })
    link(s1, s2)

    b.on('__overflow__', (key, len) => {
      expect(key).toBe('event1')
      expect(len).toBeGreaterThanOrEqual(warningLine)
      if (--count === 0) {
        done()
      }
    })

    for (let i = 0; i < total; i++) {
      a.push('event1', i)
    }
  })

  it('prune before x ms', async () => {
    const a = new CappedEvent({ id: 'A' })
    const interval = 20
    const total = 10
    for (let i = 0; i < total; i++) {
      a.push('event1', i)
      if (i < total - 1) {
        await delay(interval)
      }
    }
    const half = Math.floor(total / 2)
    const before = (total - half) * interval
    a.pruneBefore(before, 'event1')
    expect(a.getLengthByEvent('event1')).toBe(total - half)
  })

  it('prune to x items', () => {
    const a = new CappedEvent({ id: 'A' })
    const total = 10
    for (let i = 0; i < total; i++) {
      a.push('event1', i)
    }
    const remaining = a.pruneTo(1, 'event1')
    expect(remaining).toBe(1)
    expect(a.getLengthByEvent('event1')).toBe(1)
  })

  it('get latest value by event', () => {
    const a = new CappedEvent({ id: 'A' })
    expect(a.getLatestValueByEvent('event1')).toBeUndefined()
    a.push('event1', 1, 2)
    expect(a.getLatestValueByEvent('event1')).toBe(1)
    const update = a.getLatestValueByEvent('event1', true)
    expect(update[0]).toEqual(['event1', 1, 2])
    expect(update[2]).toBe('A')
    a.pruneTo(0, 'event1')
    expect(a.getLatestValueByEvent('event1')).toBeUndefined()
  })
})
