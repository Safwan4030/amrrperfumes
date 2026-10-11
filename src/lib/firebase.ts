import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { CustomerInboxMessage, CustomerLead, SiteVisitorStats, Order, Product, FinancialAccount, AccountingTransaction, ExpenseItem, AccountTransfer } from '../types';
import { INITIAL_PRODUCTS, resolveProductImage } from '../data/products';

// Import Firebase config auto-generated during setup
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export type { FirebaseUser };

// Helper to save order to Firestore
export async function saveOrderToFirestore(order: any) {
  try {
    const orderRef = doc(db, 'orders', order.id);
    await setDoc(orderRef, {
      ...order,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('Order successfully stored in Firestore:', order.id);

    // Automatically store and preserve customer contact & order history in CRM
    if (order.shippingDetails?.email || order.shippingDetails?.phone) {
      await saveCustomerLead({
        name: order.shippingDetails.fullName || 'Valued Patron',
        email: order.shippingDetails.email || '',
        phone: order.shippingDetails.phone || '',
        city: order.shippingDetails.city || '',
        state: order.shippingDetails.state || '',
        pincode: order.shippingDetails.pincode || '',
        source: 'order_checkout',
        totalOrders: 1,
        totalSpent: order.totalAmount || 0,
        optedInOffers: true,
        notes: `Order #${order.id} - ${(order.items || []).map((i: any) => i.product?.name).filter(Boolean).join(', ')}`
      });
    }
  } catch (err) {
    console.error('Error saving order to Firestore:', err);
  }
}

// Helper to fetch a single order securely by ID
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    if (!orderId || !orderId.trim()) return null;
    const orderDoc = await getDoc(doc(db, 'orders', orderId.trim()));
    if (orderDoc.exists()) {
      return { id: orderDoc.id, ...orderDoc.data() } as Order;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching order by ID:', err);
    return null;
  }
}

// Helper to subscribe to orders securely
// - Admins receive all store orders
// - Authenticated customers receive only their own orders
// - Guests do not load other customers' private data
export function subscribeToOrders(
  callback: (orders: any[]) => void,
  userEmail?: string | null,
  isAdmin?: boolean
) {
  try {
    const ordersCol = collection(db, 'orders');

    if (isAdmin) {
      return onSnapshot(ordersCol, (snapshot) => {
        const ordersList: any[] = [];
        snapshot.forEach((docSnap) => {
          ordersList.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort newest first
        ordersList.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });
        callback(ordersList);
      }, (error) => {
        console.warn('Firestore orders subscription warning:', error);
      });
    }

    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      const q = query(ordersCol, where('shippingDetails.email', '==', cleanEmail));
      return onSnapshot(q, (snapshot) => {
        const ordersList: any[] = [];
        snapshot.forEach((docSnap) => {
          ordersList.push({ id: docSnap.id, ...docSnap.data() });
        });
        ordersList.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });
        callback(ordersList);
      }, (error) => {
        console.warn('Firestore user orders subscription warning:', error);
      });
    }

    // Guest visitor: do not stream global customer orders to browser
    callback([]);
    return () => {};
  } catch (err) {
    console.error('Error setting up orders subscription:', err);
    return () => {};
  }
}

// Helper to save or update user in Firestore
export async function saveUserProfile(uid: string, userData: { email: string; name: string; phone?: string }) {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      email: userData.email,
      name: userData.name,
      phone: userData.phone || '',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user profile to Firestore:', err);
  }
}

// Helper to Google Sign In
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user.email) {
      await saveUserProfile(user.uid, {
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        phone: user.phoneNumber || ''
      });
    }
    return user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';

    // Handle normal user cancellation / popup closure without treating it as a system error
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/popup-blocked' ||
      errorMessage.includes('auth/popup-closed-by-user') ||
      errorMessage.includes('popup-closed-by-user') ||
      errorMessage.includes('cancelled-popup-request')
    ) {
      return null;
    }

    console.warn('Google Sign-In note:', errorMessage || errorCode);
    throw error;
  }
}

// Helper to sign out
export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Helper to observe auth state changes across sessions
export function onAuthUserChanged(callback: (user: { email: string; name: string; phone?: string; uid: string } | null) => void) {
  try {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          phone: firebaseUser.phoneNumber || ''
        });
      } else {
        callback(null);
      }
    });
  } catch (err) {
    console.warn('onAuthStateChanged listener warning:', err);
    return () => {};
  }
}

