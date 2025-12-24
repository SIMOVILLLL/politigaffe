import React, { useState, useEffect } from 'react';
import { Home, Info, AlertTriangle, Search, ArrowLeft, FileText, ChevronRight, Settings, Trash2, Newspaper, Lock, LogOut, Printer, Menu, X, Edit3, Save, PlusCircle, Cloud, CloudOff, Upload, CheckCircle, Loader2 } from 'lucide-react';

// --- IMPORT NECESSARI PER FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, setDoc, writeBatch } from "firebase/firestore";

// --- CONFIGURAZIONE FIREBASE ---
// NOTA: Assicurati che le regole di Firestore siano impostate su "allow read, write: if true;"
// per i test, altrimenti le scritture falliranno.
const firebaseConfig = {
  apiKey: "AIzaSyClzaGSuhKFnrQ_VOmJNIZXt3Yjp8ASCNU", 
  authDomain: "politigaffee.firebaseapp.com",
  projectId: "politigaffee",
  storageBucket: "politigaffee.firebasestorage.app",
  messagingSenderId: "686263197942",
  appId: "1:686263197942:web:4e0c680afb54397a190cd7"
};

// Inizializzazione sicura del Database
let dbFire = null;
try {
    const app = initializeApp(firebaseConfig);
    dbFire = getFirestore(app);
    console.log("Firebase inizializzato.");
} catch (e) {
    console.error("Errore critico connessione Firebase:", e);
}

// Password Admin (Demo Client-Side)
const ADMIN_PASSWORD = "admin123"; 

const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/800x450?text=Nessuna+Immagine';
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return url;
};

