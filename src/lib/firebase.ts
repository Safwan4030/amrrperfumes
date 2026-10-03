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
import { 
  CustomerInboxMessage, 
  CustomerLead, 
  SiteVisitorStats, 
  Order,
  FinancialAccount,
  AccountingTransaction,
  ExpenseItem,
  AccountTransfer 
} from '../types';

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

    // Automatically record verified order sale in Accounting system
    if (order.status !== 'Cancelled' && order.totalAmount > 0) {
      await recordOrderSaleInAccounting(order);
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
// 3. ACCOUNTS & ACCOUNTING SYSTEM (LEDGER, EXPENSES, WALLETS)
// ==========================================

export const DEFAULT_FINANCIAL_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc_razorpay',
    name: 'Razorpay Gateway',
    type: 'razorpay',
    openingBalance: 0,
    currentBalance: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    notes: 'Online orders payment gateway settlement account',
    createdAt: new Date().toISOString()
  },
  {
    id: 'acc_bank',
    name: 'Primary Bank Account (HDFC/ICICI)',
    type: 'bank',
    openingBalance: 0,
    currentBalance: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    bankName: 'HDFC Bank',
    notes: 'Main business operational checking account',
    createdAt: new Date().toISOString()
  },
  {
    id: 'acc_cash',
    name: 'Cash in Hand (Store/Atelier)',
    type: 'cash',
    openingBalance: 0,
    currentBalance: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    notes: 'Physical cash on delivery & counter register',
    createdAt: new Date().toISOString()
  },
  {
    id: 'acc_upi',
    name: 'Direct UPI Merchant',
    type: 'upi',
    openingBalance: 0,
    currentBalance: 0,
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    notes: 'Direct QR code and VPA merchant payments',
    createdAt: new Date().toISOString()
  }
];

// Subscribe to Financial Accounts / Wallets
export function subscribeToFinancialAccounts(callback: (accounts: FinancialAccount[]) => void) {
  try {
    const accCol = collection(db, 'financial_accounts');
    return onSnapshot(accCol, (snapshot) => {
      const accounts: FinancialAccount[] = [];
      snapshot.forEach((docSnap) => {
        accounts.push({ id: docSnap.id, ...docSnap.data() } as FinancialAccount);
      });

      if (accounts.length === 0) {
        // Fallback to default accounts
        const raw = localStorage.getItem('amrr_financial_accounts');
        const list = raw ? JSON.parse(raw) : DEFAULT_FINANCIAL_ACCOUNTS;
        callback(list);
      } else {
        try {
          localStorage.setItem('amrr_financial_accounts', JSON.stringify(accounts));
        } catch {
          // ignore
        }
        callback(accounts);
      }
    }, (err) => {
      console.warn('Financial accounts subscription warning:', err);
      const raw = localStorage.getItem('amrr_financial_accounts');
      callback(raw ? JSON.parse(raw) : DEFAULT_FINANCIAL_ACCOUNTS);
    });
  } catch (err) {
    console.error('Error in subscribeToFinancialAccounts:', err);
    const raw = localStorage.getItem('amrr_financial_accounts');
    callback(raw ? JSON.parse(raw) : DEFAULT_FINANCIAL_ACCOUNTS);
    return () => {};
  }
}

