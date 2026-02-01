import React, { useState } from 'react';
import { ArrowLeftRight, FileText, Layers } from 'lucide-react';
import RapprochementApp from './RapprochementApp';
import ConvertisseurBordereau from './ConvertisseurBordereau';

export default function App() {
  const [currentApp, setCurrentApp] = useState<'rappro' | 'convert'>('rappro');

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