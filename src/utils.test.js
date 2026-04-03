import { describe, expect, it } from 'vitest'
import { buildTransactionsCsv, getCategoryBreakdown, getMonthlyComparison, getMonthlySeries } from './utils.js'

const transactions = [
  { id: 'a', date: '2026-03-01', description: 'Salary', category: 'Salary', type: 'income', amount: 3000 },
  { id: 'b', date: '2026-03-03', description: 'Rent', category: 'Housing', type: 'expense', amount: 1200 },
  { id: 'c', date: '2026-04-01', description: 'Salary', category: 'Salary', type: 'income', amount: 3000 },
  { id: 'd', date: '2026-04-03', description: 'Groceries', category: 'Groceries', type: 'expense', amount: 450 },
]

describe('utils', () => {
  it('builds monthly comparison with delta', () => {
    const series = getMonthlySeries(transactions, 1000)
    const comparison = getMonthlyComparison(series)

    expect(comparison).not.toBeNull()
    expect(comparison.delta).toBeGreaterThan(0)
  })

  it('returns expense categories sorted by amount', () => {
    const breakdown = getCategoryBreakdown(transactions)

    expect(breakdown[0].category).toBe('Housing')
    expect(breakdown[0].amount).toBe(1200)
  })

  it('creates escaped csv content', () => {
    const withComma = [...transactions, {
      id: 'e',
      date: '2026-04-04',
      description: 'Dinner, team',
      category: 'Dining',
      type: 'expense',
      amount: 80,
      note: 'Client "A"',
    }]
    const csv = buildTransactionsCsv(withComma)

    expect(csv.split('\n')[0]).toContain('id,date,description')
    expect(csv).toContain('"Dinner, team"')
    expect(csv).toContain('"Client ""A"""')
  })
})
