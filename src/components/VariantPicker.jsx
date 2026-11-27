/** Size and color selectors. Each option shows whether it is available in the current selection. */
export default function VariantPicker({ label, options, selected, isAvailable, onSelect }) {
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
              aria-pressed={active}
              className={`min-h-11 min-w-11 rounded-full border px-4 text-sm transition duration-300 ${
                active
                  ? 'border-lime-500 bg-lime-500 font-semibold text-midnight shadow-lime'
                  : available
                    ? 'border-white/15 text-soft/85 hover:border-lime-500/60 hover:text-lime-400'
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
