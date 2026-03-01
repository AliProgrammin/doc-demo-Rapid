import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/Upload'
import Transactions from './pages/Transactions'
import Invoices from './pages/Invoices'
import Reconciliation from './pages/Reconciliation'
import Corrections from './pages/Corrections'

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Dashboard })
const uploadRoute = createRoute({ getParentRoute: () => rootRoute, path: '/upload', component: UploadPage })
const transactionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/transactions', component: Transactions })
const invoicesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/invoices', component: Invoices })
const reconciliationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reconciliation', component: Reconciliation })
const correctionsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/corrections', component: Corrections })

const routeTree = rootRoute.addChildren([
  indexRoute, uploadRoute, transactionsRoute,
  invoicesRoute, reconciliationRoute, correctionsRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
