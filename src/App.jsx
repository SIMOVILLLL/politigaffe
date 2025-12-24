import React, { useState, useEffect } from 'react';
import { Home, Info, AlertTriangle, Search, ArrowLeft, ArrowRightLeft, FileText, Eye, ChevronRight, Settings, Trash2, Newspaper, Lock, LogOut, Printer, Menu, X, Edit3, Save, PlusCircle, Loader2, UploadCloud, CheckCircle } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

// --- CONFIGURAZIONE FIREBASE (INCOLLA QUI I TUOI DATI PRESI DA FIREBASE CONSOLE) ---
const firebaseConfig = {
  apiKey: "AIzaSyClzaGSuhKFnrQ_VOmJNIZXt3Yjp8ASCNU",
  authDomain: "politigaffee.firebaseapp.com",
  projectId: "politigaffee",
  storageBucket: "politigaffee.firebasestorage.app",
  messagingSenderId: "686263197942",
  appId: "1:686263197942:web:4e0c680afb54397a190cd7",
  measurementId: "G-QV82X26E3B"
};

// Inizializza Firebase
let dbFire;
try {
    const app = initializeApp(firebaseConfig);
    dbFire = getFirestore(app);
} catch (e) {
    console.error("Firebase non configurato:", e);
}

const ADMIN_PASSWORD = "admin123"; 

const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/800x450?text=Nessuna+Immagine';
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return url;
};

