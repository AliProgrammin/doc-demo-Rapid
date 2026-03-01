import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard, Upload, ArrowLeftRight, Receipt,
  FileCheck2, History, ChevronRight, Zap
} from 'lucide-react'

const nav = [
  { to: '/',               label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/upload',         label: 'Upload & Extract', icon: Upload },
  { to: '/transactions',   label: 'Transactions',     icon: ArrowLeftRight },
  { to: '/invoices',       label: 'Invoices',         icon: Receipt },
  { to: '/reconciliation', label: 'Reconciliation',   icon: FileCheck2 },
  { to: '/corrections',    label: 'Corrections',      icon: History },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 224,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30,
              background: 'var(--accent)',
              borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(34,197,94,0.3)',
            }}>
              <Zap size={16} color="#020617" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>RapidDoc</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: -2 }}>OCR · Reconcile</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <Link key={to} to={to} style={{ display: 'block', marginBottom: 2 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  background: active ? 'rgba(34,197,94,0.08)' : 'transparent',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}>
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={13} />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>●</span> API localhost:8000
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
