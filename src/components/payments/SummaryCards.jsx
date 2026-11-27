import { formatPKR } from '../../lib/format';

export default function SummaryCards({ summary }) {
  if (!summary) return <p role="status" className="text-sm text-[#91A0B5]">Loading balance…</p>;
  const items = [
    { label: 'Owes', value: summary.outstanding, tone: Number(summary.outstanding) > 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Credit limit', value: summary.credit_limit },
    { label: 'Available credit', value: summary.available_credit, tone: 'text-[#FF9A45]' },
    { label: 'Overdue', value: summary.overdue, tone: Number(summary.overdue) > 0 ? 'text-red-400' : undefined },
    { label: 'Total purchases', value: summary.total_purchases },
    { label: 'Total payments', value: summary.total_payments },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-[#253244] bg-[#111A25] p-3">
          <p className="text-xs uppercase tracking-wide text-[#91A0B5]">{i.label}</p>
          <p className={`mt-1 font-semibold ${i.tone ?? ''}`}>{formatPKR(i.value)}</p>
        </div>
      ))}
    </div>
  );
}
