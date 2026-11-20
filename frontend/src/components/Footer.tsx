export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-slate-500">
        <p className="font-medium text-slate-600 flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
          <span className="font-semibold text-slate-700">⚠️ Notice:</span>
          <span>For educational/research use. Not for medical diagnosis.</span>
        </p>
        <p className="text-[11px] text-slate-400">
          CellScope Platform — Educational Software Engineering Lab Project
        </p>
      </div>
    </footer>
  );
}
