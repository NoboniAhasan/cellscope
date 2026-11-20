export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-800">CellScope</h1>
      </header>
      <main className="flex-1 p-6">
        <p className="text-slate-600">CellScope Frontend initialized.</p>
      </main>
      <footer className="bg-slate-100 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 text-center">
        For educational/research use. Not for medical diagnosis.
      </footer>
    </div>
  );
}