// --- DATABASE COMPLETO PER L'INIZIALIZZAZIONE (SEED) ---
// Questi dati verranno caricati su Firebase quando premi il pulsante nell'Admin
const seedDb = [
    // DESTRA / GOVERNO
    {
        id: 'meloni', name: 'Giorgia Meloni', party: 'FdI', role: 'Presidente del Consiglio',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giorgia&backgroundColor=ffdfbf', banner: 'bg-blue-900',
        bio: "Io sono Giorgia, sono una donna, sono una madre, sono cristiana.",
        stats: { followers: '3.1M', gaffes: 112, incoherences: 88 },
        posts: [], inconsistencies: []
    },
    {
        id: 'salvini', name: 'Matteo Salvini', party: 'Lega', role: 'Ministro Infrastrutture',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matteo&backgroundColor=b6e3f4', banner: 'bg-green-700',
        bio: "Prima gli italiani, poi il Ponte, poi il terzo mandato.",
        stats: { followers: '2.5M', gaffes: 1420, incoherences: 'Over 9000' },
        posts: [], inconsistencies: []
    },
    {
        id: 'tajani', name: 'Antonio Tajani', party: 'Forza Italia', role: 'Ministro Esteri',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Antonio&backgroundColor=c0aede', banner: 'bg-blue-600',
        bio: "L'Europa, il PPE, l'eredità di Berlusconi.",
        stats: { followers: '800k', gaffes: 45, incoherences: 12 },
        posts: [], inconsistencies: []
    },
    {
        id: 'santanche', name: 'Daniela Santanchè', party: 'FdI', role: 'Ministro Turismo',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Daniela&backgroundColor=ffe4e1', banner: 'bg-pink-700',
        bio: "Open to Meraviglia. Il turismo è il nostro petrolio (e il Twiga).",
        stats: { followers: '450k', gaffes: 85, incoherences: 20 },
        posts: [], inconsistencies: []
    },
    {
        id: 'bernini', name: 'Anna Maria Bernini', party: 'Forza Italia', role: 'Ministro Università',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnnaMaria&backgroundColor=e6e6fa', banner: 'bg-indigo-700',
        bio: "L'università è eccellenza, anche se i fondi mancano.",
        stats: { followers: '200k', gaffes: 30, incoherences: 8 },
        posts: [], inconsistencies: []
    },
    {
        id: 'lollobrigida', name: 'Francesco Lollobrigida', party: 'FdI', role: 'Ministro Agricoltura',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lollo&backgroundColor=d1fae5', banner: 'bg-green-800',
        bio: "Difensore della sovranità alimentare e dei treni puntuali.",
        stats: { followers: '150k', gaffes: 55, incoherences: 5 },
        posts: [], inconsistencies: []
    },
    {
        id: 'sangiuliano', name: 'Gennaro Sangiuliano', party: 'Indipendente (Area FdI)', role: 'Ex Ministro Cultura',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Genny&backgroundColor=e5e7eb', banner: 'bg-gray-700',
        bio: "Ho letto molti libri, forse troppi. Galileo e Colombo lo sanno.",
        stats: { followers: '100k', gaffes: 99, incoherences: 2 },
        posts: [], inconsistencies: []
    },
    {
        id: 'valditara', name: 'Giuseppe Valditara', party: 'Lega', role: 'Ministro Istruzione',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Valdi&backgroundColor=fef3c7', banner: 'bg-yellow-600',
        bio: "Il merito prima di tutto. E un po' di umiliazione che fa bene.",
        stats: { followers: '80k', gaffes: 40, incoherences: 10 },
        posts: [], inconsistencies: []
    },
    {
        id: 'nordio', name: 'Carlo Nordio', party: 'FdI', role: 'Ministro Giustizia',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlo&backgroundColor=bfdbfe', banner: 'bg-slate-700',
        bio: "Garantista sempre, tranne quando serve il pugno duro.",
        stats: { followers: '50k', gaffes: 25, incoherences: 15 },
        posts: [], inconsistencies: []
    },
    {
        id: 'crosetto', name: 'Guido Crosetto', party: 'FdI', role: 'Ministro Difesa',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guido&backgroundColor=cbd5e1', banner: 'bg-stone-700',
        bio: "Il gigante buono (ma armato).",
        stats: { followers: '300k', gaffes: 20, incoherences: 5 },
        posts: [], inconsistencies: []
    },
    {
        id: 'piantedosi', name: 'Matteo Piantedosi', party: 'Indipendente (Area Lega)', role: 'Ministro Interni',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piante&backgroundColor=9ca3af', banner: 'bg-gray-800',
        bio: "Carico residuo e gestione flussi. Ordine e disciplina.",
        stats: { followers: '40k', gaffes: 35, incoherences: 2 },
        posts: [], inconsistencies: []
    },
    {
        id: 'roccella', name: 'Eugenia Roccella', party: 'FdI', role: 'Ministro Famiglia',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eugenia&backgroundColor=fce7f3', banner: 'bg-pink-900',
        bio: "La famiglia tradizionale prima di tutto.",
        stats: { followers: '30k', gaffes: 42, incoherences: 8 },
        posts: [], inconsistencies: []
    },
    {
        id: 'pichetto', name: 'Gilberto Pichetto Fratin', party: 'Forza Italia', role: 'Ministro Ambiente',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gilberto&backgroundColor=dbeafe', banner: 'bg-cyan-700',
        bio: "Transizione energetica, ma con calma.",
        stats: { followers: '20k', gaffes: 15, incoherences: 3 },
        posts: [], inconsistencies: []
    },
    {
        id: 'urso', name: 'Adolfo Urso', party: 'FdI', role: 'Ministro Imprese',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Adolfo&backgroundColor=fee2e2', banner: 'bg-red-900',
        bio: "Made in Italy su tutto, anche sui satelliti.",
        stats: { followers: '25k', gaffes: 10, incoherences: 4 },
        posts: [], inconsistencies: []
    },
    {
        id: 'delmastro', name: 'Andrea Delmastro', party: 'FdI', role: 'Sottosegretario Giustizia',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Delmastro&backgroundColor=ffedd5', banner: 'bg-orange-800',
        bio: "Le carte sono riservate, ma non troppo.",
        stats: { followers: '45k', gaffes: 18, incoherences: 2 },
        posts: [], inconsistencies: []
    },
    // OPPOSIZIONE
    {
        id: 'schlein', name: 'Elly Schlein', party: 'PD', role: 'Segretaria PD',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elly&backgroundColor=ffdfbf', banner: 'bg-red-600',
        bio: "Non ci hanno visti arrivare. L'armocromia della resistenza.",
        stats: { followers: '1.2M', gaffes: 68, incoherences: 45 },
        posts: [], inconsistencies: []
    },
    {
        id: 'conte', name: 'Giuseppe Conte', party: 'M5S', role: 'Presidente M5S',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giuseppe&backgroundColor=fef08a', banner: 'bg-yellow-500',
        bio: "Avvocato del popolo. Fortissimamente riferimento progressista.",
        stats: { followers: '4.1M', gaffes: 50, incoherences: 60 },
        posts: [], inconsistencies: []
    },
    {
        id: 'renzi', name: 'Matteo Renzi', party: 'Italia Viva', role: 'Senatore',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Renzi&backgroundColor=f3e8ff', banner: 'bg-purple-600',
        bio: "First reaction: shock. Il centro sono io.",
        stats: { followers: '1.5M', gaffes: 120, incoherences: 200 },
        posts: [], inconsistencies: []
    },
    {
        id: 'calenda', name: 'Carlo Calenda', party: 'Azione', role: 'Senatore',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Calenda&backgroundColor=bfdbfe', banner: 'bg-blue-500',
        bio: "Twitter è il mio ufficio stampa. La competenza prima di tutto.",
        stats: { followers: '600k', gaffes: 40, incoherences: 30 },
        posts: [], inconsistencies: []
    },
    {
        id: 'fratoianni', name: 'Nicola Fratoianni', party: 'AVS', role: 'Deputato',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nicola&backgroundColor=ef4444', banner: 'bg-red-500',
        bio: "Sinistra Sinistra. Contro tutto ciò che è destra.",
        stats: { followers: '200k', gaffes: 15, incoherences: 10 },
        posts: [], inconsistencies: []
    },
    {
        id: 'bonelli', name: 'Angelo Bonelli', party: 'AVS', role: 'Deputato',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bonelli&backgroundColor=86efac', banner: 'bg-green-500',
        bio: "Sassi dell'Adige e crisi climatica.",
        stats: { followers: '100k', gaffes: 20, incoherences: 5 },
        posts: [], inconsistencies: []
    },
    {
        id: 'deluca', name: 'Vincenzo De Luca', party: 'PD', role: 'Presidente Campania',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DeLuca&backgroundColor=fee2e2', banner: 'bg-red-800',
        bio: "Lanciafiamme, pinguini e cafoni. Lo sceriffo.",
        stats: { followers: '2M', gaffes: 300, incoherences: 10 },
        posts: [], inconsistencies: []
    }
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
    const [seeding, setSeeding] = useState(false);

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [loginError, setLoginError] = useState(false);
    
    // Edit States
    const [editingPolitician, setEditingPolitician] = useState(null);
    const [editMode, setEditMode] = useState('posts'); 
    const [postForm, setPostForm] = useState({ id: null, title: '', type: 'gaffe', content: '', date: '', source: '', body: '', image: '' });
    const [profileForm, setProfileForm] = useState({ id: '', name: '', party: '', role: '', avatar: '', bio: '', banner: 'bg-gray-500' });
    const [newPoliticianMode, setNewPoliticianMode] = useState(false);

    // --- FIREBASE SYNC ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        if (!dbFire) {
            setPoliticians(seedDb); // Fallback visuale
            setLoading(false);
            return;
        }
        
        try {
            const querySnapshot = await getDocs(collection(dbFire, "politicians"));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (data.length === 0) {
                // DB Vuoto: Non mostriamo nulla o un placeholder, l'utente deve inizializzare da Admin
                setPoliticians([]); 
            } else {
                setPoliticians(data);
            }
        } catch (error) {
            console.error("Errore fetch:", error);
            setPoliticians([]);
        }
        setLoading(false);
    };

    // --- SEED FUNCTION ---
    const handleSeedDatabase = async () => {
        if (!dbFire) return alert("Firebase non configurato!");
        if (!window.confirm("ATTENZIONE: Questo caricherà tutti i 22 politici nel database. Se esistono già, verranno sovrascritti. Continuare?")) return;
        
        setSeeding(true);
        try {
            for (const p of seedDb) {
                await setDoc(doc(dbFire, "politicians", p.id), p);
            }
            alert("Database inizializzato con successo! Ricarica la pagina.");
            fetchData();
        } catch (e) {
            alert("Errore durante il caricamento: " + e.message);
        }
        setSeeding(false);
    };

    // --- CRUD FUNCTIONS ---
    const handleLogin = () => {
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAdmin(true); setView('admin'); setLoginError(false); setPasswordInput('');
        } else {
            setLoginError(true);
        }
    };

    const handleLogout = () => {
        setIsAdmin(false); setView('home'); setEditingPolitician(null);
    };

    const handleSavePoliticianProfile = async () => {
        if (!profileForm.name) return;
        const polId = newPoliticianMode ? profileForm.name.toLowerCase().replace(/\s+/g, '') : editingPolitician.id;
        const polData = newPoliticianMode 
            ? { ...profileForm, id: polId, posts: [], inconsistencies: [], stats: { followers: '0', gaffes: 0, incoherences: 0 } }
            : { ...editingPolitician, ...profileForm };

        try {
            await setDoc(doc(dbFire, "politicians", polId), polData);
            if (newPoliticianMode) {
                setPoliticians([...politicians, polData]);
                handleSelectPolitician(polData);
            } else {
                setPoliticians(politicians.map(p => p.id === polId ? polData : p));
                setEditingPolitician(polData);
            }
            alert("Salvato su Database Cloud!");
        } catch (e) {
            alert("Errore salvataggio: " + e.message);
        }
    };

    const handleDeletePolitician = async (e, politicianId) => {
        e.stopPropagation();
        if (!window.confirm("ATTENZIONE: Eliminazione definitiva dal Cloud. Continuare?")) return;
        try {
            await deleteDoc(doc(dbFire, "politicians", politicianId));
            setPoliticians(politicians.filter(p => p.id !== politicianId));
            if (editingPolitician?.id === politicianId) setEditingPolitician(null);
        } catch (e) {
            alert("Errore eliminazione: " + e.message);
        }
    };

    const handleSavePost = async () => {
        if (!editingPolitician || !postForm.title) return;
        let updatedPosts;
        if (postForm.id) {
            updatedPosts = editingPolitician.posts.map(p => p.id === postForm.id ? postForm : p);
        } else {
            updatedPosts = [{ ...postForm, id: Date.now() }, ...editingPolitician.posts];
        }
        const updatedPolitician = { ...editingPolitician, posts: updatedPosts };
        try {
            await updateDoc(doc(dbFire, "politicians", editingPolitician.id), { posts: updatedPosts });
            setPoliticians(politicians.map(p => p.id === editingPolitician.id ? updatedPolitician : p));
            setEditingPolitician(updatedPolitician);
            resetPostForm();
        } catch (e) {
            alert("Errore salvataggio post: " + e.message);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Eliminare post?")) return;
        const updatedPosts = editingPolitician.posts.filter(p => p.id !== postId);
        const updatedPolitician = { ...editingPolitician, posts: updatedPosts };
        try {
            await updateDoc(doc(dbFire, "politicians", editingPolitician.id), { posts: updatedPosts });
            setPoliticians(politicians.map(p => p.id === editingPolitician.id ? updatedPolitician : p));
            setEditingPolitician(updatedPolitician);
        } catch (e) {
            alert("Errore: " + e.message);
        }
    };

    // --- UI HELPERS ---
    const handleSelectPolitician = (p) => { setEditingPolitician(p); setProfileForm(p); setEditMode('posts'); setNewPoliticianMode(false); resetPostForm(); };
    const resetPostForm = () => setPostForm({ id: null, title: '', type: 'gaffe', content: '', date: '', source: '', body: '', image: '' });
    const setupNewPolitician = () => { setNewPoliticianMode(true); setEditingPolitician({ id: 'new', name: 'Nuovo Politico', posts: [] }); setProfileForm({ id: '', name: '', party: '', role: '', avatar: '', bio: '', banner: 'bg-gray-500' }); setEditMode('profile'); };
    const handleProfileClick = (p) => { setSelectedProfile(p); setShowFullRegister(false); setView('profile'); setMobileMenuOpen(false); };
    const handlePostClick = (p) => { setSelectedPost(p); setView('article'); };
    const goBackToProfile = () => { setView('profile'); setSelectedPost(null); };
    const navigateTo = (v) => { setView(v); setMobileMenuOpen(false); };

    const filteredPoliticians = politicians.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.party.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const gaffePosts = selectedProfile?.posts.filter(p => p.type === 'gaffe' || p.type === 'quote') || [];
    const newsPosts = selectedProfile?.posts.filter(p => p.type === 'news') || [];
    const visibleGaffes = showFullRegister ? gaffePosts : gaffePosts.slice(0, 5);

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F4F1EA]"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-black" size={48}/><p className="font-mono text-sm uppercase">Caricamento Database...</p></div></div>;

    return (
        <div className="flex h-screen bg-[#F4F1EA] text-[#1a1a1a] overflow-hidden">
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@300;400;500;700&display=swap');
                body { font-family: 'JetBrains Mono', monospace; }
                h1, h2, h3, h4, .serif-font { font-family: 'Playfair Display', serif; }
                ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: #e5e5e5; } ::-webkit-scrollbar-thumb { background: #333; }
                .pattern-grid { background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px; }`}
            </style>

            {/* Sidebar Desktop */}
            <div className="hidden md:flex flex-col w-64 bg-[#F4F1EA] border-r border-black p-0 z-10">
                <div className="p-4 border-b border-black bg-yellow-400">
                    <div className="text-2xl font-black tracking-tighter flex items-center gap-2 serif-font uppercase"><AlertTriangle className="text-black stroke-[3]" size={24} /> Politi<br/>Gaffe</div>
                </div>
                <nav className="flex-1 p-3 space-y-2">
                    <button onClick={() => setView('home')} className={`w-full flex items-center gap-3 px-3 py-2 border border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] ${view === 'home' ? 'bg-black text-white' : 'bg-white text-black'}`}><Home size={16} /> <span className="font-bold">Dashboard</span></button>
                    <button onClick={() => setView('about')} className={`w-full flex items-center gap-3 px-3 py-2 border border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] ${view === 'about' ? 'bg-black text-white' : 'bg-white text-black'}`}><Info size={16} /> <span className="font-bold">Manifesto</span></button>
                </nav>
                <div className="p-4 border-t border-black bg-white flex justify-between items-center">
                    <p className="text-[10px] leading-relaxed font-mono text-gray-500">v.2.1 - Seed</p>
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
                    <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
                        <header className="mb-8 pt-4 border-b-2 border-black pb-6">
                            <h1 className="text-3xl md:text-5xl font-black text-black mb-3 serif-font uppercase tracking-tight">Osservatorio Politico</h1>
                            <p className="text-sm md:text-base text-gray-700 max-w-3xl font-medium leading-relaxed font-serif">
                                Monitoraggio indipendente. {dbFire ? <span className="text-green-600 font-bold">● DB Connesso</span> : <span className="text-red-600 font-bold">● DB Disconnesso</span>}
                            </p>
                        </header>
                        <div className="mb-8 flex items-center border border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-lg">
                            <div className="bg-black text-white p-2"><Search size={18} /></div>
                            <input type="text" placeholder="CERCA..." className="w-full pl-3 pr-3 py-2 bg-transparent focus:outline-none text-sm font-bold uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        {politicians.length === 0 ? (
                            <div className="p-10 border-2 border-dashed border-gray-400 text-center text-gray-500 font-mono">
                                <p className="mb-4">IL DATABASE È VUOTO</p>
                                <p className="text-xs">Accedi come Admin per caricare i dati iniziali.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredPoliticians.map(p => (
                                    <div key={p.id} onClick={() => handleProfileClick(p)} className="group cursor-pointer bg-white border border-black p-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all">
                                        <div className="flex border-b border-black">
                                            <div className="w-24 h-24 border-r border-black bg-gray-100 shrink-0 overflow-hidden"><img src={getImageUrl(p.avatar)} alt={p.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" /></div>
                                            <div className="p-3 flex flex-col justify-center flex-1 bg-[#fffdf5] min-w-0">
                                                <h3 className="text-lg font-bold serif-font leading-none mb-1 truncate">{p.name}</h3>
                                                <span className="text-[10px] font-bold uppercase bg-black text-white w-fit px-1.5 py-0.5">{p.party}</span>
                                                <span className="text-[10px] mt-1 truncate font-mono text-gray-500">{p.role}</span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-2 flex justify-between items-center bg-white">
                                            <div className="flex gap-3 text-[10px] font-bold font-mono">
                                                <span className="text-red-600">⚠ {p.stats.gaffes || 0}</span>
                                                <span className="text-blue-600">⇄ {p.stats.incoherences || 0}</span>
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
                                        )) : <div className="p-4 text-center border border-dashed border-gray-400 text-xs text-gray-500">Nessuna notizia.</div>}
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
                            <h1 className="text-2xl md:text-3xl font-black uppercase serif-font">Admin Panel</h1>
                            <button onClick={handleLogout} className="flex items-center gap-1 text-xs uppercase font-bold text-red-600 hover:text-red-800"><LogOut size={14}/> Esci</button>
                        </header>
                        
                        {/* SEED BUTTON - VISIBILE SOLO IN ADMIN */}
                        <div className="mb-8 p-4 bg-orange-100 border border-orange-500 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-orange-900 uppercase text-sm flex items-center gap-2"><UploadCloud size={18}/> Gestione Database</h3>
                                <p className="text-xs text-orange-800">Usa questo pulsante solo la prima volta o per ripristinare i 22 politici predefiniti.</p>
                            </div>
                            <button onClick={handleSeedDatabase} disabled={seeding} className="bg-orange-600 text-white px-4 py-2 font-bold uppercase text-xs hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2">
                                {seeding ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>} 
                                {seeding ? "Caricamento in corso..." : "Inizializza Database Cloud"}
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
                                                    {editingPolitician.posts?.length > 0 ? editingPolitician.posts.map(post => (
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
            </main>
        </div>
    );
};

export default App;