import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Cloud, Upload, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { subscribeToWatchlist, WatchlistItem } from '../services/db';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Settings = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToWatchlist(user.uid, items => setWatchlist(items));
      return () => unsubscribe();
    }
  }, [user]);

  const watchedCount = watchlist.filter(item => item.status === 'completed').length;
  const moviesCount = watchlist.filter(item => item.type === 'movie').length;
  const seriesCount = watchlist.filter(item => item.type === 'series').length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleExport = () => {
    if (!watchlist.length) return;
    const blob = new Blob([JSON.stringify(watchlist, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchlist_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          let count = 0;
          for (const item of importedData) {
            if (item.mediaId && item.type) {
              const docId = `${user.uid}_${item.type}_${item.mediaId}`;
              await setDoc(
                doc(db, 'watchlist', docId),
                { ...item, id: docId, userId: user.uid, updatedAt: new Date().toISOString() },
                { merge: true }
              );
              count++;
            }
          }
          alert(`Importation réussie ! ${count} éléments importés.`);
        } else {
          alert('Format invalide. Le fichier doit contenir un tableau JSON.');
        }
      } catch {
        alert("Erreur lors de l'importation.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-dark/90 backdrop-blur-xl pt-12 pb-4 px-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-muted hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-heading font-bold tracking-widest uppercase text-white">Paramètres</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 pb-28 flex flex-col gap-8">
        {/* Profil */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full h-24 w-24 ring-2 ring-primary glow-primary"
            style={{ backgroundImage: `url('${user.photoURL || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop'}')` }}
          />
          <div className="text-center">
            <h2 className="text-2xl font-heading font-bold text-white uppercase tracking-wide">{user.displayName}</h2>
            <p className="text-muted text-sm mt-1">{user.email}</p>
            <div className="absolute -bottom-1 -right-1" />
          </div>
        </div>

        {/* Stats */}
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-heading mb-3">Statistiques</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-dark rounded-xl p-4 flex flex-col items-center gap-1 border border-white/5 hover:border-primary/30 transition-colors">
              <span className="text-primary font-heading text-3xl font-bold">{moviesCount}</span>
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Films</span>
            </div>
            <div className="bg-surface-dark rounded-xl p-4 flex flex-col items-center gap-1 border border-white/5 hover:border-primary/30 transition-colors">
              <span className="text-primary font-heading text-3xl font-bold">{seriesCount}</span>
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Séries</span>
            </div>
            <div className="bg-surface-dark rounded-xl p-4 flex flex-col items-center gap-1 border border-white/5 hover:border-primary/30 transition-colors">
              <span className="text-primary font-heading text-3xl font-bold">{watchedCount}</span>
              <span className="text-muted text-xs uppercase tracking-wider font-semibold">Terminés</span>
            </div>
          </div>
        </div>

        {/* Thème */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-widest font-heading">Thème de couleur</p>
          <div className="flex gap-4 p-3 bg-surface-dark rounded-2xl border border-white/5 w-fit">
            {([['cyan', '#0a06f9'], ['matrix', '#00FF41'], ['pink', '#FF00FF']] as const).map(([t, color]) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                aria-label={`Thème ${t}`}
                className={`w-10 h-10 rounded-full transition-all ${theme === t ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-dark scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Données */}
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted uppercase tracking-widest font-heading">Gestion des données</p>
          <div className="bg-surface-dark rounded-xl p-4 flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <Cloud className="text-muted" size={22} />
              <div>
                <p className="text-white font-semibold text-sm">Synchronisation Cloud</p>
                <p className="text-muted text-xs">Sauvegarde automatique</p>
              </div>
            </div>
            <div className="relative inline-block w-12 h-6 select-none">
              <input defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-text-light border-4 border-primary appearance-none cursor-pointer checked:right-0 right-6 z-10" id="sync-toggle" name="toggle" type="checkbox" />
              <label className="toggle-label block overflow-hidden h-6 rounded-full bg-primary/30 cursor-pointer" htmlFor="sync-toggle"></label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-surface-dark hover:border-primary/50 transition-all font-heading uppercase text-sm"
            >
              <Upload size={18} /> Exporter
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/10 text-white hover:bg-surface-dark hover:border-primary/50 transition-all font-heading uppercase text-sm"
            >
              <Download size={18} /> Importer
            </button>
          </div>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-all font-heading uppercase tracking-wider text-sm"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Settings;
