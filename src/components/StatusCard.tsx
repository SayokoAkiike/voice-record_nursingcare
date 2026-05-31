import type { ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  children: ReactNode;
}

export const StatusCard = ({ title, children }: StatusCardProps) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
    <div className="mt-3 text-sm text-slate-900">{children}</div>
  </section>
);
