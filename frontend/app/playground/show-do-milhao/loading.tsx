export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
          <span className="text-4xl">💰</span>
        </div>
        <p className="text-slate-400">Carregando...</p>
      </div>
    </div>
  );
}
