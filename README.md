# Finance Dashboard UI

A clean React + JavaScript dashboard for exploring mocked finance data. The app is frontend-only and demonstrates summary cards, a balance trend chart, a categorical spending breakdown, filtered transaction browsing, simulated role-based behavior, insights, and local persistence.

## Approach

- Single-page React dashboard with reducer-driven state to keep UI behavior predictable.
- Data model and utilities are separated from rendering (`src/data.js`, `src/utils.js`, `src/state.js`) to make logic reusable and testable.
- Dashboard metrics and chart datasets are derived with memoized selectors (`useMemo`) from transactions.
- Role simulation is entirely frontend-side: viewer is read-only, admin can create/edit/delete.
- Persistence is handled with localStorage hydration plus save-on-change.
- Accessibility touches include ARIA labels for charts, live regions for status updates, and readable table semantics.

## Features

- Overview cards for total balance, income, expenses, and average expense.
- Time-based balance trend chart and categorical spending breakdown chart.
- Transaction table with search, category filtering, type filtering, and sorting.
- Viewer and admin roles controlled entirely on the frontend.
- Admin-only add/edit/delete form for local transaction management.
- Simple insights panel with monthly comparison and highest spending category.
- Local storage persistence for transactions, role, theme, and filters.
- Responsive layout with light and dark theme support.

## Requirement Mapping

| Assignment Requirement | Implemented In This Project |
| --- | --- |
| Dashboard overview cards | Total balance, income, expenses, savings rate, average expense cards in the main dashboard |
| Time-based visualization | SVG balance trend chart with month-wise progression |
| Categorical visualization | SVG donut chart for expense category breakdown |
| Transaction list | Full transaction table with date, description, category, type, amount, and optional note |
| Filtering | Search, category filter, and type filter |
| Sorting or search | Both implemented: sort field + direction and text search |
| Role-based UI | Viewer (read-only) and Admin (create, edit, delete) with role switch dropdown |
| Insights section | Highest spending category, monthly comparison, and cash-flow observation |
| State management | Reducer-driven state, memoized derived data, local persistence for key UI state |
| Responsive design | Multi-breakpoint CSS layout with mobile adjustments and graceful overflow handling |
| Empty/no-data handling | Empty states for charts and transaction results |

## Evaluator Checklist

- Design and creativity: Intentional visual hierarchy, custom typography, gradient atmosphere, and chart styling.
- Responsiveness: Works across desktop and mobile breakpoints with stacked layouts.
- Functionality: Dashboard metrics, charting, transaction interactions, role simulation, and export options work locally.
- User experience: Inline form validation, live status messaging, toasts, and keyboard shortcuts for admin actions.
- Technical quality: Separated data/state/utils modules, reducer-based updates, memoized computations, and tests.
- State management approach: Centralized reducer with predictable action handling and persisted UI preferences.
- Documentation quality: Setup, build, test instructions, approach summary, and requirement mapping included.
- Attention to detail: Handles empty states, sorting/filter edge cases, and role-restricted action paths.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy To GitHub Pages

This repository includes a workflow at `.github/workflows/deploy-pages.yml` that builds Vite output from `dist` and publishes it to GitHub Pages.

1. Push `main` branch to GitHub.
2. In GitHub repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Wait for the **Deploy to GitHub Pages** workflow to complete.
5. Open: `https://0ashutosh1.github.io/zorvyn/`

If you open `https://0ashutosh1.github.io/` directly, you may see a blank/incorrect page because this is a project site served under `/zorvyn/`.

## Test

```bash
npm run test:run
```

## Notes

- The data is static and fully mocked in the frontend.
- All edits are stored in the browser using localStorage.
- The UI is designed to degrade gracefully when filters return no data.
