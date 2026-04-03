import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import './App.css'
import { initialTransactions, startingBalance } from './data.js'
import { createDefaultState, createDraft, reducer, storageKey, validateDraft } from './state.js'
import {
  buildTransactionsCsv,
  formatCurrency,
  formatDate,
  formatMonthLabel,
  getAverageExpense,
  getCategoryBreakdown,
  getHighestCategory,
  getMonthlyComparison,
  getMonthlySeries,
  getTrendExtremes,
  getUniqueCategories,
  sumTransactions,
} from './utils.js'

const defaultState = createDefaultState(initialTransactions)

function loadState() {
  if (typeof window === 'undefined') {
    return defaultState
  }

  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) {
      return defaultState
    }

    const parsed = JSON.parse(saved)
    return {
      ...defaultState,
      ...parsed,
      transactions: Array.isArray(parsed.transactions) && parsed.transactions.length > 0 ? parsed.transactions : initialTransactions,
      draft: createDraft(),
      editingId: null,
      formErrors: { date: '', description: '', category: '', amount: '' },
      formNotice: '',
    }
  } catch {
    return defaultState
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [viewMode, setViewMode] = useState('table')
  const [toasts, setToasts] = useState([])
  const stateRef = useRef(state)
  const pushToastRef = useRef(() => {})

  function pushToast(message) {
    if (!message) {
      return
    }

    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2800)
  }

  useEffect(() => {
    stateRef.current = state
    pushToastRef.current = pushToast
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        transactions: state.transactions,
        role: state.role,
        theme: state.theme,
        search: state.search,
        categoryFilter: state.categoryFilter,
        typeFilter: state.typeFilter,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
      }),
    )
  }, [state.transactions, state.role, state.theme, state.search, state.categoryFilter, state.typeFilter, state.sortField, state.sortDirection])

  useEffect(() => {
    function onKeyDown(event) {
      const currentState = stateRef.current
      const target = event.target
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

      if (event.key === 'Escape' && currentState.role === 'admin' && currentState.editingId) {
        event.preventDefault()
        dispatch({ type: 'cancel-edit' })
        return
      }

      if (isTypingTarget) {
        return
      }

      const hasMod = event.metaKey || event.ctrlKey

      if (currentState.role === 'admin' && hasMod && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        dispatch({ type: 'start-create' })
        pushToastRef.current('Ready to create a new transaction.')
      }

      if (currentState.role === 'admin' && hasMod && event.key.toLowerCase() === 's') {
        event.preventDefault()
        const { isValid } = validateDraft(currentState.draft)
        dispatch({ type: 'save-transaction' })
        if (!isValid) {
          pushToastRef.current('Please fix the form errors before saving.')
        } else {
          pushToastRef.current(currentState.editingId ? 'Transaction updated.' : 'Transaction added.')
        }
      }

      if (currentState.role === 'admin' && hasMod && event.shiftKey && event.key.toLowerCase() === 'x') {
        event.preventDefault()
        const shouldDelete = window.confirm('Delete all transactions? This cannot be undone.')
        if (shouldDelete) {
          dispatch({ type: 'clear-all-transactions' })
          pushToastRef.current('All transactions were cleared.')
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const categories = useMemo(() => getUniqueCategories(state.transactions), [state.transactions])

  const summary = useMemo(() => {
    const income = sumTransactions(state.transactions, 'income')
    const expenses = sumTransactions(state.transactions, 'expense')
    const balance = startingBalance + income - expenses
    const savingsRate = income === 0 ? 0 : ((income - expenses) / income) * 100

    return {
      income,
      expenses,
      balance,
      savingsRate,
      averageExpense: getAverageExpense(state.transactions),
    }
  }, [state.transactions])

  const monthlySeries = useMemo(() => getMonthlySeries(state.transactions, startingBalance), [state.transactions])
  const categoryBreakdown = useMemo(() => getCategoryBreakdown(state.transactions), [state.transactions])
  const comparison = useMemo(() => getMonthlyComparison(monthlySeries), [monthlySeries])
  const highestCategory = useMemo(() => getHighestCategory(categoryBreakdown), [categoryBreakdown])
  const extremes = useMemo(() => getTrendExtremes(monthlySeries), [monthlySeries])

  const filteredTransactions = useMemo(() => {
    const search = state.search.trim().toLowerCase()

    const nextTransactions = state.transactions.filter((transaction) => {
      const matchesSearch =
        search.length === 0 ||
        [transaction.description, transaction.category, transaction.type, transaction.date]
          .join(' ')
          .toLowerCase()
          .includes(search)
      const matchesCategory = state.categoryFilter === 'all' || transaction.category === state.categoryFilter
      const matchesType = state.typeFilter === 'all' || transaction.type === state.typeFilter

      return matchesSearch && matchesCategory && matchesType
    })

    return nextTransactions.sort((left, right) => {
      const direction = state.sortDirection === 'asc' ? 1 : -1

      switch (state.sortField) {
        case 'amount':
          return (left.amount - right.amount) * direction
        case 'category':
          return left.category.localeCompare(right.category) * direction
        case 'description':
          return left.description.localeCompare(right.description) * direction
        case 'date':
        default:
          return left.date.localeCompare(right.date) * direction
      }
    })
  }, [state.transactions, state.search, state.categoryFilter, state.typeFilter, state.sortDirection, state.sortField])

  const chartWidth = 680
  const chartHeight = 260
  const chartPadding = { top: 24, right: 28, bottom: 40, left: 54 }
  const chartInnerWidth = chartWidth - chartPadding.left - chartPadding.right
  const chartInnerHeight = chartHeight - chartPadding.top - chartPadding.bottom

  const chartMin = extremes ? Math.min(extremes.minimum - 600, summary.balance - 600) : startingBalance
  const chartMax = extremes ? Math.max(extremes.maximum + 600, summary.balance + 600) : summary.balance + 600
  const chartRange = Math.max(chartMax - chartMin, 1)

  const chartPoints = monthlySeries.map((point, index) => {
    const x = chartPadding.left + (chartInnerWidth * index) / Math.max(monthlySeries.length - 1, 1)
    const y = chartPadding.top + ((chartMax - point.balance) / chartRange) * chartInnerHeight

    return { ...point, x, y }
  })

  const linePath = chartPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath =
    chartPoints.length > 0
      ? `${linePath} L ${chartPoints[chartPoints.length - 1]?.x ?? chartPadding.left} ${chartHeight - chartPadding.bottom} L ${chartPoints[0]?.x ?? chartPadding.left} ${chartHeight - chartPadding.bottom} Z`
      : ''

  const donutColors = ['#2563eb', '#14b8a6', '#d97706', '#c2410c', '#7c3aed', '#0f766e', '#be185d']
  const donutRadius = 78
  const donutCircumference = 2 * Math.PI * donutRadius
  const expenseTotal = categoryBreakdown.reduce((total, entry) => total + entry.amount, 0)
  const donutSegments = []
  let runningOffset = 0

  for (let index = 0; index < categoryBreakdown.length; index += 1) {
    const entry = categoryBreakdown[index]
    const length = expenseTotal === 0 ? 0 : (entry.amount / expenseTotal) * donutCircumference
    donutSegments.push({ entry, index, offset: runningOffset, length })
    runningOffset += length
  }

  const trendSummary = comparison
    ? `${comparison.currentMonth.label} net cash flow was ${formatCurrency(comparison.currentMonth.net)}.`
    : 'Add more transactions to unlock month-over-month comparison.'

  const roleDescription =
    state.role === 'admin' ? 'Can add, edit, and delete transactions.' : 'Read-only view with full data visibility.'

  const noResultsMessage = filteredTransactions.length === 0 ? 'No transactions match the current filters.' : ''

  const groupedTransactions = useMemo(() => {
    const groups = new Map()

    for (const transaction of filteredTransactions) {
      const key = transaction.date.slice(0, 7)
      const existing = groups.get(key) ?? []
      existing.push(transaction)
      groups.set(key, existing)
    }

    return Array.from(groups.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([monthKey, transactions]) => {
        const income = transactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((total, transaction) => total + transaction.amount, 0)
        const expense = transactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((total, transaction) => total + transaction.amount, 0)

        return {
          monthKey,
          label: formatMonthLabel(monthKey),
          transactions,
          income,
          expense,
          net: income - expense,
        }
      })
  }, [filteredTransactions])

  function handleExportJSON() {
    const payload = JSON.stringify(state.transactions, null, 2)
    downloadFile(payload, 'transactions.json', 'application/json')
    pushToast('Exported transactions.json')
  }

  function handleExportCSV() {
    const payload = buildTransactionsCsv(state.transactions)
    downloadFile(payload, 'transactions.csv', 'text/csv;charset=utf-8')
    pushToast('Exported transactions.csv')
  }

  function handleCancelEdit() {
    dispatch({ type: 'cancel-edit' })
    pushToast('Edit cancelled.')
  }

  function handleSaveTransaction() {
    const { isValid } = validateDraft(state.draft)
    dispatch({ type: 'save-transaction' })
    if (!isValid) {
      pushToast('Please fix the form errors before saving.')
      return
    }

    pushToast(state.editingId ? 'Transaction updated.' : 'Transaction added.')
  }

  function handleDeleteTransaction(transactionId) {
    dispatch({ type: 'delete-transaction', payload: transactionId })
    pushToast('Transaction deleted.')
  }

  function handleResetFilters() {
    dispatch({ type: 'reset-filters' })
    pushToast('Filters were reset.')
  }

  function handleClearAllTransactions() {
    const shouldDelete = window.confirm('Delete all transactions? This cannot be undone.')
    if (shouldDelete) {
      dispatch({ type: 'clear-all-transactions' })
      pushToast('All transactions were cleared.')
    }
  }

  return (
    <div className="app-shell" data-theme={state.theme}>
      <div className="backdrop backdrop-left" />
      <div className="backdrop backdrop-right" />
      <main className="dashboard">
        <header className="topbar card">
          <div className="brand">
            <div className="brand-mark">Z</div>
            <div>
              <p className="eyebrow">Finance dashboard</p>
              <h1>Understand cash flow at a glance</h1>
            </div>
          </div>

          <div className="toolbar">
            <label className="field compact">
              <span>Role</span>
              <select value={state.role} onChange={(event) => dispatch({ type: 'set-role', payload: event.target.value })}>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <button
              type="button"
              className="ghost-button"
              onClick={() => dispatch({ type: 'set-theme', payload: state.theme === 'light' ? 'dark' : 'light' })}
            >
              {state.theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
        </header>

        <section className="hero card">
          <div>
            <p className="eyebrow">Overview</p>
            <div className="hero-grid">
              <div>
                <h2>{formatCurrency(summary.balance)}</h2>
                <p className="muted">Current balance from mocked transactions and a simulated starting balance.</p>
              </div>
              <div className="hero-stat">
                <span>Total income</span>
                <strong>{formatCurrency(summary.income)}</strong>
              </div>
              <div className="hero-stat">
                <span>Total expenses</span>
                <strong>{formatCurrency(summary.expenses)}</strong>
              </div>
              <div className="hero-stat">
                <span>Savings rate</span>
                <strong>{summary.savingsRate.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          <div className="role-card">
            <span className="pill">{state.role.toUpperCase()}</span>
            <p>{roleDescription}</p>
            <p className="muted">The UI updates instantly when you switch roles. Admin actions stay local and persist in the browser.</p>
          </div>
        </section>

        <section className="summary-grid">
          <article className="metric card">
            <span className="metric-label">Total balance</span>
            <strong>{formatCurrency(summary.balance)}</strong>
            <p className="muted">Starting balance plus net cash flow.</p>
          </article>
          <article className="metric card">
            <span className="metric-label">Income</span>
            <strong>{formatCurrency(summary.income)}</strong>
            <p className="muted">Income transactions across the full dataset.</p>
          </article>
          <article className="metric card">
            <span className="metric-label">Expenses</span>
            <strong>{formatCurrency(summary.expenses)}</strong>
            <p className="muted">Expense transactions grouped by category.</p>
          </article>
          <article className="metric card">
            <span className="metric-label">Average expense</span>
            <strong>{formatCurrency(summary.averageExpense)}</strong>
            <p className="muted">A simple benchmark for transaction size.</p>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel card chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Trend</p>
                <h3>Balance trend</h3>
              </div>
              <span className="subtle">{monthlySeries.length} months tracked</span>
            </div>

            {monthlySeries.length > 0 ? (
              <>
                <svg className="line-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Balance trend over time">
                  <defs>
                    <linearGradient id="trendFill" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(37, 99, 235, 0.28)" />
                      <stop offset="100%" stopColor="rgba(37, 99, 235, 0.04)" />
                    </linearGradient>
                  </defs>

                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = chartPadding.top + chartInnerHeight * ratio
                    const value = chartMax - chartRange * ratio

                    return (
                      <g key={ratio}>
                        <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} />
                        <text x={14} y={y + 4}>
                          {formatCurrency(value)}
                        </text>
                      </g>
                    )
                  })}

                  <path className="area" d={areaPath} />
                  <path className="line" d={linePath} />

                  {chartPoints.map((point) => (
                    <g key={point.monthKey}>
                      <circle cx={point.x} cy={point.y} r="5" />
                      <text x={point.x} y={chartHeight - 12} textAnchor="middle">
                        {formatMonthLabel(point.monthKey)}
                      </text>
                    </g>
                  ))}
                </svg>
                <p className="chart-caption">{trendSummary}</p>
              </>
            ) : (
              <div className="empty-chart">No trend data available yet.</div>
            )}
          </article>

          <article className="panel card chart-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Spending mix</p>
                <h3>Category breakdown</h3>
              </div>
              <span className="subtle">{expenseTotal === 0 ? 'No expenses' : `${categoryBreakdown.length} categories`}</span>
            </div>

            {expenseTotal > 0 ? (
              <div className="donut-layout">
                <svg className="donut-chart" viewBox="0 0 240 240" role="img" aria-label="Spending breakdown by category">
                  <g transform="translate(120 120) rotate(-90)">
                    {donutSegments.map(({ entry, index, offset, length }) => (
                      <circle
                        key={entry.category}
                        r={donutRadius}
                        cx="0"
                        cy="0"
                        fill="transparent"
                        stroke={donutColors[index % donutColors.length]}
                        strokeWidth="22"
                        strokeDasharray={`${length} ${donutCircumference - length}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="butt"
                      />
                    ))}
                  </g>
                  <circle cx="120" cy="120" r="48" className="donut-center" />
                  <text x="120" y="114" textAnchor="middle" className="donut-total">
                    {formatCurrency(expenseTotal)}
                  </text>
                  <text x="120" y="136" textAnchor="middle" className="donut-subtitle">
                    total spending
                  </text>
                </svg>

                <div className="legend">
                  {categoryBreakdown.slice(0, 5).map((entry, index) => {
                    const share = (entry.amount / expenseTotal) * 100
                    return (
                      <div className="legend-item" key={entry.category}>
                        <span className="legend-swatch" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                        <div>
                          <strong>{entry.category}</strong>
                          <p className="muted">
                            {formatCurrency(entry.amount)} · {share.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-chart">No expense data available yet.</div>
            )}
          </article>
        </section>

        <section className="content-grid lower-grid">
          <article className="panel card transactions-panel">
            <div className="panel-header transactions-header">
              <div>
                <p className="eyebrow">Transactions</p>
                <h3>Explore activity</h3>
              </div>
              <span className="subtle">{filteredTransactions.length} visible of {state.transactions.length}</span>
            </div>

            <div className="filters">
              <label className="field search-field">
                <span>Search</span>
                <input
                  value={state.search}
                  onChange={(event) => dispatch({ type: 'set-search', payload: event.target.value })}
                  placeholder="Search description, category, date"
                />
              </label>
              <label className="field compact">
                <span>Category</span>
                <select
                  value={state.categoryFilter}
                  onChange={(event) => dispatch({ type: 'set-category-filter', payload: event.target.value })}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact">
                <span>Type</span>
                <select
                  value={state.typeFilter}
                  onChange={(event) => dispatch({ type: 'set-type-filter', payload: event.target.value })}
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>
              <label className="field compact">
                <span>Sort by</span>
                <select
                  value={state.sortField}
                  onChange={(event) => dispatch({ type: 'set-sort-field', payload: event.target.value })}
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="category">Category</option>
                  <option value="description">Description</option>
                </select>
              </label>
              <button type="button" className="ghost-button sort-toggle" onClick={() => dispatch({ type: 'toggle-sort-direction' })}>
                {state.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </button>
              <button type="button" className="ghost-button sort-toggle" onClick={handleResetFilters}>
                Reset filters
              </button>
              <button type="button" className="ghost-button sort-toggle" onClick={handleExportJSON}>
                Export JSON
              </button>
              <button type="button" className="ghost-button sort-toggle" onClick={handleExportCSV}>
                Export CSV
              </button>
            </div>

            <div className="view-switch" role="tablist" aria-label="Transaction view mode">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'table'}
                className={`view-chip ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                Table view
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'grouped'}
                className={`view-chip ${viewMode === 'grouped' ? 'active' : ''}`}
                onClick={() => setViewMode('grouped')}
              >
                Grouped by month
              </button>
              {state.role === 'admin' ? (
                <p className="shortcut-hint">Shortcuts: Cmd/Ctrl+N new, Cmd/Ctrl+S save, Esc cancel edit, Cmd/Ctrl+Shift+X clear all.</p>
              ) : null}
            </div>

            {viewMode === 'table' ? (
              <div className="table-shell">
                <table>
                  <caption className="table-caption">Recent financial transactions with filtering, sorting, and role-based actions.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Description</th>
                      <th scope="col">Category</th>
                      <th scope="col">Type</th>
                      <th className="amount-column" scope="col">Amount</th>
                      <th className="actions-column" scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state" role="status" aria-live="polite">
                            <strong>No transactions match the current filters.</strong>
                            <p className="muted">Try a broader search or clear the filters to see the full list.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{formatDate(transaction.date)}</td>
                          <td>
                            <div className="description-cell">
                              <strong>{transaction.description}</strong>
                              {transaction.note ? <span className="muted">{transaction.note}</span> : null}
                            </div>
                          </td>
                          <td>{transaction.category}</td>
                          <td>
                            <span className={`type-pill ${transaction.type}`}>{transaction.type}</span>
                          </td>
                          <td className={`amount-column ${transaction.type}`}>
                            {transaction.type === 'expense' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </td>
                          <td className="actions-column">
                            <div className="row-actions">
                              <button
                                type="button"
                                className="table-button"
                                disabled={state.role !== 'admin'}
                                onClick={() => dispatch({ type: 'start-edit', payload: transaction })}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="table-button danger"
                                disabled={state.role !== 'admin'}
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grouped-shell">
                {groupedTransactions.length === 0 ? (
                  <div className="empty-state" role="status" aria-live="polite">
                    <strong>No transactions match the current filters.</strong>
                    <p className="muted">Try a broader search or clear the filters to see the full list.</p>
                  </div>
                ) : (
                  groupedTransactions.map((group) => (
                    <section className="month-group" key={group.monthKey}>
                      <header className="month-header">
                        <h4>{group.label}</h4>
                        <div className="month-metrics">
                          <span className="income">Income {formatCurrency(group.income)}</span>
                          <span className="expense">Expense {formatCurrency(group.expense)}</span>
                          <span className={group.net >= 0 ? 'income' : 'expense'}>Net {formatCurrency(group.net)}</span>
                        </div>
                      </header>
                      <div className="month-list">
                        {group.transactions.map((transaction) => (
                          <article className="month-row" key={transaction.id}>
                            <div>
                              <strong>{transaction.description}</strong>
                              <p className="muted">{formatDate(transaction.date)} · {transaction.category}</p>
                            </div>
                            <span className={`amount-column ${transaction.type}`}>
                              {transaction.type === 'expense' ? '-' : '+'}
                              {formatCurrency(transaction.amount)}
                            </span>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}
            <p className="sr-only" aria-live="polite">{noResultsMessage}</p>
          </article>

          <aside className="side-column">
            <article className="panel card insight-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Insights</p>
                  <h3>Quick observations</h3>
                </div>
              </div>

              <div className="insight-list">
                <div className="insight-item">
                  <span>Highest spending category</span>
                  <strong>{highestCategory ? `${highestCategory.category} · ${formatCurrency(highestCategory.amount)}` : 'No spending yet'}</strong>
                </div>
                <div className="insight-item">
                  <span>Monthly comparison</span>
                  <strong>
                    {comparison
                      ? `${comparison.currentMonth.label} is ${comparison.delta >= 0 ? 'up' : 'down'} ${formatCurrency(Math.abs(comparison.delta))} vs ${comparison.previousMonth.label}`
                      : 'Add another month to compare'}
                  </strong>
                </div>
                <div className="insight-item">
                  <span>Cash flow observation</span>
                  <strong>
                    {summary.savingsRate >= 0
                      ? `You retained ${summary.savingsRate.toFixed(1)}% of income.`
                      : 'Expenses are currently above income.'}
                  </strong>
                </div>
              </div>
            </article>

            {state.role === 'admin' ? (
              <article className="panel card form-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Admin tools</p>
                    <h3>{state.editingId ? 'Edit transaction' : 'Add transaction'}</h3>
                  </div>
                  <div className="inline-actions">
                    {state.editingId ? (
                      <button type="button" className="ghost-button tiny" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                    ) : null}
                    <button type="button" className="ghost-button tiny danger" onClick={handleClearAllTransactions}>
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <label className={`field ${state.formErrors.date ? 'error' : ''}`}>
                    <span>Date</span>
                    <input
                      type="date"
                      value={state.draft.date}
                      onChange={(event) => dispatch({ type: 'update-draft', payload: { date: event.target.value } })}
                      aria-invalid={Boolean(state.formErrors.date)}
                    />
                    {state.formErrors.date ? <small className="field-error">{state.formErrors.date}</small> : null}
                  </label>
                  <label className={`field ${state.formErrors.amount ? 'error' : ''}`}>
                    <span>Amount</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={state.draft.amount}
                      onChange={(event) => dispatch({ type: 'update-draft', payload: { amount: event.target.value } })}
                      placeholder="0"
                      aria-invalid={Boolean(state.formErrors.amount)}
                    />
                    {state.formErrors.amount ? <small className="field-error">{state.formErrors.amount}</small> : null}
                  </label>
                  <label className={`field full-span ${state.formErrors.description ? 'error' : ''}`}>
                    <span>Description</span>
                    <input
                      value={state.draft.description}
                      onChange={(event) => dispatch({ type: 'update-draft', payload: { description: event.target.value } })}
                      placeholder="Transaction description"
                      aria-invalid={Boolean(state.formErrors.description)}
                    />
                    {state.formErrors.description ? <small className="field-error">{state.formErrors.description}</small> : null}
                  </label>
                  <label className={`field ${state.formErrors.category ? 'error' : ''}`}>
                    <span>Category</span>
                    <input
                      value={state.draft.category}
                      onChange={(event) => dispatch({ type: 'update-draft', payload: { category: event.target.value } })}
                      placeholder="Category"
                      aria-invalid={Boolean(state.formErrors.category)}
                    />
                    {state.formErrors.category ? <small className="field-error">{state.formErrors.category}</small> : null}
                  </label>
                  <label className="field">
                    <span>Type</span>
                    <select
                      value={state.draft.type}
                      onChange={(event) => dispatch({ type: 'update-draft', payload: { type: event.target.value } })}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </label>
                  <label className="field full-span">
                    <span>Note</span>
                    <input
                      value={state.draft.note}
                      onChange={(event) => dispatch({ type: 'update-draft', payload: { note: event.target.value } })}
                      placeholder="Optional note"
                    />
                  </label>
                </div>

                <button type="button" className="primary-button" onClick={handleSaveTransaction}>
                  {state.editingId ? 'Save changes' : 'Add transaction'}
                </button>
              </article>
            ) : (
              <article className="panel card note-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Access</p>
                    <h3>Viewer mode</h3>
                  </div>
                </div>
                <p className="muted">Switch to Admin to add, edit, or delete transactions. Viewer mode keeps the data read-only.</p>
              </article>
            )}
          </aside>
        </section>
      </main>
      <p className="sr-only" aria-live="polite">{state.formNotice}</p>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
