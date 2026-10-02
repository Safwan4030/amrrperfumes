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
import { CustomerInboxMessage, CustomerLead, SiteVisitorStats, Order } from '../types';

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

// Delete customer lead
export async function deleteCustomerLeadFromFirestore(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem('amrr_customer_leads');
    if (raw) {
      const list: CustomerLead[] = JSON.parse(raw);
      const updated = list.filter(c => c.id !== id);
      localStorage.setItem('amrr_customer_leads', JSON.stringify(updated));
    }
  } catch {
    // ignore
  }

  try {
    const custRef = doc(db, 'customers', id);
    await deleteDoc(custRef);
  } catch (err) {
    console.error('Error deleting customer lead:', err);
  }
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
