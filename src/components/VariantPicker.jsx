/** Size and color selectors. Each option shows whether it is available in the current selection. */
export default function VariantPicker({ label, options, selected, isAvailable, onSelect, accent = 'lime' }) {
  const activeClasses = accent === 'orange'
    ? 'border-[#FF7818] bg-[#FF7818] font-semibold text-white'
    : 'border-lime-500 bg-lime-500 font-semibold text-midnight shadow-lime';
  const availableClasses = accent === 'orange'
    ? 'border-white/15 text-soft/85 hover:border-[#FF7818]/60 hover:text-[#FF9A45]'
    : 'border-white/15 text-soft/85 hover:border-lime-500/60 hover:text-lime-400';

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs uppercase tracking-[0.2em] text-soft/50">
        {label}: <span className="text-soft/90 normal-case tracking-normal">{selected}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const available = isAvailable(opt);
          const active = opt === selected;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(opt)}
              disabled={!available}
              aria-pressed={active}
              className={`min-h-11 min-w-11 rounded-full border px-4 text-sm transition duration-300 disabled:cursor-not-allowed ${
                active
                  ? activeClasses
                  : available
                    ? availableClasses
                    : 'border-white/5 text-soft/30 line-through hover:border-white/15'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
