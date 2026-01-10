import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc,
  query, 
  where 
} from 'firebase/firestore';
import { ChatSession, User } from '../types';

// --- Configuration ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const isConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId
);

let auth: any;
let db: any;
let googleProvider: any;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase Initialization Failed:", error);
  }
}

// --- Mock Fallback (for when Firebase is not configured) ---
const mockService = {
  getUsers() {
    try { return JSON.parse(localStorage.getItem('neby_users') || '[]'); } catch { return []; }
  },
  saveUsers(users: any[]) {
    localStorage.setItem('neby_users', JSON.stringify(users));
  },
  async loginGoogle() {
    await new Promise(r => setTimeout(r, 800));
    return { uid: 'mock-google-' + Date.now(), displayName: 'Cosmic Traveler', email: 'traveler@galaxy.com', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cosmic', isAnonymous: false };
  },
  async loginEmail(email: string, pass: string) {
    await new Promise(r => setTimeout(r, 800));
    const users = this.getUsers();
    const user = users.find((u: any) => u.email === email && u.password === pass);
    if (!user) { const e: any = new Error('Invalid credentials'); e.code = 'auth/invalid-credential'; throw e; }
    return { uid: user.id, displayName: user.name, email: user.email, photoURL: user.avatar, isAnonymous: false };
  },
  async registerEmail(email: string, pass: string, name: string) {
    await new Promise(r => setTimeout(r, 800));
    const users = this.getUsers();
    if (users.find((u: any) => u.email === email)) { const e: any = new Error('Email exists'); e.code = 'auth/email-already-in-use'; throw e; }
    const newUser = { id: 'user-' + Date.now(), email, password: pass, name, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` };
    users.push(newUser);
    this.saveUsers(users);
    return { uid: newUser.id, displayName: newUser.name, email: newUser.email, photoURL: newUser.avatar, isAnonymous: false };
  },
  async loginGuest() {
    return { uid: 'guest-' + Date.now(), displayName: 'Guest', email: '', photoURL: null, isAnonymous: true };
  },
  subscribeToSessions(userId: string, callback: (sessions: ChatSession[]) => void) {
    const key = `neby_sessions_${userId}`;
    const load = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
    callback(load());
    return () => {};
  },
  async saveSession(userId: string, session: ChatSession) {
    const key = `neby_sessions_${userId}`;
    const sessions = JSON.parse(localStorage.getItem(key) || '[]');
    const index = sessions.findIndex((s: ChatSession) => s.id === session.id);
    if (index >= 0) sessions[index] = session; else sessions.push(session);
    localStorage.setItem(key, JSON.stringify(sessions));
  },
  async updateSessionTitle(userId: string, sessionId: string, newTitle: string) {
    const key = `neby_sessions_${userId}`;
    const sessions = JSON.parse(localStorage.getItem(key) || '[]');
    const index = sessions.findIndex((s: any) => s.id === sessionId);
    if (index >= 0) {
        sessions[index].title = newTitle;
        localStorage.setItem(key, JSON.stringify(sessions));
    }
  },
  async deleteSession(userId: string, sessionId: string) {
    const key = `neby_sessions_${userId}`;
    let sessions = JSON.parse(localStorage.getItem(key) || '[]');
    sessions = sessions.filter((s: ChatSession) => s.id !== sessionId);
    localStorage.setItem(key, JSON.stringify(sessions));
  }
};

// --- Real Service Implementation ---
export const firebaseService = {
  auth: isConfigured ? auth : null,
  db: isConfigured ? db : null,
  isConfigured,

  async loginGoogle() {
    if (!isConfigured) return mockService.loginGoogle();
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  },

  async loginEmail(email: string, pass: string) {
    if (!isConfigured) return mockService.loginEmail(email, pass);
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  },

  async registerEmail(email: string, pass: string, name: string) {
    if (!isConfigured) return mockService.registerEmail(email, pass, name);
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    // Note: Update profile logic could go here
    return result.user;
  },

  async loginGuest() {
    if (!isConfigured) return mockService.loginGuest();
    // Anonymous auth logic if enabled in Firebase
    return mockService.loginGuest(); // Fallback to local guest for simplicity
  },

  async logout() {
    if (isConfigured) await signOut(auth);
  },

  subscribeToSessions(userId: string, callback: (sessions: ChatSession[]) => void) {
    if (!isConfigured || userId.startsWith('guest-')) return mockService.subscribeToSessions(userId, callback);
    
    // Firestore Structure: collection 'users' -> doc userId -> collection 'sessions'
    const q = query(collection(db, 'users', userId, 'sessions'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: ChatSession[] = [];
      snapshot.forEach((doc) => {
        sessions.push(doc.data() as ChatSession);
      });
      // Sort by createdAt desc
      sessions.sort((a, b) => b.createdAt - a.createdAt);
      callback(sessions);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
    });
    
    return unsubscribe;
  },

  async saveSession(userId: string, session: ChatSession) {
    if (!isConfigured || userId.startsWith('guest-')) return mockService.saveSession(userId, session);
    
    try {
      const docRef = doc(db, 'users', userId, 'sessions', session.id);
      await setDoc(docRef, session, { merge: true });
    } catch (error) {
      console.error("Firestore Save Error:", error);
      throw error;
    }
  },

  async updateSessionTitle(userId: string, sessionId: string, newTitle: string) {
    if (!isConfigured || userId.startsWith('guest-')) return mockService.updateSessionTitle(userId, sessionId, newTitle);
    
    try {
      const docRef = doc(db, 'users', userId, 'sessions', sessionId);
      await setDoc(docRef, { title: newTitle }, { merge: true });
    } catch (error) {
      console.error("Firestore Title Update Error:", error);
    }
  },

  async deleteSession(userId: string, sessionId: string) {
    if (!isConfigured || userId.startsWith('guest-')) return mockService.deleteSession(userId, sessionId);
    
    try {
      await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
    } catch (error) {
      console.error("Firestore Delete Error:", error);
      throw error;
    }
  }
};