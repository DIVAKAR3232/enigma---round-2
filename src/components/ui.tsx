import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type Tone = 'cyan' | 'pink' | 'yellow' | 'green' | 'red' | 'slate';

const TONES: Record<Tone, string> = {
  cyan: 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25',
  pink: 'border-neon-pink bg-neon-pink/15 text-neon-pink hover:bg-neon-pink/25',
  yellow: 'border-neon-yellow bg-neon-yellow/15 text-neon-yellow hover:bg-neon-yellow/25',
  green: 'border-neon-green bg-neon-green/15 text-neon-green hover:bg-neon-green/25',
  red: 'border-neon-red bg-neon-red/15 text-neon-red hover:bg-neon-red/25',
  slate: 'border-line bg-panel-2 text-slate-200 hover:bg-line',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Button({ tone = 'cyan', size = 'md', className = '', ...props }: ButtonProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-4 text-lg',
    xl: 'px-6 py-6 text-2xl',
  };
  return (
    <button
      type="button"
      {...props}
      className={[
        'rounded-xl border-2 font-display font-bold tracking-wider transition active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100',
        TONES[tone],
        sizes[size],
        className,
      ].join(' ')}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-panel/90 p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function Alert({ tone = 'red', children }: { tone?: 'red' | 'green' | 'yellow'; children: ReactNode }) {
  const cls = {
    red: 'border-neon-red/60 bg-neon-red/10 text-red-200',
    green: 'border-neon-green/60 bg-neon-green/10 text-green-200',
    yellow: 'border-neon-yellow/60 bg-neon-yellow/10 text-yellow-100',
  }[tone];
  return (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

/** Admin page shell with header navigation. */
export function AdminLayout({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="font-display text-sm font-black tracking-widest text-neon-cyan">
            KEYBOARD<span className="text-neon-pink">BALL</span>
          </Link>
          {user?.role === 'ORGANIZER' && (
            <nav className="flex flex-wrap gap-4 text-sm text-slate-300">
              <Link className="hover:text-white" to="/dashboard">Dashboard</Link>
              <Link className="hover:text-white" to="/organizer">Organizer</Link>
              <Link className="hover:text-white" to="/settings">Settings</Link>
              <Link className="hover:text-white" to="/words">Words</Link>
              <Link className="hover:text-white" to="/players">Players</Link>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link to="/account" className="text-slate-400 hover:text-white">{user?.username}</Link>
            <Button
              size="sm"
              tone="slate"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              LOG OUT
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-black tracking-wide text-white sm:text-3xl">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: Tone;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'red', onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      open
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 z-50 m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-panel p-6 text-white backdrop:bg-black/70"
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title" className="font-display text-xl font-black">{title}</h2>
      <div className="mt-3 text-slate-300">{message}</div>
      <div className="mt-6 flex justify-end gap-3">
        <Button tone="slate" onClick={onCancel}>CANCEL</Button>
        <Button tone={tone} onClick={onConfirm} autoFocus>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
