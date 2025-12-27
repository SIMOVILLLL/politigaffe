import React, { useState, useEffect } from 'react';
import { Home, Info, AlertTriangle, Search, ArrowLeft, ArrowRightLeft, FileText, Eye, ChevronRight, Settings, Trash2, Newspaper, Lock, LogOut, Printer, Menu, X, Edit3, Save, PlusCircle, User, Users, Heart, LogIn, CheckCircle, Loader2 } from 'lucide-react';

// --- IMPORT NECESSARI PER FIREBASE ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, deleteDoc, setDoc, getDoc, updateDoc, increment } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyClzaGSuhKFnrQ_VOmJNIZXt3Yjp8ASCNU", 
  authDomain: "politigaffee.firebaseapp.com",
  projectId: "politigaffee",
  storageBucket: "politigaffee.firebasestorage.app",
  messagingSenderId: "686263197942",
  appId: "1:686263197942:web:4e0c680afb54397a190cd7"
};

// Inizializzazione sicura
let dbFire = null;
let auth = null;

try {
    const app = initializeApp(firebaseConfig);
    dbFire = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase & Auth connessi.");
} catch (e) {
    console.error("Errore critico connessione Firebase:", e);
}

const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/800x450?text=Nessuna+Immagine';
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return url;
};

// --- DATABASE DI BACKUP (SEED DATA) - Usato solo per fallback ---
const staticPoliticians = [
    { id: 'meloni', name: 'Giorgia Meloni', party: 'FdI', role: 'Presidente del Consiglio', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giorgia&backgroundColor=ffdfbf', banner: 'bg-blue-900', bio: "Io sono Giorgia, sono una donna, sono una madre, sono cristiana.", stats: { followers: '3.1M', gaffes: 112, incoherences: 88 }, posts: [], inconsistencies: [] },
    // ... (Altri politici statici possono rimanere qui come struttura base se il DB è vuoto)
];

const App = () => {
    // STATE
    const [politicians, setPoliticians] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('home'); 
    const [homeTab, setHomeTab] = useState('general'); 
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFullRegister, setShowFullRegister] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    // Auth & User State
    const [authUser, setAuthUser] = useState(null); 
    const [userData, setUserData] = useState(null); 
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); 
    const [authMode, setAuthMode] = useState('login'); 
    const [authForm, setAuthForm] = useState({ username: '', password: '', email: '' });
    const [authError, setAuthError] = useState('');
    const [showOnboarding, setShowOnboarding] = useState(false); 
    
    // Admin State (Derivato)
    const isAdmin = userData?.isAdmin === true;
    
    // Edit States
    const [editingPolitician, setEditingPolitician] = useState(null);
    const [editMode, setEditMode] = useState('posts'); 
    const [postForm, setPostForm] = useState({ id: null, title: '', type: 'gaffe', content: '', date: '', source: '', body: '', image: '', publishedToHome: false });
    const [profileForm, setProfileForm] = useState({ id: '', name: '', party: '', role: '', avatar: '', bio: '', banner: 'bg-gray-500' });
    const [newPoliticianMode, setNewPoliticianMode] = useState(false);
    const [globalStats, setGlobalStats] = useState({ userCount: 0 });

    // --- CHECK AUTH ---
    useEffect(() => {
        if(!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setAuthUser(currentUser);
            if (currentUser) {
                if (dbFire) {
                    const userRef = doc(dbFire, "users", currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setUserData(userSnap.data());
                    }
                }
            } else {
                setUserData(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // --- SYNC DATABASE & STATS ---
    useEffect(() => {
        if (!dbFire) {
            setPoliticians(staticPoliticians);
            setLoading(false);
            return;
        }
        
        // Sync Politicians
        const unsubPol = onSnapshot(collection(dbFire, "politicians"), (snapshot) => {
            if (snapshot.empty) {
                setPoliticians([]); 
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
            }
            setLoading(false);
        }, (error) => {
            console.error("Errore lettura DB:", error);
            setPoliticians(staticPoliticians); // Fallback
            setLoading(false);
        });

        // Sync Stats
        const unsubStats = onSnapshot(doc(dbFire, "stats", "general"), (doc) => {
            if (doc.exists()) {
                setGlobalStats(doc.data());
            }
        });

        return () => {
            unsubPol();
            unsubStats();
        };
    }, []);

    // --- USER AUTH ACTIONS ---
    const handleUserAuth = async () => {
        if (!auth || !dbFire) return setAuthError("Servizio non disponibile.");
        setAuthError('');
        
        try {
            if (authMode === 'signup') {
                const email = authForm.email || `${authForm.username.toLowerCase().replace(/\s/g, '')}@politigaffe.local`;
                const userCred = await createUserWithEmailAndPassword(auth, email, authForm.password);
                
                await setDoc(doc(dbFire, "users", userCred.user.uid), {
                    username: authForm.username,
                    email: email,
                    isAdmin: false, 
                    following: [], 
                    createdAt: new Date().toISOString()
                });
                
                // Aggiorna Stats (userCount)
                await updateDoc(doc(dbFire, "stats", "general"), {
                    userCount: increment(1)
                });
                
                setShowOnboarding(true);
                setView('home');
                setHomeTab('favorites');

            } else {
                let loginEmail = authForm.username; 
                if (!loginEmail.includes('@')) {
                     loginEmail = `${loginEmail.toLowerCase().replace(/\s/g, '')}@politigaffe.local`;
                }
                await signInWithEmailAndPassword(auth, loginEmail, authForm.password);
                // I dati utente (isAdmin incluso) si caricano via useEffect
            }
            setIsLoginModalOpen(false);
            setAuthForm({ username: '', password: '', email: '' });
        } catch (e) {
            let msg = e.message;
            if(e.code === 'auth/invalid-email') msg = "Formato non valido.";
            if(e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === "auth/invalid-credential") msg = "Credenziali errate.";
            if(e.code === 'auth/email-already-in-use') msg = "Utente già registrato.";
            setAuthError(msg);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setUserData(null);
        setView('home');
        setHomeTab('general');
        setEditingPolitician(null);
    };

    const toggleFollow = async (politicianId) => {
        if (!authUser || !userData) return setIsLoginModalOpen(true);
        
        const isFollowing = userData.following?.includes(politicianId);
        let newFollowing;
        
        if (isFollowing) {
            newFollowing = userData.following.filter(id => id !== politicianId);
        } else {
            newFollowing = [...(userData.following || []), politicianId];
        }
        
        setUserData({ ...userData, following: newFollowing }); // Optimistic
        await updateDoc(doc(dbFire, "users", authUser.uid), { following: newFollowing });
    };

    // --- ADMIN ACTIONS (Database) ---
    const saveData = async (collectionName, docId, data, merge = true) => {
        if (dbFire && isAdmin) {
            try {
                await setDoc(doc(dbFire, collectionName, docId), data, { merge });
                return true;
            } catch(e) { alert("Errore salvataggio: " + e.message); return false; }
        }
        return false;
    };

    const deleteData = async (collectionName, docId) => {
        if (dbFire && isAdmin) {
            try {
                await deleteDoc(doc(dbFire, collectionName, docId));
                return true;
            } catch(e) { alert("Errore eliminazione: " + e.message); return false; }
        }
        return false;
    };

    const handleSavePoliticianProfile = async () => {
        if (!profileForm.name) return;
        const polId = newPoliticianMode ? profileForm.name.toLowerCase().replace(/\s+/g, '') : editingPolitician.id;
        const polData = { 
            ...profileForm, 
            id: polId,
            posts: newPoliticianMode ? [] : (editingPolitician.posts || []),
            inconsistencies: newPoliticianMode ? [] : (editingPolitician.inconsistencies || []),
            stats: newPoliticianMode ? { followers: '0', gaffes: 0, incoherences: 0 } : (editingPolitician.stats || { followers: '0', gaffes: 0, incoherences: 0 })
        };
        const success = await saveData("politicians", polId, polData);
        if (success) {
            if (newPoliticianMode) handleSelectPolitician(polData);
            else setEditingPolitician(polData);
            alert("Profilo Salvato!");
        }
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
        const success = await saveData("politicians", editingPolitician.id, { posts: updatedPosts }, true);
        if(success) {
            setEditingPolitician(updatedPol);
            resetPostForm();
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Eliminare post?")) return;
        const updatedPosts = editingPolitician.posts.filter(p => p.id !== postId);
        const updatedPol = { ...editingPolitician, posts: updatedPosts };
        const success = await saveData("politicians", editingPolitician.id, { posts: updatedPosts }, true);
        if(success) setEditingPolitician(updatedPol);
    };

    const handleDeletePolitician = async (e, politicianId) => {
        e.stopPropagation();
        if (!window.confirm("Eliminare definitivamente questo politico?")) return;
        const success = await deleteData("politicians", politicianId);
        if (success && editingPolitician?.id === politicianId) setEditingPolitician(null);
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

    const navigateTo = (v) => { setView(v); setMobileMenuOpen(false); };
    const handleProfileClick = (p) => { setSelectedProfile(p); setShowFullRegister(false); setView('profile'); setMobileMenuOpen(false); };
    const handlePostClick = (p) => { setSelectedPost(p); setView('article'); };
    const goBackToProfile = () => { setView('profile'); setSelectedPost(null); };
    const resetPostForm = () => setPostForm({ id: null, title: '', type: 'gaffe', content: '', date: '', source: '', body: '', image: '', publishedToHome: false });
    
    const openAuthModal = (mode) => {
        setAuthMode(mode);
        setIsLoginModalOpen(true);
        setAuthError('');
        setAuthForm({ username: '', password: '', email: '' });
    }

    const filteredPoliticians = politicians.filter(p => 
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (p.party?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    let homeFeed = [];
    if (homeTab === 'general') {
        politicians.forEach(p => {
            if (p.posts) {
                p.posts.forEach(post => {
                    if (post.publishedToHome) {
                        homeFeed.push({ ...post, politician: p });
                    }
                });
            }
        });
    } else if (homeTab === 'favorites') {
        if (userData && userData.following) {
            politicians.forEach(p => {
                if (userData.following.includes(p.id)) {
                    if (p.posts) {
                        p.posts.forEach(post => {
                            homeFeed.push({ ...post, politician: p });
                        });
                    }
                }
            });
        }
    }
    homeFeed.sort((a, b) => b.id - a.id);

    const gaffePosts = (selectedProfile?.posts || []).filter(p => p.type === 'gaffe' || p.type === 'quote');
    const newsPosts = (selectedProfile?.posts || []).filter(p => p.type === 'news');
    const visibleGaffes = showFullRegister ? gaffePosts : gaffePosts.slice(0, 5);

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#F4F1EA]"><Loader2 className="animate-spin text-black" size={48}/></div>;

    // --- ONBOARDING COMPONENT ---
    if (showOnboarding) {
        return (
            <div className="h-screen bg-[#F4F1EA] flex flex-col p-6 items-center justify-center animate-in fade-in">
                <div className="max-w-2xl w-full bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-3xl font-black serif-font mb-2">Benvenuto!</h2>
                    <p className="text-gray-600 mb-6 font-mono text-sm">Seleziona almeno 3 politici da monitorare per iniziare.</p>
                    
                    <div className="mb-4">
                        <input type="text" placeholder="Cerca..." className="w-full p-2 border border-black text-sm uppercase font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 h-64 overflow-y-auto custom-scrollbar p-2 border border-gray-200 mb-6">
                        {filteredPoliticians.map(p => {
                            const isSelected = userData?.following?.includes(p.id);
                            return (
                                <div key={p.id} onClick={() => toggleFollow(p.id)} className={`cursor-pointer flex flex-col items-center p-2 border transition-all ${isSelected ? 'border-black bg-yellow-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <img src={getImageUrl(p.avatar)} className="w-10 h-10 rounded-full bg-gray-200 object-cover mb-2" />
                                    <span className="text-[10px] font-bold text-center leading-tight">{p.name}</span>
                                    {isSelected && <CheckCircle size={12} className="text-green-600 mt-1"/>}
                                </div>
                            )
                        })}
                    </div>

                    <button 
                        onClick={() => { setShowOnboarding(false); setView('home'); }} 
                        className="w-full bg-black text-white p-3 font-bold uppercase hover:bg-gray-800 disabled:opacity-50"
                        disabled={(userData?.following?.length || 0) < 1}
                    >
                        Vai alla Home ({userData?.following?.length || 0})
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN APP ---
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
                    <button onClick={() => navigateTo('database')} className={`w-full flex items-center gap-3 px-3 py-2 border border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] ${view === 'database' ? 'bg-black text-white' : 'bg-white text-black'}`}><Users size={16} /> <span className="font-bold">Database</span></button>
                    <button onClick={() => setView('about')} className={`w-full flex items-center gap-3 px-3 py-2 border border-black text-sm transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] ${view === 'about' ? 'bg-black text-white' : 'bg-white text-black'}`}><Info size={16} /> <span className="font-bold">Manifesto</span></button>
                </nav>
                <div className="p-4 border-t border-black bg-white">
                    {authUser ? (
                        <div className="mb-4 text-xs">
                            <p className="font-bold">Ciao, {userData?.username || 'Utente'}</p>
                            <button onClick={handleLogout} className="text-red-600 underline">Logout</button>
                        </div>
                    ) : (
                        <button onClick={() => openAuthModal('login')} className="w-full bg-blue-600 text-white p-2 text-xs font-bold uppercase mb-4 flex items-center justify-center gap-2"><LogIn size={14}/> Accedi</button>
                    )}
                    
                    {/* Pulsante Admin nascosto */}
                    {isAdmin && (
                         <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                             <button onClick={() => setView('admin')} className="text-black hover:text-red-600 transition flex items-center gap-2 font-bold text-xs uppercase"><Settings size={14} /> Pannello Admin</button>
                         </div>
                    )}
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
                        <button onClick={() => navigateTo('database')} className="w-full text-left p-4 border border-black bg-white text-lg font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 flex items-center gap-4"><Users size={24} /> Database</button>
                        <button onClick={() => navigateTo('about')} className="w-full text-left p-4 border border-black bg-white text-lg font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 flex items-center gap-4"><Info size={24} /> Manifesto</button>
                    </nav>
                    <div className="mt-auto pt-6 border-t border-black space-y-4">
                         {authUser ? (
                            <div className="text-center">
                                <p className="font-bold mb-2">@{userData?.username}</p>
                                <button onClick={handleLogout} className="text-red-600 underline font-bold uppercase text-sm">Esci</button>
                            </div>
                        ) : (
                            <button onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }} className="w-full bg-blue-600 text-white p-3 font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none">Accedi / Registrati</button>
                        )}
                        {isAdmin && (
                            <button onClick={() => navigateTo('admin')} className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 text-white font-bold uppercase text-sm border border-black">
                                <Settings size={18}/> Pannello Admin
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* AUTH MODAL (LOGIN / SIGNUP) */}
            {isLoginModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-8 relative">
                        <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-2 right-2 p-1 hover:bg-gray-100"><X size={20}/></button>
                        
                        <div className="flex mb-6 border-b border-gray-200">
                             <button 
                                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                                className={`flex-1 pb-2 font-bold uppercase text-sm ${authMode === 'login' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
                             >
                                Accedi
                             </button>
                             <button 
                                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                                className={`flex-1 pb-2 font-bold uppercase text-sm ${authMode === 'signup' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
                             >
                                Registrati
                             </button>
                        </div>
                        
                        {authMode === 'signup' ? (
                            // REGISTRATION FORM
                            <div className="space-y-4">
                                <h3 className="font-black text-xl mb-4">Crea un account</h3>
                                <input type="text" placeholder="Username" className="w-full p-3 border-2 border-black text-sm font-bold outline-none focus:bg-yellow-50" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
                                <input type="password" placeholder="Password" className="w-full p-3 border-2 border-black text-sm font-bold outline-none focus:bg-yellow-50" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                <div className="text-xs text-gray-500 font-mono text-center">- Opzionale -</div>
                                <input type="email" placeholder="Email di recupero" className="w-full p-3 border-2 border-black text-sm font-bold outline-none focus:bg-yellow-50" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                                
                                {authError && <div className="bg-red-100 border border-red-500 text-red-700 p-2 text-xs font-bold text-center">{authError}</div>}
                                <button onClick={handleUserAuth} className="w-full bg-black text-white border-2 border-black p-3 font-bold uppercase hover:bg-gray-800 mt-2">Registrati</button>
                            </div>
                        ) : (
                            // LOGIN FORM
                            <div className="space-y-4">
                                <h3 className="font-black text-xl mb-4">Bentornato</h3>
                                <input type="text" placeholder="Username o Email" className="w-full p-3 border-2 border-black text-sm font-bold outline-none focus:bg-yellow-50" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
                                <input type="password" placeholder="Password" className="w-full p-3 border-2 border-black text-sm font-bold outline-none focus:bg-yellow-50" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                                
                                {authError && <div className="bg-red-100 border border-red-500 text-red-700 p-2 text-xs font-bold text-center">{authError}</div>}
                                <button onClick={handleUserAuth} className="w-full bg-black text-white border-2 border-black p-3 font-bold uppercase hover:bg-gray-800 mt-2">Accedi</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative w-full">
                <div className="md:hidden sticky top-0 z-50 bg-yellow-400 border-b border-black p-3 flex justify-between items-center shadow-md h-16">
                    <div className="w-10">
                        {view !== 'home' ? <button onClick={() => view === 'article' ? goBackToProfile() : setView('home')} className="p-1 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"><ArrowLeft size={20} /></button> : null}
                    </div>
                    <div className="font-black text-xl flex items-center gap-2 serif-font uppercase tracking-tighter"><AlertTriangle className="text-black stroke-[2]" size={24} /> PolitiGaffe</div>
                    <div className="w-10 flex justify-end"><button onClick={() => setMobileMenuOpen(true)} className="p-1 border border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none"><Menu size={20} /></button></div>
                </div>

                {view === 'home' && (
                    <div className="max-w-2xl mx-auto p-4 pb-24">
                        <div className="flex border-b-2 border-black mb-6 sticky top-16 md:top-0 bg-[#F4F1EA] z-40 pt-4">
                            <button onClick={() => setHomeTab('general')} className={`flex-1 py-3 font-bold uppercase text-sm border-b-4 transition-colors ${homeTab === 'general' ? 'border-black bg-white' : 'border-transparent text-gray-400 hover:text-black'}`}>Generale</button>
                            <button onClick={() => setHomeTab('favorites')} className={`flex-1 py-3 font-bold uppercase text-sm border-b-4 transition-colors ${homeTab === 'favorites' ? 'border-black bg-white' : 'border-transparent text-gray-400 hover:text-black'}`}>Preferiti</button>
                        </div>

                        {homeTab === 'favorites' && !authUser && (
                            <div className="text-center p-8 border-2 border-dashed border-gray-400">
                                <Lock className="mx-auto mb-4 text-gray-400" size={48}/>
                                <h3 className="font-black uppercase text-xl mb-2">Area Riservata</h3>
                                <p className="text-sm text-gray-600 mb-6">Accedi per vedere solo i politici che segui.</p>
                                <button onClick={() => openAuthModal('login')} className="bg-black text-white px-6 py-2 font-bold uppercase">Accedi Ora</button>
                            </div>
                        )}

                        {homeTab === 'favorites' && authUser && homeFeed.length === 0 && (
                            <div className="text-center p-8 border-2 border-dashed border-gray-400">
                                <p className="font-bold mb-4">Non segui ancora nessuno o non ci sono post.</p>
                                <button onClick={() => setShowOnboarding(true)} className="bg-black text-white px-6 py-2 font-bold uppercase">Gestisci Preferiti</button>
                            </div>
                        )}

                        {/* HOME FEED POSTS */}
                        <div className="space-y-6">
                            {homeFeed.map((post, idx) => (
                                <div key={idx} className="bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                    <div className="p-3 border-b border-black flex items-center justify-between bg-gray-50" onClick={() => handleProfileClick(post.politician)}>
                                        <div className="flex items-center gap-2 cursor-pointer">
                                            <img src={getImageUrl(post.politician.avatar)} className="w-8 h-8 rounded-full border border-black object-cover" />
                                            <div>
                                                <div className="font-bold text-sm leading-none">{post.politician.name}</div>
                                                <div className="text-[10px] text-gray-500 uppercase">{post.politician.party}</div>
                                            </div>
                                        </div>
                                        <button className="text-xs font-bold uppercase border border-black px-2 py-1 hover:bg-black hover:text-white transition">Vedi Profilo</button>
                                    </div>
                                    <div onClick={() => handlePostClick(post)} className="cursor-pointer">
                                        {post.image && (
                                            <div className="aspect-video w-full bg-gray-200 border-b border-black overflow-hidden relative group">
                                                <img src={getImageUrl(post.image)} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all"/>
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <div className="flex gap-2 mb-2">
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border border-black ${post.type === 'gaffe' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>{post.type}</span>
                                                <span className="text-[10px] font-mono text-gray-500 pt-0.5">{post.date}</span>
                                            </div>
                                            <h3 className="font-serif font-bold text-xl leading-tight mb-2">{post.title}</h3>
                                            <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">{post.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {homeFeed.length === 0 && (homeTab === 'general' || (homeTab === 'favorites' && authUser && userData?.following?.length > 0)) && (
                                <div className="text-center py-10 text-gray-400 font-mono text-xs">Nessun post trovato in questa sezione.</div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'database' && (
                    <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24">
                        <header className="mb-8 pt-4 border-b-2 border-black pb-6">
                            <h1 className="text-3xl md:text-5xl font-black text-black mb-3 serif-font uppercase tracking-tight">Database Politici</h1>
                            <p className="text-sm md:text-base text-gray-700 max-w-3xl font-medium leading-relaxed font-serif">
                                Tutti i profili monitorati dalla piattaforma.
                            </p>
                        </header>
                        <div className="mb-8 flex items-center border border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-lg">
                            <div className="bg-black text-white p-2"><Search size={18} /></div>
                            <input type="text" placeholder="CERCA NEL DATABASE..." className="w-full pl-3 pr-3 py-2 bg-transparent focus:outline-none text-sm font-bold uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        {politicians.length === 0 ? (
                            <div className="p-10 border-2 border-dashed border-gray-400 text-center text-gray-500 font-mono">
                                <p className="mb-4">NESSUN DATO TROVATO</p>
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
                                <div className="flex-1 pb-1 pt-2">
                                    <h1 className="text-3xl font-black serif-font mb-2 mt-3 uppercase leading-tight">{selectedProfile.name}</h1>
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
                    <div className="bg-[#F4F1EA] min-h-full animate-in fade-in duration-200 pb-20">
                         <div className="sticky top-0 bg-[#F4F1EA]/95 backdrop-blur border-b border-black px-4 py-3 flex justify-between items-center z-50">
                            <button onClick={goBackToProfile} className="flex items-center gap-2 font-bold uppercase hover:underline text-xs"><ArrowLeft size={16} /> Indietro</button>
                            <div className="flex gap-4"><Printer size={16} className="cursor-pointer hover:text-gray-600" /></div>
                        </div>
                        <article className="max-w-2xl mx-auto px-6 py-8 bg-white border-x border-black min-h-screen shadow-xl">
                            <header className="mb-6 pb-6 border-b border-gray-200">
                                <div className={`inline-block px-2 py-0.5 text-white font-mono text-[10px] font-bold uppercase mb-2 ${selectedPost.type === 'news' ? 'bg-blue-600' : 'bg-red-600'}`}>{selectedPost.type === 'news' ? 'Cronaca' : 'Dossier Gaffe'}</div>
                                <h1 className="text-3xl font-black serif-font mb-2 leading-tight">{selectedPost.title}</h1>
                                <div className="text-xs font-mono text-gray-500 uppercase">{selectedPost.date} • Fonte: {selectedPost.source}</div>
                            </header>
                            {selectedPost.image && <div className="border border-black p-1 mb-8 bg-gray-100"><div className="aspect-video w-full bg-gray-300 overflow-hidden grayscale contrast-125"><img src={getImageUrl(selectedPost.image)} alt={selectedPost.title} className="w-full h-full object-cover" /></div></div>}
                            <div className="prose prose-sm prose-slate mx-auto font-serif text-black leading-loose">
                                <p className="text-lg font-bold leading-relaxed mb-6 border-l-4 border-yellow-400 pl-4 italic bg-yellow-50 py-2">"{selectedPost.content}"</p>
                                <p>{selectedPost.body}</p>
                            </div>
                        </article>
                    </div>
                )}

                {view === 'admin' && (
                    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white min-h-full">
                        <header className="mb-8 pb-4 border-b border-black flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black uppercase serif-font">Admin Panel</h1>
                                <p className="text-xs font-mono text-gray-500 mt-1">Utenti totali: <span className="font-bold text-black">{globalStats.userCount || 0}</span></p>
                            </div>
                            <button onClick={handleLogout} className="flex items-center gap-1 text-xs uppercase font-bold text-red-600 hover:text-red-800"><LogOut size={14}/> Esci</button>
                        </header>
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
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <input type="checkbox" id="pubHome" className="w-4 h-4 accent-black" checked={postForm.publishedToHome} onChange={e => setPostForm({...postForm, publishedToHome: e.target.checked})} />
                                                            <label htmlFor="pubHome" className="text-xs font-bold uppercase cursor-pointer">Pubblica in Home (Feed Generale)</label>
                                                        </div>
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
                                                            <div>
                                                                <div className="font-bold truncate w-32">{post.title}</div>
                                                                {post.publishedToHome && <span className="text-[9px] bg-green-200 px-1 text-green-800">IN HOME</span>}
                                                            </div>
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