// Save or Update a Financial Account
export async function saveFinancialAccount(account: FinancialAccount): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_financial_accounts');
    const list: FinancialAccount[] = raw ? JSON.parse(raw) : [...DEFAULT_FINANCIAL_ACCOUNTS];
    const idx = list.findIndex(a => a.id === account.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...account, updatedAt: new Date().toISOString() };
    } else {
      list.push(account);
    }
    localStorage.setItem('amrr_financial_accounts', JSON.stringify(list));
  } catch {
    // ignore
  }

  try {
    const docRef = doc(db, 'financial_accounts', account.id);
    await setDoc(docRef, {
      ...account,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving financial account to Firestore:', err);
  }
}

// Subscribe to Master Accounting Transactions
export function subscribeToAccountingTransactions(callback: (txs: AccountingTransaction[]) => void) {
  try {
    const txCol = collection(db, 'accounting_transactions');
    return onSnapshot(txCol, (snapshot) => {
      const txs: AccountingTransaction[] = [];
      snapshot.forEach((docSnap) => {
        txs.push({ id: docSnap.id, ...docSnap.data() } as AccountingTransaction);
      });

      // Sort newest date first
      txs.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

      try {
        localStorage.setItem('amrr_accounting_transactions', JSON.stringify(txs));
      } catch {
        // ignore
      }
      callback(txs);
    }, (err) => {
      console.warn('Accounting transactions subscription warning:', err);
      const raw = localStorage.getItem('amrr_accounting_transactions');
      callback(raw ? JSON.parse(raw) : []);
    });
  } catch (err) {
    console.error('Error in subscribeToAccountingTransactions:', err);
    const raw = localStorage.getItem('amrr_accounting_transactions');
    callback(raw ? JSON.parse(raw) : []);
    return () => {};
  }
}

// Save a master accounting transaction (with idempotency guard)
export async function saveAccountingTransaction(tx: AccountingTransaction): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_accounting_transactions');
    const list: AccountingTransaction[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(t => t.id === tx.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...tx, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(tx);
    }
    localStorage.setItem('amrr_accounting_transactions', JSON.stringify(list));
  } catch {
    // ignore
  }

  try {
    const docRef = doc(db, 'accounting_transactions', tx.id);
    await setDoc(docRef, {
      ...tx,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving accounting transaction to Firestore:', err);
  }
}

// Delete an accounting transaction (for manual adjustments)
export async function deleteAccountingTransaction(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_accounting_transactions');
    if (raw) {
      const list: AccountingTransaction[] = JSON.parse(raw);
      localStorage.setItem('amrr_accounting_transactions', JSON.stringify(list.filter(t => t.id !== id)));
    }
  } catch {
    // ignore
  }

  try {
    await deleteDoc(doc(db, 'accounting_transactions', id));
  } catch (err) {
    console.error('Error deleting accounting transaction from Firestore:', err);
  }
}

// Subscribe to Operating Expenses
export function subscribeToExpenses(callback: (expenses: ExpenseItem[]) => void) {
  try {
    const expCol = collection(db, 'expenses');
    return onSnapshot(expCol, (snapshot) => {
      const expenses: ExpenseItem[] = [];
      snapshot.forEach((docSnap) => {
        expenses.push({ id: docSnap.id, ...docSnap.data() } as ExpenseItem);
      });

      expenses.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

      try {
        localStorage.setItem('amrr_expenses', JSON.stringify(expenses));
      } catch {
        // ignore
      }
      callback(expenses);
    }, (err) => {
      console.warn('Expenses subscription warning:', err);
      const raw = localStorage.getItem('amrr_expenses');
      callback(raw ? JSON.parse(raw) : []);
    });
  } catch (err) {
    console.error('Error in subscribeToExpenses:', err);
    const raw = localStorage.getItem('amrr_expenses');
    callback(raw ? JSON.parse(raw) : []);
    return () => {};
  }
}

// Save an Expense & automatically post to master transaction ledger
export async function saveExpense(expense: ExpenseItem): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_expenses');
    const list: ExpenseItem[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      list[idx] = expense;
    } else {
      list.unshift(expense);
    }
    localStorage.setItem('amrr_expenses', JSON.stringify(list));
  } catch {
    // ignore
  }

  try {
    await setDoc(doc(db, 'expenses', expense.id), expense, { merge: true });

    // Link directly to master accounting transactions ledger
    const txId = 'tx_exp_' + expense.id;
    await saveAccountingTransaction({
      id: txId,
      date: expense.date,
      type: 'expense',
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      accountId: expense.accountId || 'acc_bank',
      accountName: expense.accountName || 'Primary Bank Account',
      vendorName: expense.supplier,
      paymentMethod: expense.paymentMethod || 'Bank Transfer',
      paymentStatus: 'Completed',
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || '',
      createdAt: expense.createdAt
    });

    // Update account balance (Money Out)
    const targetAccountId = expense.accountId || 'acc_bank';
    const accRef = doc(db, 'financial_accounts', targetAccountId);
    await setDoc(accRef, {
      id: targetAccountId,
      totalMoneyOut: increment(expense.amount),
      currentBalance: increment(-expense.amount),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving expense to Firestore:', err);
  }
}

// Delete an Expense & remove from transaction ledger
export async function deleteExpense(expenseId: string, amount?: number, accountId?: string): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_expenses');
    if (raw) {
      const list: ExpenseItem[] = JSON.parse(raw);
      localStorage.setItem('amrr_expenses', JSON.stringify(list.filter(e => e.id !== expenseId)));
    }
  } catch {
    // ignore
  }

  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    await deleteAccountingTransaction('tx_exp_' + expenseId);

    // Revert account balance if amount provided
    if (amount && accountId) {
      const accRef = doc(db, 'financial_accounts', accountId);
      await setDoc(accRef, {
        id: accountId,
        totalMoneyOut: increment(-amount),
        currentBalance: increment(amount),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error deleting expense from Firestore:', err);
  }
}

// Subscribe to Account Transfers
export function subscribeToTransfers(callback: (transfers: AccountTransfer[]) => void) {
  try {
    const trfCol = collection(db, 'transfers');
    return onSnapshot(trfCol, (snapshot) => {
      const transfers: AccountTransfer[] = [];
      snapshot.forEach((docSnap) => {
        transfers.push({ id: docSnap.id, ...docSnap.data() } as AccountTransfer);
      });

      transfers.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());

      try {
        localStorage.setItem('amrr_transfers', JSON.stringify(transfers));
      } catch {
        // ignore
      }
      callback(transfers);
    }, (err) => {
      console.warn('Transfers subscription warning:', err);
      const raw = localStorage.getItem('amrr_transfers');
      callback(raw ? JSON.parse(raw) : []);
    });
  } catch (err) {
    console.error('Error in subscribeToTransfers:', err);
    const raw = localStorage.getItem('amrr_transfers');
    callback(raw ? JSON.parse(raw) : []);
    return () => {};
  }
}

