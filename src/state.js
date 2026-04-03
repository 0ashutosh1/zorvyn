const today = new Date().toISOString().slice(0, 10)

export const storageKey = 'zorvyn-finance-dashboard'

export function createDraft() {
  return {
    date: today,
    description: '',
    category: '',
    amount: '',
    type: 'expense',
    note: '',
  }
}

export function validateDraft(draft) {
  const errors = {
    date: '',
    description: '',
    category: '',
    amount: '',
  }

  if (!draft.date) {
    errors.date = 'Date is required.'
  }

  if (!draft.description.trim()) {
    errors.description = 'Description is required.'
  }

  if (!draft.category.trim()) {
    errors.category = 'Category is required.'
  }

  const amount = Number(draft.amount)
  if (Number.isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than 0.'
  }

  return {
    errors,
    isValid: !errors.date && !errors.description && !errors.category && !errors.amount,
  }
}

export function createDefaultState(initialTransactions) {
  return {
    transactions: initialTransactions,
    role: 'viewer',
    theme: 'light',
    search: '',
    categoryFilter: 'all',
    typeFilter: 'all',
    sortField: 'date',
    sortDirection: 'desc',
    editingId: null,
    draft: createDraft(),
    formErrors: {
      date: '',
      description: '',
      category: '',
      amount: '',
    },
    formNotice: '',
  }
}

export function reducer(state, action) {
  switch (action.type) {
    case 'set-role':
      return {
        ...state,
        role: action.payload,
        editingId: action.payload === 'viewer' ? null : state.editingId,
        formNotice: '',
      }
    case 'set-theme':
      return { ...state, theme: action.payload, formNotice: '' }
    case 'set-search':
      return { ...state, search: action.payload }
    case 'set-category-filter':
      return { ...state, categoryFilter: action.payload }
    case 'set-type-filter':
      return { ...state, typeFilter: action.payload }
    case 'set-sort-field':
      return { ...state, sortField: action.payload }
    case 'toggle-sort-direction':
      return { ...state, sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' }
    case 'reset-filters':
      return {
        ...state,
        search: '',
        categoryFilter: 'all',
        typeFilter: 'all',
        sortField: 'date',
        sortDirection: 'desc',
        formNotice: 'Filters were reset.',
      }
    case 'start-create':
      return {
        ...state,
        editingId: null,
        draft: createDraft(),
        formErrors: { date: '', description: '', category: '', amount: '' },
        formNotice: '',
      }
    case 'start-edit':
      if (state.role !== 'admin') {
        return state
      }

      return {
        ...state,
        editingId: action.payload.id,
        draft: {
          date: action.payload.date,
          description: action.payload.description,
          category: action.payload.category,
          amount: String(action.payload.amount),
          type: action.payload.type,
          note: action.payload.note ?? '',
        },
        formErrors: { date: '', description: '', category: '', amount: '' },
        formNotice: '',
      }
    case 'cancel-edit':
      return {
        ...state,
        editingId: null,
        draft: createDraft(),
        formErrors: { date: '', description: '', category: '', amount: '' },
        formNotice: 'Edit cancelled.',
      }
    case 'update-draft': {
      const updatedDraft = { ...state.draft, ...action.payload }
      const updatedErrors = { ...state.formErrors }

      for (const key of Object.keys(action.payload)) {
        if (key in updatedErrors) {
          updatedErrors[key] = ''
        }
      }

      return { ...state, draft: updatedDraft, formErrors: updatedErrors, formNotice: '' }
    }
    case 'save-transaction': {
      if (state.role !== 'admin') {
        return state
      }

      const { errors, isValid } = validateDraft(state.draft)
      if (!isValid) {
        return {
          ...state,
          formErrors: errors,
          formNotice: 'Please fix the form errors before saving.',
        }
      }

      const transaction = {
        id: state.editingId ?? crypto.randomUUID(),
        date: state.draft.date,
        description: state.draft.description.trim(),
        category: state.draft.category.trim(),
        type: state.draft.type,
        amount: Number(state.draft.amount),
        note: state.draft.note.trim() || undefined,
      }

      const transactions =
        state.editingId === null
          ? [transaction, ...state.transactions]
          : state.transactions.map((entry) => (entry.id === state.editingId ? transaction : entry))

      return {
        ...state,
        transactions,
        editingId: null,
        draft: createDraft(),
        formErrors: { date: '', description: '', category: '', amount: '' },
        formNotice: state.editingId ? 'Transaction updated.' : 'Transaction added.',
      }
    }
    case 'delete-transaction':
      if (state.role !== 'admin') {
        return state
      }

      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.payload),
        editingId: state.editingId === action.payload ? null : state.editingId,
        draft: state.editingId === action.payload ? createDraft() : state.draft,
        formNotice: 'Transaction deleted.',
      }
    case 'clear-all-transactions':
      if (state.role !== 'admin') {
        return state
      }

      return {
        ...state,
        transactions: [],
        editingId: null,
        draft: createDraft(),
        formErrors: { date: '', description: '', category: '', amount: '' },
        formNotice: 'All transactions were cleared.',
      }
    default:
      return state
  }
}
