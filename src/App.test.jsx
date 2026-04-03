// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

function getFirstDataRow(tableElement) {
  const rows = within(tableElement).getAllByRole('row')
  return rows[1]
}

describe('App UI flows', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('switches between viewer and admin UI states', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /viewer mode/i })).toBeTruthy()

    const roleSelect = screen.getByLabelText(/role/i)
    await user.selectOptions(roleSelect, 'admin')

    expect(screen.getByText(/admin tools/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeTruthy()

    await user.selectOptions(roleSelect, 'viewer')
    expect(screen.getByRole('heading', { name: /viewer mode/i })).toBeTruthy()
  })

  it('shows and clears transaction empty state through filters', async () => {
    const user = userEvent.setup()
    render(<App />)

    const searchInput = screen.getByPlaceholderText(/search description, category, date/i)
    await user.type(searchInput, 'zzzz-no-match')

    expect(screen.getAllByText(/no transactions match the current filters/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /reset filters/i }))

    expect(screen.queryAllByText(/no transactions match the current filters/i).length).toBe(0)
  })

  it('switches between table and grouped transaction views', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText(/recent financial transactions with filtering, sorting, and role-based actions/i)).toBeTruthy()

    await user.click(screen.getByRole('tab', { name: /grouped by month/i }))

    expect(screen.queryByText(/recent financial transactions with filtering, sorting, and role-based actions/i)).toBeNull()
    expect(screen.getByRole('heading', { name: /apr 2026/i })).toBeTruthy()
  })

  it('sorts filtered transactions by amount in ascending order', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText(/search description, category, date/i), 'groceries')
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'amount')
    await user.click(screen.getByRole('button', { name: /descending/i }))

    const table = screen.getByRole('table')
    const firstDataRow = getFirstDataRow(table)
    const amountCell = within(firstDataRow).getAllByRole('cell')[4]

    expect(amountCell.textContent).toContain('385')
  })
})