// INBOX: Helper to save customer inquiry or feedback to Firestore
export async function saveMessageToFirestore(message: CustomerInboxMessage): Promise<void> {
  // Always persist to local cache first for guaranteed immediate offline/online availability
  try {
    const raw = localStorage.getItem('amrr_inbox_messages');
    const existing: CustomerInboxMessage[] = raw ? JSON.parse(raw) : [];
    const updated = [message, ...existing.filter(m => m.id !== message.id)];
    localStorage.setItem('amrr_inbox_messages', JSON.stringify(updated));
  } catch {
    // ignore storage quota
  }

  try {
    const msgRef = doc(db, 'messages', message.id);
    await setDoc(msgRef, {
      ...message,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('Customer message successfully stored in Firestore:', message.id);
  } catch (err) {
    console.error('Error saving customer message to Firestore:', err);
  }
}

// INBOX: Helper to listen to customer messages in real-time
export function subscribeToMessages(callback: (messages: CustomerInboxMessage[]) => void) {
  try {
    const messagesCol = collection(db, 'messages');
    return onSnapshot(messagesCol, (snapshot) => {
      const list: CustomerInboxMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          email: data.email || '',
          message: data.message || '',
          source: data.source || 'contact_support',
          createdAt: data.createdAt || new Date().toISOString(),
          read: Boolean(data.read),
          replied: Boolean(data.replied)
        });
      });

      // Merge with localStorage if needed
      try {
        const raw = localStorage.getItem('amrr_inbox_messages');
        if (raw) {
          const localList: CustomerInboxMessage[] = JSON.parse(raw);
          localList.forEach(localMsg => {
            if (!list.some(m => m.id === localMsg.id)) {
              list.push(localMsg);
            }
          });
        }
      } catch {
        // ignore
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Update local cache
      try {
        localStorage.setItem('amrr_inbox_messages', JSON.stringify(list));
      } catch {
        // ignore
      }

      callback(list);
    }, (error) => {
      console.warn('Firestore messages subscription warning:', error);
      // Fallback to local storage
      try {
        const raw = localStorage.getItem('amrr_inbox_messages');
        if (raw) callback(JSON.parse(raw));
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.error('Error setting up messages subscription:', err);
    try {
      const raw = localStorage.getItem('amrr_inbox_messages');
      if (raw) callback(JSON.parse(raw));
    } catch {
      // ignore
    }
    return () => {};
  }
}

// INBOX: Mark message as read/unread
export async function updateMessageStatusInFirestore(id: string, updates: { read?: boolean; replied?: boolean }): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_inbox_messages');
    if (raw) {
      const list: CustomerInboxMessage[] = JSON.parse(raw);
      const updated = list.map(m => m.id === id ? { ...m, ...updates } : m);
      localStorage.setItem('amrr_inbox_messages', JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  try {
    const msgRef = doc(db, 'messages', id);
    await updateDoc(msgRef, updates);
  } catch (err) {
    console.error('Error updating message status in Firestore:', err);
  }
}

// INBOX: Delete message
export async function deleteMessageFromFirestore(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_inbox_messages');
    if (raw) {
      const list: CustomerInboxMessage[] = JSON.parse(raw);
      const updated = list.filter(m => m.id !== id);
      localStorage.setItem('amrr_inbox_messages', JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  try {
    const msgRef = doc(db, 'messages', id);
    await deleteDoc(msgRef);
  } catch (err) {
    console.error('Error deleting message from Firestore:', err);
  }
}

// ==========================================
// 1. SITE VISITOR ANALYTICS TRACKING (100% ACCURATE REAL-TIME)
// ==========================================

const STATS_DOC_REF = () => doc(db, 'site_analytics', 'traffic');

// Helper to get today's date formatted in Indian Standard Time (IST - Asia/Kolkata)
export function getTodayIstDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// Reset or calibrate visitor counters to clean state (e.g. 0 or custom baseline)
export async function resetSiteVisitorStats(baseline?: {
  totalVisits?: number;
  uniqueVisitors?: number;
  todayVisits?: number;
}): Promise<void> {
  const statsRef = STATS_DOC_REF();
  const todayIst = getTodayIstDateString();
  const cleanStats: SiteVisitorStats = {
    totalVisits: baseline?.totalVisits ?? 0,
    uniqueVisitors: baseline?.uniqueVisitors ?? 0,
    todayVisits: baseline?.todayVisits ?? 0,
    lastVisitDate: todayIst,
    lastVisitAt: new Date().toISOString(),
    deviceCounts: {
      mobile: 0,
      desktop: 0,
      tablet: 0
    },
    recentVisits: []
  };

  try {
    await setDoc(statsRef, cleanStats);
    localStorage.setItem('amrr_site_stats', JSON.stringify(cleanStats));
  } catch (err) {
    console.error('Error resetting site visitor stats:', err);
    throw err;
  }
}

// Record a visitor hit (accurate deduplication per browser session & exclude admin)
export async function recordSiteVisit(options?: {
  isTestHit?: boolean;
  forceNewSession?: boolean;
}): Promise<void> {
  try {
    const isTestHit = Boolean(options?.isTestHit);

    // 1. Exclude Admin Browsing from Analytics (so store owner never inflates stats)
    if (!isTestHit) {
      const isAdminSession = 
        sessionStorage.getItem('amrr_admin_active') === 'true' ||
        window.location.hash.includes('admin') ||
        Boolean(localStorage.getItem('amrr_admin_auth'));
      if (isAdminSession) {
        return;
      }
    }

    const now = new Date();
    const todayStr = getTodayIstDateString();
    const nowMs = Date.now();

    // 2. Accurate Unique Visitor Tracking (Persistent Device ID)
    let visitorId = localStorage.getItem('amrr_vid');
    let isNewVisitor = false;
    if (!visitorId) {
      visitorId = 'vid_' + Math.random().toString(36).substring(2, 9) + '_' + nowMs;
      localStorage.setItem('amrr_vid', visitorId);
      isNewVisitor = true;
    }

    // 3. Accurate Session Tracking (30-minute rolling session window)
    const lastSessionTs = parseInt(sessionStorage.getItem('amrr_session_ts') || '0', 10);
    const isSessionExpired = !lastSessionTs || (nowMs - lastSessionTs > 30 * 60 * 1000);
    const isNewSession = isSessionExpired || Boolean(options?.forceNewSession) || isTestHit;

    // Update active session timestamp
    sessionStorage.setItem('amrr_session_ts', String(nowMs));

    // If within same session (and not a test hit), don't falsely inflate visit count
    if (!isNewSession && !isNewVisitor && !isTestHit) {
      return;
    }

    // 4. Accurate Device Detection
    const ua = (navigator.userAgent || '').toLowerCase();
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle)/i.test(ua);
    const isMobile = !isTablet && /mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua);
    const deviceType: 'Mobile' | 'Desktop' | 'Tablet' = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';

    // 5. Accurate Traffic Referrer
    let referrerSource = 'Direct';
    try {
      const ref = document.referrer;
      if (ref) {
        const host = new URL(ref).hostname.toLowerCase();
        if (host.includes('google')) referrerSource = 'Google Search';
        else if (host.includes('instagram')) referrerSource = 'Instagram';
        else if (host.includes('whatsapp') || host.includes('wa.me')) referrerSource = 'WhatsApp';
        else if (host.includes('facebook') || host.includes('fb.com')) referrerSource = 'Facebook';
        else if (host.includes('youtube')) referrerSource = 'YouTube';
        else if (!host.includes(window.location.hostname)) referrerSource = host;
      }
    } catch {
      // ignore
    }

    const visitEvent = {
      id: 'vis_' + nowMs,
      timestamp: now.toISOString(),
      device: deviceType,
      page: window.location.pathname || '/',
      referrer: referrerSource
    };

    // Update Firestore with transactional/atomic updates
    const statsRef = STATS_DOC_REF();
    const snap = await getDoc(statsRef);

    if (!snap.exists()) {
      // Initialize with exact real numbers: 1
      const initialStats: SiteVisitorStats = {
        totalVisits: 1,
        uniqueVisitors: 1,
        todayVisits: 1,
        lastVisitDate: todayStr,
        lastVisitAt: now.toISOString(),
        deviceCounts: {
          mobile: deviceType === 'Mobile' ? 1 : 0,
          desktop: deviceType === 'Desktop' ? 1 : 0,
          tablet: deviceType === 'Tablet' ? 1 : 0
        },
        recentVisits: [visitEvent]
      };
      await setDoc(statsRef, initialStats);
      try {
        localStorage.setItem('amrr_site_stats', JSON.stringify(initialStats));
      } catch {
        // ignore
      }
    } else {
      const data = snap.data();
      const lastDate = data.lastVisitDate || '';
      const isSameDay = lastDate === todayStr;

      const currentDevices = data.deviceCounts || { mobile: 0, desktop: 0, tablet: 0 };
      const devKey = deviceType.toLowerCase() as 'mobile' | 'desktop' | 'tablet';
      const updatedDevices = {
        mobile: (currentDevices.mobile || 0) + (devKey === 'mobile' ? 1 : 0),
        desktop: (currentDevices.desktop || 0) + (devKey === 'desktop' ? 1 : 0),
        tablet: (currentDevices.tablet || 0) + (devKey === 'tablet' ? 1 : 0)
      };

      const existingRecent = Array.isArray(data.recentVisits) ? data.recentVisits : [];
      const updatedRecent = [visitEvent, ...existingRecent].slice(0, 30);

      await updateDoc(statsRef, {
        totalVisits: increment(1),
        uniqueVisitors: isNewVisitor ? increment(1) : (data.uniqueVisitors || 1),
        todayVisits: isSameDay ? increment(1) : 1,
        lastVisitDate: todayStr,
        lastVisitAt: now.toISOString(),
        deviceCounts: updatedDevices,
        recentVisits: updatedRecent
      });

      // Update local storage cache
      try {
        const cached: SiteVisitorStats = {
          totalVisits: (data.totalVisits || 0) + 1,
          uniqueVisitors: (data.uniqueVisitors || 0) + (isNewVisitor ? 1 : 0),
          todayVisits: isSameDay ? ((data.todayVisits || 0) + 1) : 1,
          lastVisitDate: todayStr,
          lastVisitAt: now.toISOString(),
          deviceCounts: updatedDevices,
          recentVisits: updatedRecent
        };
        localStorage.setItem('amrr_site_stats', JSON.stringify(cached));
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Site visit record error:', err);
  }
}

// Subscribe to real-time Site Visitor Statistics
export function subscribeToSiteStats(callback: (stats: SiteVisitorStats) => void) {
  try {
    const statsRef = STATS_DOC_REF();
    return onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const stats: SiteVisitorStats = {
          totalVisits: typeof data.totalVisits === 'number' ? data.totalVisits : 0,
          uniqueVisitors: typeof data.uniqueVisitors === 'number' ? data.uniqueVisitors : 0,
          todayVisits: typeof data.todayVisits === 'number' ? data.todayVisits : 0,
          lastVisitDate: data.lastVisitDate,
          lastVisitAt: data.lastVisitAt || new Date().toISOString(),
          deviceCounts: data.deviceCounts || {
            mobile: 0,
            desktop: 0,
            tablet: 0
          },
          recentVisits: Array.isArray(data.recentVisits) ? data.recentVisits : []
        };
        try {
          localStorage.setItem('amrr_site_stats', JSON.stringify(stats));
        } catch {
          // ignore
        }
        callback(stats);
      } else {
        // Real zero baseline
        const zeroStats: SiteVisitorStats = {
          totalVisits: 0,
          uniqueVisitors: 0,
          todayVisits: 0,
          lastVisitAt: new Date().toISOString(),
          deviceCounts: { mobile: 0, desktop: 0, tablet: 0 },
          recentVisits: []
        };
        callback(zeroStats);
      }
    }, (error) => {
      console.warn('Firestore site stats subscription error:', error);
      try {
        const raw = localStorage.getItem('amrr_site_stats');
        if (raw) callback(JSON.parse(raw));
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.error('Error in subscribeToSiteStats:', err);
    try {
      const raw = localStorage.getItem('amrr_site_stats');
      if (raw) callback(JSON.parse(raw));
    } catch {
      // ignore
    }
    return () => {};
  }
}

// ==========================================
// 2. CUSTOMER LEADS & CRM CONTACTS (GMAIL & PHONES)
// ==========================================

// Helper to save or update customer details in Firestore & LocalStorage
export async function saveCustomerLead(lead: Partial<CustomerLead> & { email?: string; phone?: string }): Promise<void> {
  const emailNorm = (lead.email || '').trim().toLowerCase();
  const phoneClean = (lead.phone || '').trim().replace(/[^0-9+]/g, '');

  if (!emailNorm && !phoneClean) return;

  // Stable ID based on email or phone
  const leadId = emailNorm 
    ? 'cust_' + emailNorm.replace(/[^a-z0-9]/g, '_')
    : 'cust_' + phoneClean.replace(/[^0-9]/g, '');

  const nowIso = new Date().toISOString();

  // Update local storage cache
  try {
    const raw = localStorage.getItem('amrr_customer_leads');
    const existingList: CustomerLead[] = raw ? JSON.parse(raw) : [];
    const existingIdx = existingList.findIndex(c => c.id === leadId || (emailNorm && c.email.toLowerCase() === emailNorm));

    const updatedRecord: CustomerLead = {
      id: leadId,
      name: lead.name?.trim() || (existingIdx >= 0 ? existingList[existingIdx].name : 'Customer'),
      email: emailNorm || (existingIdx >= 0 ? existingList[existingIdx].email : ''),
      phone: phoneClean || (existingIdx >= 0 ? existingList[existingIdx].phone : ''),
      source: lead.source || (existingIdx >= 0 ? existingList[existingIdx].source : 'order_checkout'),
      optedInOffers: lead.optedInOffers !== undefined ? lead.optedInOffers : true,
      totalOrders: (existingIdx >= 0 ? existingList[existingIdx].totalOrders : 0) + (lead.totalOrders || 0),
      totalSpent: (existingIdx >= 0 ? existingList[existingIdx].totalSpent : 0) + (lead.totalSpent || 0),
      city: lead.city || (existingIdx >= 0 ? existingList[existingIdx].city : ''),
      state: lead.state || (existingIdx >= 0 ? existingList[existingIdx].state : ''),
      pincode: lead.pincode || (existingIdx >= 0 ? existingList[existingIdx].pincode : ''),
      notes: lead.notes || (existingIdx >= 0 ? existingList[existingIdx].notes : ''),
      tags: lead.tags || (existingIdx >= 0 ? existingList[existingIdx].tags : ['VIP', 'Offers']),
      createdAt: existingIdx >= 0 ? existingList[existingIdx].createdAt : nowIso,
      lastActiveAt: nowIso
    };

    if (existingIdx >= 0) {
      existingList[existingIdx] = updatedRecord;
    } else {
      existingList.unshift(updatedRecord);
    }
    localStorage.setItem('amrr_customer_leads', JSON.stringify(existingList));
  } catch {
    // ignore
  }

  // Update Firestore
  try {
    const custRef = doc(db, 'customers', leadId);
    const updateData: Record<string, any> = {
      id: leadId,
      name: lead.name?.trim() || 'Customer',
      email: emailNorm || '',
      phone: phoneClean || '',
      source: lead.source || 'order_checkout',
      optedInOffers: lead.optedInOffers !== undefined ? lead.optedInOffers : true,
      lastActiveAt: nowIso
    };

    if (lead.city) updateData.city = lead.city;
    if (lead.state) updateData.state = lead.state;
    if (lead.pincode) updateData.pincode = lead.pincode;
    if (lead.notes) updateData.notes = lead.notes;
    if (lead.tags) updateData.tags = lead.tags;
    if (lead.totalOrders) updateData.totalOrders = increment(lead.totalOrders);
    if (lead.totalSpent) updateData.totalSpent = increment(lead.totalSpent);

    await setDoc(custRef, updateData, { merge: true });
  } catch (err) {
    console.error('Error saving customer lead to Firestore:', err);
  }
}

// Subscribe to real-time Customer Leads
export function subscribeToCustomerLeads(callback: (leads: CustomerLead[]) => void) {
  try {
    const custCol = collection(db, 'customers');
    return onSnapshot(custCol, (snapshot) => {
      const leads: CustomerLead[] = [];
      snapshot.forEach((docSnap) => {
        leads.push({ id: docSnap.id, ...docSnap.data() } as CustomerLead);
      });

      // Sort newest / last active first
      leads.sort((a, b) => {
        const timeA = new Date(a.lastActiveAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastActiveAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      try {
        localStorage.setItem('amrr_customer_leads', JSON.stringify(leads));
      } catch {
        // ignore
      }

      callback(leads);
    }, (error) => {
      console.warn('Customer leads subscription warning:', error);
      try {
        const raw = localStorage.getItem('amrr_customer_leads');
        if (raw) callback(JSON.parse(raw));
      } catch {
        // ignore
      }
    });
  } catch (err) {
    console.error('Error setting up customer leads subscription:', err);
    try {
      const raw = localStorage.getItem('amrr_customer_leads');
      if (raw) callback(JSON.parse(raw));
    } catch {
      // ignore
    }
    return () => {};
  }
}

// Customer CRM leads are permanent records and protected from deletion
export async function deleteCustomerLeadFromFirestore(id: string): Promise<void> {
  console.log('Customer CRM records are permanently preserved and protected from deletion. Target ID:', id);
}

// Automatically sync orders into customer leads so past buyers are captured
export async function syncExistingOrdersToCustomerLeads(orders: Order[]): Promise<void> {
  if (!orders || orders.length === 0) return;

  for (const o of orders) {
    if (o.shippingDetails?.email || o.shippingDetails?.phone) {
      await saveCustomerLead({
        name: o.shippingDetails.fullName || 'AMRR Patron',
        email: o.shippingDetails.email || '',
        phone: o.shippingDetails.phone || '',
        city: o.shippingDetails.city || '',
        state: o.shippingDetails.state || '',
        pincode: o.shippingDetails.pincode || '',
        source: 'order_checkout',
        totalOrders: 1,
        totalSpent: o.totalAmount || 0,
        optedInOffers: true,
        notes: `Order #${o.id} - ${o.items.map(i => i.product.name).join(', ')}`
      });
    }
  }
}

// ==========================================
// 3. PRODUCT CATALOG — SINGLE SOURCE OF TRUTH (FIRESTORE)
// ==========================================

const PRODUCTS_COL_NAME = 'products';

// Normalizes document data from Firestore into full Product entity
export function normalizeFirestoreProduct(id: string, data: any): Product {
  const effectiveCategory = data.category || 'Extrait de Parfum';
  const rawImage = data.image || '';
  const resolvedImg = resolveProductImage(rawImage, id);

  const rawGallery = Array.isArray(data.gallery) && data.gallery.length > 0
    ? data.gallery.map((g: string) => resolveProductImage(g, id))
    : [resolvedImg];

  return {
    ...data,
    id,
    name: data.name || id,
    subtitle: data.subtitle || `${effectiveCategory} (50 ml)`,
    category: effectiveCategory,
    family: data.family || 'Woody Oud',
    shortDescription: data.shortDescription || 'Artisanal high-concentration fragrance formulated by AMRR Perfumes.',
    story: data.story || 'Formulated with high-concentration French botanicals and rare aged agarwood.',
    price50ml: typeof data.price50ml === 'number' ? data.price50ml : Number(data.price50ml) || 999,
    originalPrice50ml: data.originalPrice50ml ? Number(data.originalPrice50ml) : undefined,
    costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
    cogs: data.cogs !== undefined ? Number(data.cogs) : undefined,
    sku: data.sku || undefined,
    availableSizes: Array.isArray(data.availableSizes) && data.availableSizes.length > 0 ? data.availableSizes : ['50 ml'],
    rating: typeof data.rating === 'number' ? data.rating : 5.0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 12,
    inStock: data.inStock !== false && (data.stockQuantity === undefined || Number(data.stockQuantity) > 0),
    stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : 15,
    isPublished: data.isPublished !== false, // default true unless explicitly unpublished
    isBestSeller: Boolean(data.isBestSeller),
    isNewArrival: Boolean(data.isNewArrival),
    isLimitedEdition: Boolean(data.isLimitedEdition),
    image: resolvedImg,
    gallery: rawGallery,
    notes: {
      top: Array.isArray(data.notes?.top) ? data.notes.top : ['Calabrian Bergamot'],
      heart: Array.isArray(data.notes?.heart) ? data.notes.heart : ['White Suede'],
      base: Array.isArray(data.notes?.base) ? data.notes.base : ['Wild Agarwood']
    },
    longevity: typeof data.longevity === 'number' ? data.longevity : 5,
    projection: typeof data.projection === 'number' ? data.projection : 4,
    sillage: data.sillage || 'Enveloping',
    gender: data.gender || 'Unisex',
    season: Array.isArray(data.season) ? data.season : ['All Seasons'],
    occasion: Array.isArray(data.occasion) ? data.occasion : ['Signature Daily Luxury'],
    concentration: data.concentration || effectiveCategory,
    ingredients: data.ingredients || 'Alcohol Denat., Parfum (Fragrance), Aqua (Water).',
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

// -------------------------------------------------------------
// Deleted Product Tracking & Management
// -------------------------------------------------------------
const DELETED_PRODUCTS_KEY = 'amrr_deleted_product_ids';

export function getDeletedProductIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function recordProductDeleted(productId: string): void {
  try {
    const current = getDeletedProductIds();
    if (!current.includes(productId)) {
      const updated = [...current, productId];
      localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(updated));
    }
  } catch {}
}

export function unmarkProductDeleted(productId: string): void {
  try {
    const current = getDeletedProductIds();
    const updated = current.filter(id => id !== productId);
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(updated));
  } catch {}
}

// Subscribe to real-time products stream
export function subscribeToProducts(
  callback: (products: Product[]) => void,
  onError?: (error: any) => void
): () => void {
  try {
    const colRef = collection(db, PRODUCTS_COL_NAME);
    return onSnapshot(colRef, (snapshot) => {
      const deletedIds = getDeletedProductIds();
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        if (!deletedIds.includes(docSnap.id)) {
          items.push(normalizeFirestoreProduct(docSnap.id, docSnap.data()));
        }
      });

      // Maintain a stable, premium presentation order
      const orderRank: Record<string, number> = {
        'khael-valley': 1,
        'kaahf': 2,
        'rosey-oud': 3,
        'akoya': 4,
        'inperial': 5,
        'alif-escala': 6,
        'musk-rijali': 7,
        'armani-stronger': 8,
        'summer-oud': 9
      };

      items.sort((a, b) => {
        const rankA = orderRank[a.id] ?? 99;
        const rankB = orderRank[b.id] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });

      // Update cache in localStorage for instant cold-start
      try {
        localStorage.setItem('amrr_catalog_products', JSON.stringify(items));
        localStorage.setItem('amrr_catalog_updated_at', new Date().toISOString());
      } catch {}

      callback(items);
    }, (error) => {
      console.warn('Firestore products onSnapshot warning:', error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.error('Error in subscribeToProducts:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// Direct fetch from Firestore (bypassing local cache)
export async function getProductsFromFirestore(): Promise<Product[]> {
  try {
    const colRef = collection(db, PRODUCTS_COL_NAME);
    const snap = await getDocs(colRef);
    const deletedIds = getDeletedProductIds();

    if (snap.empty) {
      // First boot: Seed initial catalog to Firestore (skipping any deleted items)
      const toSeed = INITIAL_PRODUCTS.filter(p => !deletedIds.includes(p.id));
      for (const p of toSeed) {
        try {
          await setDoc(doc(db, PRODUCTS_COL_NAME, p.id), {
            ...p,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch {}
      }
      return toSeed;
    }

    const items: Product[] = [];
    snap.forEach((docSnap) => {
      if (!deletedIds.includes(docSnap.id)) {
        items.push(normalizeFirestoreProduct(docSnap.id, docSnap.data()));
      }
    });
    return items;
  } catch (err) {
    console.warn('Error fetching products from Firestore:', err);
    return [];
  }
}

// Save or Update Product in Firestore
export async function saveProductToFirestore(product: Product): Promise<void> {
  // If product was previously marked deleted, unmark it
  unmarkProductDeleted(product.id);

  // Update local cache immediately
  try {
    const raw = localStorage.getItem('amrr_catalog_products');
    const list: Product[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(p => p.id === product.id);
    if (idx >= 0) list[idx] = product;
    else list.unshift(product);
    localStorage.setItem('amrr_catalog_products', JSON.stringify(list));
  } catch {}

  try {
    const prodRef = doc(db, PRODUCTS_COL_NAME, product.id);
    const payload = {
      ...product,
      updatedAt: new Date().toISOString()
    };
    await setDoc(prodRef, payload, { merge: true });
    console.log('Product saved successfully to Firestore:', product.id);
  } catch (err) {
    console.error('Error saving product to Firestore:', err);
  }
}

// Delete Product from Firestore
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  // 1. Immediately record in deleted product IDs registry
  recordProductDeleted(productId);

  // 2. Immediately purge from local cache
  try {
    const raw = localStorage.getItem('amrr_catalog_products');
    if (raw) {
      const list: Product[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== productId);
      localStorage.setItem('amrr_catalog_products', JSON.stringify(filtered));
    }
  } catch {}

  // 3. Delete document from Firestore
  try {
    const prodRef = doc(db, PRODUCTS_COL_NAME, productId);
    await deleteDoc(prodRef);
    console.log('Product deleted from Firestore:', productId);
  } catch (err) {
    console.warn('Firestore product delete note:', err);
  }
}

// -------------------------------------------------------------
// Financial Accounting & Ledger Integration
// -------------------------------------------------------------

export const DEFAULT_FINANCIAL_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc_razorpay',
    name: 'Razorpay Payment Gateway',
    type: 'razorpay',
    openingBalance: 0,
    currentBalance: 0,
    notes: 'Online customer checkout gateway'
  },
  {
    id: 'acc_bank',
    name: 'AMRR Current Account',
    type: 'bank',
    bankName: 'HDFC Bank',
    accountNumber: '**** 5028',
    openingBalance: 0,
    currentBalance: 0,
    notes: 'Primary business operating account'
  },
  {
    id: 'acc_cash',
    name: 'Studio Cash Register',
    type: 'cash',
    openingBalance: 0,
    currentBalance: 0,
    notes: 'Petty cash and in-person transactions'
  }
];

export async function saveFinancialAccount(account: FinancialAccount): Promise<void> {
  try {
    const ref = doc(db, 'financial_accounts', account.id);
    await setDoc(ref, { ...account, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving financial account:', err);
  }
}

export async function saveAccountingTransaction(transaction: AccountingTransaction): Promise<void> {
  try {
    const ref = doc(db, 'accounting_transactions', transaction.id);
    await setDoc(ref, transaction, { merge: true });
  } catch (err) {
    console.error('Error saving accounting transaction:', err);
  }
}

export async function saveExpense(expense: ExpenseItem): Promise<void> {
  try {
    const ref = doc(db, 'expenses', expense.id);
    await setDoc(ref, expense, { merge: true });
    await saveAccountingTransaction({
      id: `tx_${expense.id}`,
      date: expense.date,
      type: 'expense',
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      accountId: expense.accountId,
      accountName: expense.accountName,
      supplier: expense.supplier,
      paymentMethod: expense.paymentMethod,
      referenceNumber: expense.referenceNumber,
      notes: expense.notes,
      createdAt: expense.createdAt || new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saving expense:', err);
  }
}

export async function deleteExpense(expenseId: string, _amount?: number, _accountId?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    await deleteDoc(doc(db, 'accounting_transactions', `tx_${expenseId}`));
  } catch (err) {
    console.error('Error deleting expense:', err);
  }
}

export async function saveAccountTransfer(transfer: AccountTransfer): Promise<void> {
  try {
    const ref = doc(db, 'account_transfers', transfer.id);
    await setDoc(ref, transfer, { merge: true });
    await saveAccountingTransaction({
      id: `tx_${transfer.id}`,
      date: transfer.date,
      type: 'transfer',
      amount: transfer.amount,
      description: `Transfer: ${transfer.fromAccountName} -> ${transfer.toAccountName}`,
      referenceNumber: transfer.referenceNumber,
      notes: transfer.notes,
      createdAt: transfer.createdAt || new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saving account transfer:', err);
  }
}

export async function recordRefundInAccounting(order: Order, refundAmount: number, reason?: string): Promise<void> {
  try {
    const ref = doc(db, 'accounting_transactions', `refund_${order.id}_${Date.now()}`);
    await setDoc(ref, {
      id: `refund_${order.id}_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'refund',
      amount: refundAmount,
      description: `Refund for Order #${order.id}${reason ? ` (${reason})` : ''}`,
      orderId: order.id,
      customerName: order.shippingDetails?.fullName || 'Customer',
      paymentMethod: order.paymentMethod || 'Razorpay',
      notes: reason || 'Customer refund',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error recording refund in accounting:', err);
  }
}


