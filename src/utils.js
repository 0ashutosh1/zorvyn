const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const monthFormatter = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
})

export function formatCurrency(value) {
  return currencyFormatter.format(value)
}

export function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00`))
}

export function formatMonthLabel(monthKey) {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00`))
}

export function getMonthKey(value) {
  return value.slice(0, 7)
}

export function getUniqueCategories(transactions) {
  return Array.from(new Set(transactions.map((transaction) => transaction.category))).sort((left, right) => left.localeCompare(right))
}

export function sumTransactions(transactions, type) {
  return transactions.reduce((total, transaction) => {
    if (type && transaction.type !== type) {
      return total
    }

    return total + transaction.amount
  }, 0)
}

export function getMonthlySeries(transactions, startingBalance) {
  const grouped = new Map()

  for (const transaction of transactions) {
    const monthKey = getMonthKey(transaction.date)
    const bucket = grouped.get(monthKey) ?? { income: 0, expense: 0 }

    if (transaction.type === 'income') {
      bucket.income += transaction.amount
    } else {
      bucket.expense += transaction.amount
    }

    grouped.set(monthKey, bucket)
  }

  const monthKeys = Array.from(grouped.keys()).sort()
  const series = []

  let balance = startingBalance

  for (const monthKey of monthKeys) {
    const month = grouped.get(monthKey)

    if (!month) {
      continue
    }

    const net = month.income - month.expense
    balance += net

    series.push({
      monthKey,
      label: formatMonthLabel(monthKey),
      income: month.income,
      expense: month.expense,
      net,
      balance,
    })
  }

  return series
}

export function getCategoryBreakdown(transactions) {
  const grouped = new Map()

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue
    }

    grouped.set(transaction.category, (grouped.get(transaction.category) ?? 0) + transaction.amount)
  }

  return Array.from(grouped.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount)
}

export function getMonthlyComparison(series) {
  if (series.length < 2) {
    return null
  }

  const currentMonth = series[series.length - 1]
  const previousMonth = series[series.length - 2]
  const delta = currentMonth.net - previousMonth.net
  const percentChange = previousMonth.net === 0 ? null : (delta / Math.abs(previousMonth.net)) * 100

  return {
    currentMonth,
    previousMonth,
    delta,
    percentChange,
  }
}

export function getHighestCategory(breakdown) {
  return breakdown[0] ?? null
}

export function getAverageExpense(transactions) {
  const expenses = transactions.filter((transaction) => transaction.type === 'expense')
  if (expenses.length === 0) {
    return 0
  }

  return sumTransactions(expenses) / expenses.length
}

export function getTrendExtremes(series) {
  if (series.length === 0) {
    return null
  }

  const balances = series.map((entry) => entry.balance)
  return {
    minimum: Math.min(...balances),
    maximum: Math.max(...balances),
  }
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

export function buildTransactionsCsv(transactions) {
  const header = ['id', 'date', 'description', 'category', 'type', 'amount', 'note']
  const rows = transactions.map((transaction) => [
    transaction.id,
    transaction.date,
    transaction.description,
    transaction.category,
    transaction.type,
    transaction.amount,
    transaction.note ?? '',
  ])

  return [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')
}