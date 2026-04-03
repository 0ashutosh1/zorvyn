import { describe, expect, it } from 'vitest'
import { createDefaultState, reducer } from './state.js'

const seedTransactions = [
  {
    id: 'txn-1',
    date: '2026-04-01',
    description: 'Salary',
    category: 'Salary',
    type: 'income',
    amount: 2000,
  },
  {
    id: 'txn-2',
    date: '2026-04-02',
    description: 'Rent',
    category: 'Housing',
    type: 'expense',
    amount: 900,
  },
]

describe('state reducer', () => {
  it('resets filters to defaults', () => {
    const state = {
      ...createDefaultState(seedTransactions),
      search: 'rent',
      categoryFilter: 'Housing',
      typeFilter: 'expense',
      sortField: 'amount',
      sortDirection: 'asc',
    }

    const next = reducer(state, { type: 'reset-filters' })

    expect(next.search).toBe('')
    expect(next.categoryFilter).toBe('all')
    expect(next.typeFilter).toBe('all')
    expect(next.sortField).toBe('date')
    expect(next.sortDirection).toBe('desc')
  })

  it('returns form errors for invalid save', () => {
    const state = {
      ...createDefaultState(seedTransactions),
      role: 'admin',
      draft: {
        date: '',
        description: '',
        category: '',
        amount: '0',
        type: 'expense',
        note: '',
      },
    }

    const next = reducer(state, { type: 'save-transaction' })

    expect(next.transactions).toHaveLength(2)
    expect(next.formErrors.date).toBeTruthy()
    expect(next.formErrors.description).toBeTruthy()
    expect(next.formErrors.category).toBeTruthy()
    expect(next.formErrors.amount).toBeTruthy()
  })

  it('adds transaction for admin on valid save', () => {
    const state = {
      ...createDefaultState(seedTransactions),
      role: 'admin',
      draft: {
        date: '2026-04-03',
        description: 'Consulting',
        category: 'Freelance',
        amount: '500',
        type: 'income',
        note: 'Invoice paid',
      },
    }

    const next = reducer(state, { type: 'save-transaction' })

    expect(next.transactions).toHaveLength(3)
    expect(next.transactions[0].description).toBe('Consulting')
    expect(next.formErrors.amount).toBe('')
  })
})
