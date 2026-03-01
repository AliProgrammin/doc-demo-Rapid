import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard, Upload, ArrowLeftRight,
  Receipt, FileCheck2, History,
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--white)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--white)',
        borderRight: '2px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{
          padding: '20px 20px 18px',
          borderBottom: '2px solid var(--border)',
          background: 'var(--yellow)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', lineHeight: 1.6, letterSpacing: '0.05em', color: 'var(--dark)' }}>
            RAPID<br />DOC
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '0.62rem', fontWeight: 500, color: 'var(--dark)', marginTop: 6, opacity: 0.7, letterSpacing: '0.04em' }}>
            OCR · RECONCILE
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <Link key={to} to={to} style={{ display: 'block' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '10px 20px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--dark)' : 'var(--mid)',
                  background: active ? 'var(--yellow)' : 'transparent',
                  borderLeft: `3px solid ${active ? 'var(--border)' : 'transparent'}`,
                  transition: 'all 0.1s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--yellow-pale)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                  {label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '2px solid var(--border)',
          background: 'var(--light)',
        }}>
          <div className="label" style={{ color: 'var(--mid)', marginBottom: 4 }}>/ API</div>
          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: '#16A34A', borderRadius: '50%', flexShrink: 0 }} />
            localhost:8000
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
