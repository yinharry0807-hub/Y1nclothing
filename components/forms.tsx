export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export const labelClass = "mb-1 block text-xs font-medium text-slate-600";

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

export function FormActions({
  onCancel,
  submitting,
  submitLabel = "保存",
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        取消
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "保存中…" : submitLabel}
      </button>
    </div>
  );
}
