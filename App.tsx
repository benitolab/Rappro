import React, { useState } from 'react';
import { ArrowLeftRight, FileText, Layers, Lock, LogIn } from 'lucide-react';
import RapprochementApp from './RapprochementApp';
import ConvertisseurBordereau from './ConvertisseurBordereau';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [currentApp, setCurrentApp] = useState<'rappro' | 'convert'>('rappro');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '@Century21') {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-indigo-100 p-3 rounded-full mb-4">
              <Lock className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Accès Sécurisé</h1>
            <p className="text-slate-500 text-sm mt-1">Suite Financière</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`w-full p-3 border rounded-lg outline-none focus:ring-2 transition-all ${error ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                placeholder="Entrez le code d'accès..."
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-1 pl-1">Mot de passe incorrect</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Se Connecter
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">Accès réservé au personnel autorisé</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Global Navigation Bar */}
      <nav className="bg-slate-800 text-white shadow-md z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-14 space-x-8">
            <div className="flex items-center gap-2 font-bold text-lg text-indigo-400">
              <Layers size={24} />
              <span>SUITE FINANCIÈRE</span>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentApp('rappro')}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors border-b-4 ${currentApp === 'rappro'
                    ? 'bg-slate-700 text-white border-indigo-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700 border-transparent'
                  }`}
              >
                <ArrowLeftRight size={18} />
                <span>Rapprochement Bancaire</span>
              </button>

              <button
                onClick={() => setCurrentApp('convert')}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors border-b-4 ${currentApp === 'convert'
                    ? 'bg-slate-700 text-white border-indigo-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700 border-transparent'
                  }`}
              >
                <FileText size={18} />
                <span>Convertisseur Bordereau</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {currentApp === 'rappro' ? <RapprochementApp /> : <ConvertisseurBordereau />}
      </main>
    </div>
  );
}