// --- DATABASE DI BACKUP (SEED DATA) ---
const staticPoliticians = [
    { id: 'meloni', name: 'Giorgia Meloni', party: 'FdI', role: 'Presidente del Consiglio', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giorgia&backgroundColor=ffdfbf', banner: 'bg-blue-900', bio: "Io sono Giorgia, sono una donna, sono una madre, sono cristiana.", stats: { followers: '3.1M', gaffes: 112, incoherences: 88 }, posts: [], inconsistencies: [] },
    { id: 'salvini', name: 'Matteo Salvini', party: 'Lega', role: 'Ministro Infrastrutture', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo&backgroundColor=b6e3f4', banner: 'bg-green-700', bio: "Prima gli italiani, poi il Ponte, poi il terzo mandato.", stats: { followers: '2.5M', gaffes: 1420, incoherences: 9000 }, posts: [], inconsistencies: [] },
    { id: 'schlein', name: 'Elly Schlein', party: 'PD', role: 'Segretaria PD', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elly&backgroundColor=ffdfbf', banner: 'bg-red-600', bio: "Non ci hanno visti arrivare.", stats: { followers: '1.2M', gaffes: 68, incoherences: 45 }, posts: [], inconsistencies: [] },
    { id: 'conte', name: 'Giuseppe Conte', party: 'M5S', role: 'Presidente M5S', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giuseppe&backgroundColor=fef08a', banner: 'bg-yellow-500', bio: "Avvocato del popolo.", stats: { followers: '4.1M', gaffes: 50, incoherences: 60 }, posts: [], inconsistencies: [] },
    { id: 'renzi', name: 'Matteo Renzi', party: 'IV', role: 'Senatore', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Renzi&backgroundColor=f3e8ff', banner: 'bg-purple-600', bio: "First reaction: shock.", stats: { followers: '1.5M', gaffes: 120, incoherences: 200 }, posts: [], inconsistencies: [] },
    { id: 'calenda', name: 'Carlo Calenda', party: 'Azione', role: 'Senatore', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Calenda&backgroundColor=bfdbfe', banner: 'bg-blue-500', bio: "Twitter è il mio ufficio stampa.", stats: { followers: '600k', gaffes: 40, incoherences: 30 }, posts: [], inconsistencies: [] }
];

const App = () => {
    // STATE
    const [politicians, setPoliticians] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('home'); 
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFullRegister, setShowFullRegister] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null); // Nuovo stato per errori UI
    
    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState(false);
    const [editingPolitician, setEditingPolitician] = useState(null);
    const [editMode, setEditMode] = useState('posts'); 
    const [postForm, setPostForm] = useState({ id: null, title: '', type: 'gaffe', content: '', date: '', source: '', body: '', image: '' });
    const [profileForm, setProfileForm] = useState({ id: '', name: '', party: '', role: '', avatar: '', bio: '', banner: 'bg-gray-500' });
    const [newPoliticianMode, setNewPoliticianMode] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [isDbOnline, setIsDbOnline] = useState(false);

    // --- SINCRONIZZAZIONE DATI ---
    useEffect(() => {
        if (!dbFire) {
            setPoliticians(staticPoliticians);
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(collection(dbFire, "politicians"), (snapshot) => {
            if (snapshot.empty) {
                setPoliticians([]); 
                setIsDbOnline(true);
            } else {
                const data = snapshot.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        ...d,
                        posts: d.posts || [],
                        inconsistencies: d.inconsistencies || [],
                        stats: d.stats || { followers: '0', gaffes: 0, incoherences: 0 }
                    };
                });
                setPoliticians(data);
                setIsDbOnline(true);
            }
            setLoading(false);
        }, (error) => {
            console.error("Errore lettura DB:", error);
            setErrorMsg("Impossibile leggere dal database. Verifica le regole di Firestore.");
            // Fallback locale in caso di errore di permessi
            setPoliticians(staticPoliticians);
            setIsDbOnline(false);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // --- CRUD GENERICO ---
    const saveData = async (collectionName, docId, data, merge = true) => {
        setErrorMsg(null);
        if (dbFire) {
            try {
                await setDoc(doc(dbFire, collectionName, docId), data, { merge });
                return true;
            } catch(e) { 
                console.error(e);
                setErrorMsg("Errore Salvataggio: " + e.message + ". Verifica i permessi.");
                return false; 
            }
        } else {
            // Fallback locale
            setPoliticians(prev => {
                const exists = prev.find(p => p.id === docId);
                if (exists) return prev.map(p => p.id === docId ? { ...p, ...data } : p);
                return [...prev, { id: docId, ...data }];
            });
            return true;
        }
    };

    const deleteData = async (collectionName, docId) => {
        setErrorMsg(null);
        if (dbFire) {
            try {
                await deleteDoc(doc(dbFire, collectionName, docId));
                return true;
            } catch(e) { 
                setErrorMsg("Errore Eliminazione: " + e.message); 
                return false; 
            }
        } else {
            setPoliticians(prev => prev.filter(p => p.id !== docId));
            return true;
        }
    };

    const seedDatabase = async () => {
        if (!dbFire) return alert("Firebase non connesso.");
        if (!window.confirm("Caricare i dati statici nel database online? Sovrascriverà i dati esistenti.")) return;
        
        setSeeding(true);
        setErrorMsg(null);
        const batch = writeBatch(dbFire);
        
        staticPoliticians.forEach(pol => {
            const ref = doc(dbFire, "politicians", pol.id);
            const safePol = {
                ...pol,
                posts: pol.posts || [],
                inconsistencies: pol.inconsistencies || []
            };
            batch.set(ref, safePol);
        });

        try {
            await batch.commit();
            alert("Database popolato con successo!");
        } catch (e) {
            console.error("Errore Seed:", e);
            setErrorMsg("Errore caricamento dati iniziali: " + e.message);
        }
        setSeeding(false);
    };

    // --- HANDLERS ---
    const handleLogin = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAdmin(true); setView('admin'); setLoginError(false); setPasswordInput('');
        } else { setLoginError(true); }
    };

    const handleLogout = () => {
        setIsAdmin(false); setView('home'); setEditingPolitician(null);
    };

    const handleSavePoliticianProfile = async () => {
        if (!profileForm.name) return;
        const polId = newPoliticianMode ? profileForm.name.toLowerCase().replace(/[^a-z0-9]/g, '') : editingPolitician.id;
        
        const polData = { 
            ...profileForm, 
            id: polId,
            posts: newPoliticianMode ? [] : (editingPolitician.posts || []),
            inconsistencies: newPoliticianMode ? [] : (editingPolitician.inconsistencies || []),
            stats: newPoliticianMode ? { followers: '0', gaffes: 0, incoherences: 0 } : (editingPolitician.stats || { followers: '0', gaffes: 0, incoherences: 0 })
        };

        const success = await saveData("politicians", polId, polData);
        
        if (success) {
            if (newPoliticianMode) {
                handleSelectPolitician(polData);
            } else {
                setEditingPolitician(polData);
            }
            alert("Profilo salvato!");
        }
    };

    const handleDeletePolitician = async (e, politicianId) => {
        e.stopPropagation();
        if (!window.confirm("Eliminare definitivamente?")) return;
        const success = await deleteData("politicians", politicianId);
        if (success && editingPolitician?.id === politicianId) setEditingPolitician(null);
    };

    const handleSavePost = async () => {
        if (!editingPolitician || !postForm.title) return;
        
        let currentPosts = editingPolitician.posts || [];
        const newPostData = { ...postForm, id: postForm.id || Date.now() };
        let updatedPosts;

        if (postForm.id) {
            updatedPosts = currentPosts.map(p => p.id === postForm.id ? newPostData : p);
        } else {
            updatedPosts = [newPostData, ...currentPosts];
        }

        const updatedPol = { ...editingPolitician, posts: updatedPosts };
        
        // Fix: Aggiorna lo stato locale SOLO se il salvataggio DB ha successo
        const success = await saveData("politicians", editingPolitician.id, { posts: updatedPosts }, true);
        
        if (success) {
            setEditingPolitician(updatedPol);
            resetPostForm();
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Eliminare post?")) return;
        const currentPosts = editingPolitician.posts || [];
        const updatedPosts = currentPosts.filter(p => p.id !== postId);
        const updatedPol = { ...editingPolitician, posts: updatedPosts };
        
        const success = await saveData("politicians", editingPolitician.id, { posts: updatedPosts }, true);
        if (success) {
            setEditingPolitician(updatedPol);
        }
    };

    // --- UI HELPERS ---
    const handleSelectPolitician = (p) => { 
        const safeP = JSON.parse(JSON.stringify(p));
        if (!safeP.posts) safeP.posts = [];
        setEditingPolitician(safeP); 
        setProfileForm(safeP); 
        setEditMode('posts'); 
        setNewPoliticianMode(false); 
        resetPostForm(); 
    };
    
    const setupNewPolitician = () => { 
        setNewPoliticianMode(true); 
        setEditingPolitician({ id: 'new', name: 'Nuovo', posts: [] }); 
        setProfileForm({ id: '', name: '', party: '', role: '', avatar: '', bio: '', banner: 'bg-gray-500' }); 
        setEditMode('profile'); 
    };

    const resetPostForm = () => {
        setPostForm({ id: null, title: '', type: 'gaffe', content: '', date: '', source: '', body: '', image: '' });
    };

    const navigateTo = (v) => { setView(v); setMobileMenuOpen(false); };
    const handleProfileClick = (p) => { setSelectedProfile(p); setShowFullRegister(false); setView('profile'); setMobileMenuOpen(false); };
    const handlePostClick = (p) => { setSelectedPost(p); setView('article'); };
    const goBackToProfile = () => { setView('profile'); setSelectedPost(null); };

    const filteredPoliticians = politicians.filter(p => 
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (p.party?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const gaffePosts = (selectedProfile?.posts || []).filter(p => p.type === 'gaffe' || p.type === 'quote');
    const newsPosts = (selectedProfile?.posts || []).filter(p => p.type === 'news');
    const visibleGaffes = showFullRegister ? gaffePosts : gaffePosts.slice(0, 5);

    // --- RENDER ---
    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F4F1EA]"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-black" size={48}/><p className="font-mono text-sm uppercase">Caricamento...</p></div></div>;

    return (
        <div className="flex h-screen bg-[#F4F1EA] text-[#1a1a1a] overflow-hidden">
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@300;400;500;700&display=swap');
                body { font-family: 'JetBrains Mono', monospace; }
                h1, h2, h3, h4, .serif-font { font-family: 'Playfair Display', serif; }
                ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: #e5e5e5; } ::-webkit-scrollbar-thumb { background: #333; }
                ::-webkit-scrollbar-thumb:hover { background: #000; }
                .pattern-grid { background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px; }`}
            </style>

            {/* ERROR BANNER */}
            {errorMsg && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold p-2 text-center z-[100] flex justify-between items-center px-4">
                    <span>⚠️ {errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)}><X size={14}/></button>
                </div>
            )}

            {/* Sidebar Desktop */}
            <div className="hidden md:flex flex-col w-64 bg-[#F4F1EA] border-r border-black p-0 z-10">
                <div className="p-4 border-b border-black bg-yellow-400">
                    <div className="text-2xl font-black tracking-tighter flex items-center gap-2 serif-font uppercase"><AlertTriangle className="text-black stroke-[3]" size={24} /> Politi<br/>Gaffe</div>
                </div>
                <nav className="flex-1 p-3 space-y-2">
                    <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 px-3 py-2 border border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] ${view === 'home' ? 'bg-black text-white' : 'bg-white text-black'}`}><Home size={16} /> <span className="font-bold">Dashboard</span></button>
                    <button onClick={() => setView('about')} className={`w-full flex items-center gap-3 px-3 py-2 border border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] ${view === 'about' ? 'bg-black text-white' : 'bg-white text-black'}`}><Info size={16} /> <span className="font-bold">Manifesto</span></button>
                </nav>
                <div className="p-4 border-t border-black bg-white flex justify-between items-center">
                    <div className="flex flex-col">
                        <p className="text-[10px] leading-relaxed font-mono text-gray-500">v.2.3 Fix</p>
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase">
                            {isDbOnline ? <><Cloud size={10} className="text-green-600"/> Online</> : <><CloudOff size={10} className="text-red-500"/> Offline / Local</>}
                        </div>
                    </div>
                    <button onClick={() => isAdmin ? setView('admin') : setView('login')} className="text-gray-400 hover:text-black transition">{isAdmin ? <Settings size={14} /> : <Lock size={14} />}</button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-[#F4F1EA] flex flex-col p-6 animate-in slide-in-from-right duration-200">
                    <div className="flex justify-between items-center mb-8 border-b border-black pb-4">
                        <div className="text-xl font-black uppercase serif-font flex items-center gap-2"><AlertTriangle size={20} /> Menu</div>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"><X size={24} /></button>
                    </div>
                    <nav className="flex-1 space-y-4">
                        <button onClick={() => navigateTo('home')} className="w-full text-left p-4 border border-black bg-white text-lg font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 flex items-center gap-4"><Home size={24} /> Dashboard</button>
                        <button onClick={() => navigateTo('about')} className="w-full text-left p-4 border border-black bg-white text-lg font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 flex items-center gap-4"><Info size={24} /> Manifesto</button>
                    </nav>
                    <div className="mt-auto pt-6 border-t border-black">
                        <button onClick={() => navigateTo(isAdmin ? 'admin' : 'login')} className="w-full flex items-center justify-center gap-2 p-3 bg-gray-200 text-gray-700 font-bold uppercase text-sm border border-gray-400">
                            {isAdmin ? <><Settings size={18}/> Pannello Admin</> : <><Lock size={18}/> Accesso Riservato</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Area */}
            <main className="flex-1 overflow-y-auto relative w-full">
                <div className="md:hidden sticky top-0 z-50 bg-yellow-400 border-b border-black p-3 flex justify-between items-center shadow-md h-16">
                    <div className="w-10">
                        {view !== 'home' ? <button onClick={() => view === 'article' ? goBackToProfile() : setView('home')} className="p-1 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"><ArrowLeft size={20} /></button> : <button onClick={() => setView('login')} className="p-1 text-black opacity-50"><Lock size={16} /></button>}
                    </div>
                    <div className="font-black text-xl flex items-center gap-2 serif-font uppercase tracking-tighter"><AlertTriangle className="text-black stroke-[2]" size={24} /> PolitiGaffe</div>
                    <div className="w-10 flex justify-end"><button onClick={() => setMobileMenuOpen(true)} className="p-1 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"><Menu size={20} /></button></div>
                </div>

                {view === 'home' && (
                    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
                        <header className="mb-8 pt-4 border-b-2 border-black pb-6">
                            <h1 className="text-3xl md:text-5xl font-black text-black mb-3 serif-font uppercase tracking-tight">Osservatorio Politico</h1>
                            <p className="text-sm md:text-base text-gray-700 max-w-3xl font-medium leading-relaxed font-serif">
                                Monitoraggio indipendente delle dichiarazioni pubbliche. {isDbOnline ? <span className="text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full text-xs border border-green-600">● ONLINE</span> : <span className="text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full text-xs border border-orange-600">● MODO LOCALE</span>}
                            </p>
                        </header>
                        <div className="mb-8 flex items-center border border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-lg">
                            <div className="bg-black text-white p-2"><Search size={18} /></div>
                            <input type="text" placeholder="CERCA UN POLITICO..." className="w-full pl-3 pr-3 py-2 bg-transparent focus:outline-none text-sm font-bold uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        {politicians.length === 0 ? (
                            <div className="p-10 border-2 border-dashed border-gray-400 text-center text-gray-500 font-mono bg-gray-50">
                                <p className="mb-4 font-bold">IL DATABASE È VUOTO</p>
                                <p className="text-xs">Vai su Admin (Lucchetto in basso) &rarr; "Carica Dati Iniziali" per ripristinare.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPoliticians.map(p => (
                                    <div key={p.id} onClick={() => handleProfileClick(p)} className="group cursor-pointer bg-white border border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200">
                                        <div className="flex border-b border-black">
                                            <div className="w-24 h-24 border-r border-black bg-gray-100 shrink-0 overflow-hidden"><img src={getImageUrl(p.avatar)} alt={p.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" /></div>
                                            <div className="p-3 flex flex-col justify-center flex-1 bg-[#fffdf5] min-w-0">
                                                <h3 className="text-lg font-bold serif-font leading-none mb-1 truncate group-hover:underline">{p.name}</h3>
                                                <span className="text-[10px] font-bold uppercase bg-black text-white w-fit px-1.5 py-0.5">{p.party}</span>
                                                <span className="text-[10px] mt-1 truncate font-mono text-gray-500">{p.role}</span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-2 flex justify-between items-center bg-white">
                                            <div className="flex gap-3 text-[10px] font-bold font-mono">
                                                <span className="text-red-600 flex items-center gap-1">⚠ {p.posts ? p.posts.filter(x=>x.type!=='news').length : 0}</span>
                                                <span className="text-blue-600 flex items-center gap-1">📰 {p.posts ? p.posts.filter(x=>x.type==='news').length : 0}</span>
                                            </div>
                                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'profile' && selectedProfile && (
                    <div className="min-h-full bg-white animate-in slide-in-from-right duration-300">
                        <div className={`h-16 w-full border-b border-black ${selectedProfile.banner} opacity-90 pattern-grid`}></div>
                        <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-8 mb-12 relative">
                            <div className="flex flex-col md:flex-row gap-5 items-end mb-6">
                                <div className="w-28 h-28 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden"><img src={getImageUrl(selectedProfile.avatar)} alt="Profile" className="w-full h-full object-cover" /></div>
                                <div className="flex-1 pb-1">
                                    <h1 className="text-3xl font-black serif-font mb-1 uppercase leading-none">{selectedProfile.name}</h1>
                                    <p className="text-sm font-serif italic text-gray-600 mb-2 border-l-2 border-yellow-400 pl-2">"{selectedProfile.bio}"</p>
                                    <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase">
                                        <span className="bg-black text-white px-2 py-0.5 font-bold">ID: {selectedProfile.id}</span>
                                        <span className="border border-black px-2 py-0.5 bg-gray-100">{selectedProfile.role}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <div className="flex items-center justify-between border-b border-black pb-2 mb-4"><div className="flex items-center gap-2 font-bold uppercase text-sm"><FileText size={16} /> Registro Dossier</div></div>
                                    <div className="space-y-3">
                                        {visibleGaffes.length > 0 ? visibleGaffes.map(post => (
                                            <div key={post.id} onClick={() => handlePostClick(post)} className="cursor-pointer border border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white group transition-colors">
                                                <div className="flex justify-between items-center mb-1"><span className={`text-[9px] font-bold uppercase px-1 border border-black group-hover:border-white ${post.type === 'gaffe' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'}`}>{post.type}</span><span className="text-[9px] font-mono group-hover:text-gray-300">{post.date}</span></div>
                                                <h4 className="font-bold serif-font text-sm leading-tight mb-1">{post.title}</h4>
                                            </div>
                                        )) : <div className="text-xs text-gray-500 italic border border-dashed border-gray-300 p-4 text-center">Nessun dossier archiviato.</div>}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 font-bold uppercase text-sm border-b border-black pb-2 mb-4"><Newspaper size={16} /> Notizie & Cronaca</div>
                                    <div className="space-y-4">
                                        {newsPosts.length > 0 ? newsPosts.map(post => (
                                            <div key={post.id} onClick={() => handlePostClick(post)} className="cursor-pointer group flex gap-3 items-start border-b border-gray-300 pb-3 last:border-0 hover:bg-gray-50 p-1">
                                                <div className="w-16 h-16 bg-gray-200 shrink-0 border border-black overflow-hidden"><img src={getImageUrl(post.image)} className="w-full h-full object-cover" alt="news" /></div>
                                                <div><div className="flex gap-2 text-[9px] font-bold uppercase text-blue-700 mb-0.5"><span>{post.source}</span><span className="text-gray-400">• {post.date}</span></div><h4 className="font-serif font-bold text-sm leading-tight mb-1 group-hover:underline">{post.title}</h4></div>
                                            </div>
                                        )) : <div className="p-4 text-center border border-dashed border-gray-400 text-xs text-gray-500">Nessuna notizia recente.</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'article' && selectedPost && (
                    <div className="bg-[#F4F1EA] min-h-full animate-in fade-in duration-200">
                         <div className="sticky top-0 bg-[#F4F1EA] border-b border-black px-4 py-3 flex justify-between items-center z-50">
                            <button onClick={goBackToProfile} className="flex items-center gap-2 font-bold uppercase hover:underline text-xs"><ArrowLeft size={16} /> Indietro</button>
                            <div className="flex gap-4"><Printer size={16} className="cursor-pointer hover:text-gray-600" /></div>
                        </div>
                        <article className="max-w-2xl mx-auto px-6 py-10 bg-white border-x border-black min-h-screen shadow-xl">
                            <header className="mb-6 text-center border-b border-black pb-6">
                                <div className={`inline-block px-2 py-0.5 text-white font-mono text-[10px] font-bold uppercase mb-2 ${selectedPost.type === 'news' ? 'bg-blue-600' : 'bg-red-600'}`}>{selectedPost.type === 'news' ? 'Cronaca' : 'Dossier Gaffe'}</div>
                                <h1 className="text-3xl font-black serif-font mb-2 leading-tight">{selectedPost.title}</h1>
                                <div className="text-xs font-mono text-gray-500 uppercase">{selectedPost.date} • Fonte: {selectedPost.source}</div>
                            </header>
                            {selectedPost.image && <div className="border border-black p-1 mb-8 bg-gray-100"><div className="aspect-video w-full bg-gray-300 overflow-hidden grayscale contrast-125"><img src={getImageUrl(selectedPost.image)} alt={selectedPost.title} className="w-full h-full object-cover" /></div></div>}
                            <div className="prose prose-sm prose-slate mx-auto font-serif text-black leading-loose">
                                <p className="text-lg font-bold leading-relaxed mb-6 border-l-2 border-yellow-400 pl-3 italic">"{selectedPost.content}"</p>
                                <p>{selectedPost.body}</p>
                            </div>
                        </article>
                    </div>
                )}

                {view === 'login' && (
                    <div className="flex items-center justify-center min-h-screen bg-gray-100">
                        <div className="bg-white p-8 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm">
                            <h2 className="text-xl font-black uppercase mb-4 text-center">Accesso Riservato</h2>
                            <div className="space-y-4">
                                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} className="w-full p-2 border border-black text-sm outline-none focus:bg-yellow-50" placeholder="Password" />
                                {loginError && <p className="text-red-600 text-xs mt-1 font-bold">Password errata.</p>}
                                <button onClick={handleLogin} className="w-full bg-black text-white p-2 text-sm font-bold uppercase hover:bg-gray-800">Entra</button>
                                <button onClick={() => setView('home')} className="w-full text-xs underline text-gray-500">Torna alla Home</button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'admin' && (
                    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white min-h-full">
                        <header className="mb-8 pb-4 border-b border-black flex justify-between items-center">
                            <div className="flex flex-col">
                                <h1 className="text-2xl md:text-3xl font-black uppercase serif-font">Admin Panel</h1>
                                <p className="text-xs text-gray-500 font-mono mt-1">Status: {isDbOnline ? <span className="text-green-600 font-bold">CLOUD CONNESSO</span> : <span className="text-red-600 font-bold">LOCALE (Errore/Offline)</span>}</p>
                            </div>
                            <button onClick={handleLogout} className="flex items-center gap-1 text-xs uppercase font-bold text-red-600 hover:text-red-800"><LogOut size={14}/> Esci</button>
                        </header>
                        
                        <div className="mb-8 p-4 bg-orange-100 border border-orange-500 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-orange-900 uppercase text-sm flex items-center gap-2"><Upload size={18}/> Inizializzazione Database</h3>
                                <p className="text-xs text-orange-800">Premi qui per caricare i dati statici nel Cloud. Utile se il DB è vuoto.</p>
                            </div>
                            <button onClick={seedDatabase} disabled={seeding || !isDbOnline} className="bg-orange-600 text-white px-4 py-2 font-bold uppercase text-xs hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                {seeding ? "Caricamento..." : "Carica Dati Iniziali"} <CheckCircle size={16}/>
                            </button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="border border-black p-4 bg-gray-50 h-[80vh] flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold uppercase text-sm">Politici ({politicians.length})</h3>
                                    <button onClick={setupNewPolitician} className="bg-black text-white p-1 rounded-full"><PlusCircle size={16}/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                    {politicians.map(p => (
                                        <div key={p.id} className={`p-2 border border-black flex justify-between items-center text-xs font-bold cursor-pointer ${editingPolitician?.id === p.id ? 'bg-black text-white' : 'bg-white hover:bg-gray-200'}`} onClick={() => handleSelectPolitician(p)}>
                                            <div className="flex items-center gap-2"><img src={getImageUrl(p.avatar)} className="w-6 h-6 rounded-full bg-gray-200 object-cover border border-gray-400" /><span>{p.name}</span></div>
                                            <button onClick={(e) => handleDeletePolitician(e, p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2 border border-black p-4">
                                {editingPolitician ? (
                                    <>
                                        <div className="flex justify-between items-center border-b border-black pb-4 mb-4">
                                            <h3 className="font-bold uppercase text-lg">{newPoliticianMode ? 'Nuovo Profilo' : `Modifica: ${editingPolitician.name}`}</h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditMode('posts')} className={`px-3 py-1 text-xs font-bold uppercase border border-black ${editMode === 'posts' ? 'bg-black text-white' : 'bg-white'}`}>Post</button>
                                                <button onClick={() => setEditMode('profile')} className={`px-3 py-1 text-xs font-bold uppercase border border-black ${editMode === 'profile' ? 'bg-black text-white' : 'bg-white'}`}>Profilo</button>
                                            </div>
                                        </div>
                                        {editMode === 'profile' && (
                                            <div className="bg-gray-50 p-4 border border-black">
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Nome</label><input className="w-full p-2 border border-black text-sm" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                                                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Partito</label><input className="w-full p-2 border border-black text-sm" value={profileForm.party} onChange={e => setProfileForm({...profileForm, party: e.target.value})} /></div>
                                                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Ruolo</label><input className="w-full p-2 border border-black text-sm" value={profileForm.role} onChange={e => setProfileForm({...profileForm, role: e.target.value})} /></div>
                                                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Avatar URL</label><input className="w-full p-2 border border-black text-sm" value={profileForm.avatar} onChange={e => setProfileForm({...profileForm, avatar: e.target.value})} /></div>
                                                </div>
                                                <div className="space-y-1 mb-4"><label className="text-[10px] font-bold uppercase">Bio</label><textarea className="w-full p-2 border border-black text-sm h-20" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} /></div>
                                                <button onClick={handleSavePoliticianProfile} className="w-full bg-green-600 text-white p-2 text-sm font-bold uppercase flex items-center justify-center gap-2"><Save size={16}/> Salva</button>
                                            </div>
                                        )}
                                        {editMode === 'posts' && (
                                            <div className="flex flex-col h-full">
                                                <div className={`p-4 border border-black mb-6 ${postForm.id ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                                                    <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-xs uppercase">{postForm.id ? 'Modifica Post' : 'Nuovo Post'}</h4>{postForm.id && <button onClick={resetPostForm} className="text-[10px] underline">Annulla</button>}</div>
                                                    <div className="space-y-2">
                                                        <input className="w-full p-2 border border-gray-300 text-sm font-bold" placeholder="Titolo" value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} />
                                                        <textarea className="w-full p-2 border border-gray-300 text-sm h-20" placeholder="Contenuto (Breve)" value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} />
                                                        <textarea className="w-full p-2 border border-gray-300 text-sm h-20" placeholder="Body (Testo completo)" value={postForm.body} onChange={e => setPostForm({...postForm, body: e.target.value})} />
                                                        <div className="flex gap-2">
                                                            <select className="p-2 border text-sm" value={postForm.type} onChange={e => setPostForm({...postForm, type: e.target.value})}><option value="gaffe">Gaffe</option><option value="quote">Incoerenza</option><option value="news">News</option></select>
                                                            <input className="flex-1 p-2 border text-sm" placeholder="Data" value={postForm.date} onChange={e => setPostForm({...postForm, date: e.target.value})} />
                                                        </div>
                                                        <input className="w-full p-2 border border-gray-300 text-sm" placeholder="Fonte" value={postForm.source} onChange={e => setPostForm({...postForm, source: e.target.value})} />
                                                        <input className="w-full p-2 border border-gray-300 text-sm" placeholder="URL Immagine" value={postForm.image} onChange={e => setPostForm({...postForm, image: e.target.value})} />
                                                        <button onClick={handleSavePost} className="w-full bg-black text-white p-2 text-sm font-bold uppercase hover:bg-gray-800">{postForm.id ? 'Aggiorna' : 'Pubblica'}</button>
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar max-h-64 border-t border-black pt-2">
                                                    {(editingPolitician.posts || []).length > 0 ? editingPolitician.posts.map(post => (
                                                        <div key={post.id} className="flex justify-between items-center p-2 bg-gray-100 border border-gray-300 text-xs">
                                                            <span className="truncate w-1/2 font-bold">{post.title}</span>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setPostForm(post)} className="text-blue-600 hover:text-blue-800"><Edit3 size={14}/></button>
                                                                <button onClick={() => handleDeletePost(post.id)} className="text-red-600 hover:text-red-800"><Trash2 size={14}/></button>
                                                            </div>
                                                        </div>
                                                    )) : <div className="text-center py-4 text-gray-400 text-xs">Nessun post.</div>}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs uppercase"><div className="text-center"><Settings size={48} className="mx-auto mb-2 opacity-20"/>Seleziona un politico</div></div>}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'about' && (
                    <div className="max-w-3xl mx-auto p-8">
                         <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <h1 className="text-4xl font-black serif-font mb-6 uppercase tracking-tight">Il Manifesto</h1>
                            <div className="space-y-4 text-base font-serif leading-relaxed">
                                <p>PolitiGaffe non è un social network. È un atto di resistenza alla memoria breve.</p>
                                <div className="grid grid-cols-3 gap-4 my-6 font-mono text-xs">
                                    <div className="border border-black p-3 bg-yellow-400"><strong>TRASPARENZA</strong></div>
                                    <div className="border border-black p-3 bg-white"><strong>MEMORIA</strong></div>
                                    <div className="border border-black p-3 bg-black text-white"><strong>CONSAPEVOLEZZA</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;