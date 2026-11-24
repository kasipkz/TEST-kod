// firebase.js — Authentication + Cloud Firestore (aiOffice/crm/*) + ДЕМО режим (құрылғы жады)
// Бұрынғы жобаларыңыздың (мысалы, такси) коллекцияларына тиіспейді: барлық деректер тек "aiOffice" ішінде.
// Құпия кілттер жоқ: apiKey — Firebase веб-кілті (ол көпшілікке арналған), қорғау Firestore Rules арқылы.

// ↓↓↓ Өз Firebase конфигіңізді осында енгізіңіз (Firebase Console → Project settings → Your apps → Web) ↓↓↓
export const firebaseConfig = {
  apiKey: "AIzaSyBmuNU_hM7ZwdnpEGt200s_C8HYcwdZsW8",
  authDomain: "qosshy-joly.firebaseapp.com",
  projectId: "qosshy-joly",
  storageBucket: "qosshy-joly.firebasestorage.app",
  messagingSenderId: "43683240461",
  appId: "1:43683240461:web:a439eab5d26e81b71a5344"
};
// ↑↑↑

const V = '10.12.2', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
let fb = null, mode = 'demo';
const listeners = {};
export const COLS = ['leads', 'tasks', 'sales', 'agents', 'proposals', 'settings'];

/* ---------- Firebase SDK-ны жүктеу (интернет жоқ болса — тек демо режим) ---------- */
export async function init() {
  try {
    if (!firebaseConfig.apiKey || /ЖАЗЫҢЫЗ|YOUR_/i.test(firebaseConfig.apiKey)) throw new Error('config');
    const [A, Au, F] = await Promise.all([import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')]);
    const app = A.initializeApp(firebaseConfig);
    fb = { Au, F, auth: Au.getAuth(app), db: F.getFirestore(app) };
    return true;
  } catch (e) { fb = null; return false; }
}
export const available = () => !!fb;
export const getMode = () => mode;
export function setMode(m) { mode = m; }

/* ---------- Authentication (email + құпия сөз) ---------- */
export const auth = {
  onChange(cb) { if (!fb) return cb(null); fb.Au.onAuthStateChanged(fb.auth, cb); },
  signIn(email, pw) { return fb.Au.signInWithEmailAndPassword(fb.auth, email, pw); },
  signOut() { return fb ? fb.Au.signOut(fb.auth) : Promise.resolve(); }
};

/* ---------- Деректер қоймасы: бірдей API (Firestore немесе демо) ---------- */
const lk = c => 'aiOffice_demo_' + c;
const lload = c => { try { return JSON.parse(localStorage.getItem(lk(c)) || '[]'); } catch (e) { return []; } };
const lsave = (c, a) => { try { localStorage.setItem(lk(c), JSON.stringify(a)); } catch (e) {} };
const lfire = c => (listeners[c] || []).forEach(cb => cb(lload(c)));
const col = c => fb.F.collection(fb.db, 'aiOffice', 'crm', c);
const dref = (c, id) => fb.F.doc(fb.db, 'aiOffice', 'crm', c, id);
const fbOn = () => mode === 'firebase' && fb;

export const store = {
  subscribe(c, cb) {
    if (fbOn()) return fb.F.onSnapshot(col(c), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), err => cb(null, err));
    (listeners[c] = listeners[c] || []).push(cb); cb(lload(c));
  },
  async add(c, o) { if (fbOn()) return (await fb.F.addDoc(col(c), o)).id; const a = lload(c), id = 'd' + Date.now() + Math.floor(Math.random() * 999); a.push({ id, ...o }); lsave(c, a); lfire(c); return id; },
  async set(c, id, o) { if (fbOn()) return fb.F.setDoc(dref(c, id), o, { merge: true }); const a = lload(c), i = a.findIndex(x => x.id === id); if (i < 0) a.push({ id, ...o }); else Object.assign(a[i], o); lsave(c, a); lfire(c); },
  async update(c, id, o) { if (fbOn()) return fb.F.updateDoc(dref(c, id), o); const a = lload(c), i = a.findIndex(x => x.id === id); if (i >= 0) { Object.assign(a[i], o); lsave(c, a); lfire(c); } },
  async remove(c, id) { if (fbOn()) return fb.F.deleteDoc(dref(c, id)); lsave(c, lload(c).filter(x => x.id !== id)); lfire(c); },
  clearDemo() { COLS.forEach(c => localStorage.removeItem(lk(c))); }
};