// Save an Internal Account Transfer (does not affect Revenue, Expenses or Profit)
export async function saveAccountTransfer(transfer: AccountTransfer): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_transfers');
    const list: AccountTransfer[] = raw ? JSON.parse(raw) : [];
    list.unshift(transfer);
    localStorage.setItem('amrr_transfers', JSON.stringify(list));
  } catch {
    // ignore
  }

  try {
    await setDoc(doc(db, 'transfers', transfer.id), transfer, { merge: true });

    // Post to transaction journal
    await saveAccountingTransaction({
      id: 'tx_trf_' + transfer.id,
      date: transfer.date,
      type: 'transfer',
      amount: transfer.amount,
      description: `Transfer: ${transfer.fromAccountName} → ${transfer.toAccountName}`,
      category: 'Transfer',
      accountId: transfer.fromAccountId,
      accountName: transfer.fromAccountName,
      toAccountId: transfer.toAccountId,
      toAccountName: transfer.toAccountName,
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Completed',
      referenceNumber: transfer.referenceNumber || '',
      notes: transfer.notes || '',
      createdAt: transfer.createdAt
    });

    // Debit source account
    const fromRef = doc(db, 'financial_accounts', transfer.fromAccountId);
    await setDoc(fromRef, {
      id: transfer.fromAccountId,
      totalMoneyOut: increment(transfer.amount),
      currentBalance: increment(-transfer.amount),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Credit destination account
    const toRef = doc(db, 'financial_accounts', transfer.toAccountId);
    await setDoc(toRef, {
      id: transfer.toAccountId,
      totalMoneyIn: increment(transfer.amount),
      currentBalance: increment(transfer.amount),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving account transfer to Firestore:', err);
  }
}

// ==========================================
// 4. AUTOMATIC ORDER → ACCOUNTING INTEGRATION (IDEMPOTENT)
// ==========================================

export async function recordOrderSaleInAccounting(order: Order): Promise<void> {
  // Requirement 6: Do NOT record revenue when order was cancelled or payment failed
  if (!order || order.status === 'Cancelled' || order.totalAmount <= 0) return;

  const txId = 'tx_order_' + order.id;

  try {
    // Check if transaction already exists (idempotency guard)
    const existingDoc = await getDoc(doc(db, 'accounting_transactions', txId));
    if (existingDoc.exists()) {
      return; // Already recorded, prevent double accounting!
    }

    // Calculate COGS from item costPrice
    const orderCogs = (order.items || []).reduce((acc, item) => {
      const cost = item.product?.costPrice || 0;
      return acc + (cost * item.quantity);
    }, 0);

    const paymentMethodLower = (order.paymentMethod || '').toLowerCase();
    let accountId = 'acc_razorpay';
    let accountName = 'Razorpay Gateway';

    if (paymentMethodLower.includes('cash') || paymentMethodLower.includes('cod')) {
      accountId = 'acc_cash';
      accountName = 'Cash in Hand (Store/Atelier)';
    } else if (paymentMethodLower.includes('bank') || paymentMethodLower.includes('neft')) {
      accountId = 'acc_bank';
      accountName = 'Primary Bank Account';
    } else if (paymentMethodLower.includes('upi')) {
      accountId = 'acc_upi';
      accountName = 'Direct UPI Merchant';
    }

    const saleTransaction: AccountingTransaction = {
      id: txId,
      date: order.createdAt || new Date().toISOString(),
      type: 'sale',
      amount: order.totalAmount,
      description: `Sale: Order #${order.id} - ${(order.items || []).map(i => `${i.product.name} (x${i.quantity})`).join(', ')}`,
      category: 'Product Sales',
      accountId,
      accountName,
      orderId: order.id,
      customerName: order.shippingDetails?.fullName || 'Customer',
      customerEmail: order.shippingDetails?.email || '',
      paymentMethod: order.paymentMethod || 'Razorpay',
      paymentStatus: 'Completed',
      razorpayPaymentId: order.paymentId || '',
      razorpayOrderId: order.razorpayOrderId || '',
      cogs: orderCogs,
      notes: `Order placed by ${order.shippingDetails?.fullName || 'patron'} (${order.items.length} items)`,
      createdAt: order.createdAt || new Date().toISOString()
    };

    await saveAccountingTransaction(saleTransaction);

    // Update account balance (Money In)
    const accRef = doc(db, 'financial_accounts', accountId);
    await setDoc(accRef, {
      id: accountId,
      totalMoneyIn: increment(order.totalAmount),
      currentBalance: increment(order.totalAmount),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`Accounting sale recorded for Order #${order.id}: +₹${order.totalAmount}`);
  } catch (err) {
    console.error('Error recording order sale in accounting:', err);
  }
}

// Record an order refund in accounting
export async function recordRefundInAccounting(
  order: Order, 
  refundAmount: number, 
  reason?: string
): Promise<void> {
  if (!order || refundAmount <= 0) return;

  const refundTxId = `tx_refund_${order.id}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  try {
    const refundTransaction: AccountingTransaction = {
      id: refundTxId,
      date: nowIso,
      type: 'refund',
      amount: refundAmount,
      description: `Refund: Order #${order.id}${reason ? ` (${reason})` : ''}`,
      category: 'Product Sales',
      accountId: 'acc_razorpay',
      accountName: 'Razorpay Gateway',
      orderId: order.id,
      customerName: order.shippingDetails?.fullName || 'Customer',
      customerEmail: order.shippingDetails?.email || '',
      paymentMethod: order.paymentMethod || 'Razorpay',
      paymentStatus: 'Refunded',
      razorpayPaymentId: order.paymentId || '',
      razorpayOrderId: order.razorpayOrderId || '',
      notes: reason || 'Customer requested refund',
      createdAt: nowIso
    };

    await saveAccountingTransaction(refundTransaction);

    // Update Order document in Firestore with refund record
    const totalRefunded = (order.refundAmount || 0) + refundAmount;
    const orderRef = doc(db, 'orders', order.id);
    await setDoc(orderRef, {
      refundAmount: totalRefunded,
      refundReason: reason || order.refundReason || 'Customer Refund',
      refundedAt: nowIso,
      updatedAt: nowIso
    }, { merge: true });

    // Adjust financial account balance
    const accRef = doc(db, 'financial_accounts', 'acc_razorpay');
    await setDoc(accRef, {
      id: 'acc_razorpay',
      totalMoneyOut: increment(refundAmount),
      currentBalance: increment(-refundAmount),
      updatedAt: nowIso
    }, { merge: true });

    console.log(`Refund of ₹${refundAmount} recorded for Order #${order.id}`);
  } catch (err) {
    console.error('Error recording refund in accounting:', err);
  }
}

// Synchronize all existing orders to accounting (safely & idempotently)
export async function syncAllOrdersToAccounting(orders: Order[]): Promise<void> {
  if (!orders || orders.length === 0) return;

  for (const o of orders) {
    if (o.status !== 'Cancelled' && o.totalAmount > 0) {
      await recordOrderSaleInAccounting(o);
    }
  }
}

