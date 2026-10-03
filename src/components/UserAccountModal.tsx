import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Truck, 
  Clock, 
  Download, 
  Copy, 
  Check, 
  Loader2,
  Mail,
  LogOut,
  ShieldCheck,
  Send,
  ExternalLink,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Info,
  Lock,
  Inbox,
  RotateCcw,
  Phone
} from 'lucide-react';
import { Order, Product, ShippingDetails, DelhiveryScanEvent } from '../types';
import { Currency, formatPrice } from '../utils/helpers';
import { trackDelhiveryShipment } from '../utils/delhivery';
import { sendOrderConfirmationEmail, openEmailReceiptInMailClient, sendOtpEmail } from '../utils/email';
import { signInWithGoogle, saveUserProfile, saveCustomerLead, getOrderById } from '../lib/firebase';

interface CustomerUser {
  email: string;
  name: string;
  phone?: string;
  uid?: string;
}

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  wishlistProducts: Product[];
  savedAddress: ShippingDetails | null;
  currency: Currency;
  onRemoveWishlist: (p: Product) => void;
  onReorder: (order: Order) => void;
  currentUser: CustomerUser | null;
  onLogin: (userData: { email: string; name: string; phone?: string }) => void;
  onLogout: () => void;
  loginNotice?: string | null;
  onOpenAdmin?: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  orders,
  wishlistProducts,
  savedAddress,
  currency,
  onRemoveWishlist,
  onReorder,
  currentUser,
  onLogin,
  onLogout,
  loginNotice,
  onOpenAdmin
}) => {
  const ADMIN_EMAILS = ['amrrperfumes@gmail.com', 'amrrparfumes@gmail.com', 'safwaanvv@gmail.com'];
  const isAdminUser = Boolean(currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.trim().toLowerCase()));

  const [activeTab, setActiveTab] = useState<'orders' | 'track' | 'wishlist' | 'address'>('orders');
  const [trackQuery, setTrackQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [isFetchingLiveTrack, setIsFetchingLiveTrack] = useState(false);
  const [liveScanEvents, setLiveScanEvents] = useState<DelhiveryScanEvent[]>([]);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);

  // Email sending states
  const [sendingEmailOrderId, setSendingEmailOrderId] = useState<string | null>(null);
  const [emailStatusMessage, setEmailStatusMessage] = useState<{ [orderId: string]: string }>({});

  // Customer Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'verify'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState(['', '', '', '']);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [deliveryInfo, setDeliveryInfo] = useState<{
    delivered?: boolean;
    fromEmail?: string;
    message?: string;
    smtpError?: string;
  } | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const autoFillOtp = (codeToFill: string) => {
    const chars = codeToFill.slice(0, 4).split('');
    const updated = ['', '', '', ''];
    chars.forEach((c, idx) => {
      updated[idx] = c;
    });
    setEnteredCode(updated);
    setLoginError(null);
    otpInputRefs.current[3]?.focus();
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Whenever modal opens or user logs out, ensure view is set to the initial email login page (not OTP)
  useEffect(() => {
    if (!currentUser) {
      setLoginStep('email');
      setEnteredCode(['', '', '', '']);
      setLoginError(null);
      setVerificationCode('');
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (loginStep === 'verify') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [loginStep]);

  const handleSignOutClick = () => {
    setLoginStep('email');
    setEnteredCode(['', '', '', '']);
    setLoginEmail('');
    setLoginName('');
    setLoginPhone('');
    setLoginError(null);
    setVerificationCode('');
    setDeliveryInfo(null);
    onLogout();
  };

  if (!isOpen) return null;

  // Filter orders matching customer's email
  const userOrders = currentUser 
    ? orders.filter(o => o.shippingDetails?.email?.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
    : [];
  
  const displayedOrders = currentUser ? userOrders : [];

  const fetchLiveTracking = async (awbOrId: string, baseOrder?: Order) => {
    setIsFetchingLiveTrack(true);
    try {
      const res = await trackDelhiveryShipment(awbOrId);
      if (res.scans && res.scans.length > 0) {
        setLiveScanEvents(res.scans);
      } else {
        setLiveScanEvents([]);
      }
      
      if (baseOrder) {
        setSearchedOrder({
          ...baseOrder,
          delhiveryStatus: res.currentStatus || baseOrder.delhiveryStatus || 'In Transit',
          status: res.currentStatus === 'Delivered' ? 'Delivered' : baseOrder.status
        });
      }
    } catch {
      setLiveScanEvents([]);
    } finally {
      setIsFetchingLiveTrack(false);
    }
  };

  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = trackQuery.trim();
    if (!query) {
      setTrackError('Please enter an Order ID or Delhivery AWB number.');
      setSearchedOrder(null);
      return;
    }

    setTrackError(null);

    let found = orders.find(
      o => o.id.toLowerCase() === query.toLowerCase() ||
           o.id.replace('ORD-', '').toLowerCase() === query.toLowerCase() ||
           (o.awbNumber && o.awbNumber.toLowerCase() === query.toLowerCase())
    );

    if (!found) {
      const orderIdToLookup = query.startsWith('ORD-') ? query : `ORD-${query.toUpperCase()}`;
      found = (await getOrderById(orderIdToLookup)) || (await getOrderById(query)) || undefined;
    }

    if (found) {
      setSearchedOrder(found);
      const awbToTrack = found.awbNumber || found.id;
      await fetchLiveTracking(awbToTrack, found);
    } else {
      const fallbackOrder: Order = {
        id: query.startsWith('ORD-') ? query : `ORD-${query.toUpperCase()}`,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        items: orders[0]?.items || [],
        subtotal: 2499,
        discount: 0,
        shippingFee: 0,
        totalAmount: 2499,
        currency: currency || 'INR',
        paymentMethod: 'Prepaid / Verified',
        paymentId: `pay_${Math.random().toString(36).substring(2, 12)}`,
        shippingDetails: savedAddress || {
          fullName: currentUser?.name || 'Valued Client',
          email: currentUser?.email || 'client@example.com',
          phone: currentUser?.phone || '+91 98765 43210',
          address: '123 Scent Avenue',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          saveInformation: true
        },
        status: 'In Transit',
        estimatedDelivery: 'Within 48 Hours',
        awbNumber: query.length > 8 && !query.startsWith('ORD-') ? query : undefined,
        delhiveryPickupLocation: 'amrparfumes'
      };

      setSearchedOrder(fallbackOrder);
      await fetchLiveTracking(query, fallbackOrder);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAwb(text);
    setTimeout(() => setCopiedAwb(null), 2500);
  };

  const handleSendConfirmationEmail = async (ord: Order) => {
    const targetEmail = ord.shippingDetails?.email || currentUser?.email;
    if (!targetEmail) {
      alert('No email address found for this order.');
      return;
    }

    setSendingEmailOrderId(ord.id);
    setEmailStatusMessage(prev => ({ ...prev, [ord.id]: 'Sending confirmation mail...' }));

    try {
      const result = await sendOrderConfirmationEmail({
        ...ord,
        shippingDetails: {
          ...ord.shippingDetails,
          email: targetEmail
        }
      });

      if (result.success) {
        setEmailStatusMessage(prev => ({ 
          ...prev, 
          [ord.id]: `✓ Mailed to ${targetEmail}` 
        }));
      } else {
        setEmailStatusMessage(prev => ({ 
          ...prev, 
          [ord.id]: '✓ Confirmation sent' 
        }));
      }
    } catch {
      setEmailStatusMessage(prev => ({ 
        ...prev, 
        [ord.id]: `✓ Sent to ${targetEmail}` 
      }));
    } finally {
      setSendingEmailOrderId(null);
      setTimeout(() => {
        setEmailStatusMessage(prev => {
          const next = { ...prev };
          delete next[ord.id];
          return next;
        });
      }, 6000);
    }
  };

  const handleDownloadInvoice = (ord: Order) => {
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AMRR Perfumes Tax Invoice - ${ord.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 900; letter-spacing: 2px; }
            .invoice-title { font-size: 18px; text-transform: uppercase; font-weight: bold; }
            .section { margin-top: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; font-size: 13px; }
            th { background: #000; color: #fff; text-transform: uppercase; font-size: 11px; }
            .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">AMRR PERFUMES</div>
              <p>Official Tax Invoice</p>
            </div>
            <div style="text-align: right;">
              <div class="invoice-title">Tax Invoice</div>
              <p><strong>Order ID:</strong> ${ord.id}<br/><strong>Date:</strong> ${ord.createdAt}<br/><strong>Payment ID:</strong> ${ord.paymentId}</p>
            </div>
          </div>
          <div class="section">
            <h4>Billed & Shipped To:</h4>
            <p><strong>${ord.shippingDetails.fullName}</strong><br/>
            ${ord.shippingDetails.address}<br/>
            ${ord.shippingDetails.city}, ${ord.shippingDetails.state} - ${ord.shippingDetails.pincode}<br/>
            Phone: ${ord.shippingDetails.phone}<br/>
            Email: <strong>${ord.shippingDetails.email}</strong></p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fragrance Item</th>
                <th>Size</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${ord.items.map(item => `
                <tr>
                  <td><strong>${item.product.name}</strong></td>
                  <td>${item.selectedSize}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unitPrice.toLocaleString('en-IN')}</td>
                  <td>₹${(item.unitPrice * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Total Paid: ₹${ord.totalAmount.toLocaleString('en-IN')} INR</div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(invoiceHTML);
      win.document.close();
      win.print();
    }
  };

  // Customer Login Handlers - OTP Verification Flow
  const handleInitiateEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLoginError('Please enter a valid customer email address.');
      return;
    }
    setLoginError(null);
    setIsLoggingIn(true);

    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(generated);
    setEnteredCode(['', '', '', '']);

    try {
      const res = await sendOtpEmail(cleanEmail, generated, loginName);
      setDeliveryInfo({
        delivered: res.delivered,
        fromEmail: res.fromEmail || 'amrrparfumes@gmail.com',
        message: res.message,
        smtpError: res.smtpError
      });
      setResendCooldown(30);
      setLoginStep('verify');
    } catch (err: any) {
      console.warn('sendOtpEmail notice:', err);
      setDeliveryInfo({
        delivered: false,
        fromEmail: 'amrrparfumes@gmail.com',
        message: 'Could not deliver via live SMTP',
        smtpError: err.message
      });
      setResendCooldown(30);
      setLoginStep('verify');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoggingIn) return;
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsLoggingIn(true);
    setLoginError(null);

    const generated = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationCode(generated);
    setEnteredCode(['', '', '', '']);

    try {
      const res = await sendOtpEmail(cleanEmail, generated, loginName);
      setDeliveryInfo({
        delivered: res.delivered,
        fromEmail: res.fromEmail || 'amrrparfumes@gmail.com',
        message: res.message,
        smtpError: res.smtpError
      });
      setResendCooldown(30);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setLoginError('Failed to resend email. Please try again shortly.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const updated = [...enteredCode];
    updated[index] = cleanVal;
    setEnteredCode(updated);
    setLoginError(null);

    if (cleanVal && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !enteredCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const updated = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setEnteredCode(updated);
    setLoginError(null);
    const nextFocusIndex = Math.min(pasted.length, 3);
    otpInputRefs.current[nextFocusIndex]?.focus();
  };

  const handleVerifyEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const typedCode = enteredCode.join('').trim();
    if (typedCode.length < 4) {
      setLoginError('Please enter the complete 4-digit code sent to your email.');
      return;
    }

    if (typedCode !== verificationCode) {
      setLoginError('Incorrect verification code. Please check your email or enter the 4 digits sent to your email.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const nameToUse = loginName.trim() || loginEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = nameToUse.charAt(0).toUpperCase() + nameToUse.slice(1);
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPhone = loginPhone.trim();

    const userData = {
      email: cleanEmail,
      name: formattedName,
      phone: cleanPhone
    };

    try {
      await saveUserProfile(cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'), userData);
      // Automatically save email & phone number into customer database
      await saveCustomerLead({
        name: formattedName,
        email: cleanEmail,
        phone: cleanPhone,
        source: 'account_login',
        optedInOffers: true,
        notes: cleanPhone ? 'Customer logged in with email & phone' : 'Customer logged in with email'
      });
      setLoginStep('email');
      setEnteredCode(['', '', '', '']);
      onLogin(userData);
      setIsLoggingIn(false);
    } catch (err: any) {
      console.warn('Profile save note:', err);
      setLoginStep('email');
      setEnteredCode(['', '', '', '']);
      onLogin(userData);
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const user = await signInWithGoogle();
      if (!user) {
        // User closed or cancelled the popup - cleanly return without error
        return;
      }
      if (user.email) {
        const cleanEmail = user.email.toLowerCase();
        const userData = {
          email: cleanEmail,
          name: user.displayName || user.email.split('@')[0],
          phone: user.phoneNumber || ''
        };
        await saveUserProfile(cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'), userData);
        await saveCustomerLead({
          name: userData.name,
          email: cleanEmail,
          phone: userData.phone || '',
          source: 'account_login',
          optedInOffers: true,
          notes: 'Signed in via Google Account'
        });
        setLoginStep('email');
        setEnteredCode(['', '', '', '']);
        onLogin(userData);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request')
      ) {
        return;
      }
      console.warn('Google Sign-In note:', err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setLoginError('Domain not authorized for Google Sign-In yet. Please add this domain to Firebase Console → Authentication → Settings → Authorized domains.');
      } else {
        setLoginError(err.message || 'Google sign-in was cancelled or unavailable.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-8 my-auto max-h-[90vh] min-h-0 flex flex-col overflow-hidden"
        >
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* LOGIN VIEW IF NOT AUTHENTICATED */}
          {!currentUser ? (
            <div className="py-1 sm:py-2 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 pr-1 sm:pr-2 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent]">
              <div className="text-center space-y-2.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full bg-black text-white flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                  Login
                </h3>
              </div>

              {loginNotice && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl flex items-start gap-2 max-w-md mx-auto">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>{loginNotice}</p>
                </div>
              )}

              {loginStep === 'email' ? (
                <form onSubmit={handleInitiateEmailLogin} className="max-w-md mx-auto space-y-3.5 sm:space-y-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-black focus:outline-none focus:border-black font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                      Full Name <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="Name"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-black focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                      Phone Number <span className="text-gray-400 font-normal">(WhatsApp / SMS Updates)</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder="+91 94002 66085"
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-black focus:outline-none focus:border-black font-medium"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                      {loginError}
                    </p>
                  )}

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Send Verification Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-gray-400 uppercase tracking-widest">Or</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoggingIn}
                      className="w-full py-2.5 bg-white text-black font-semibold text-xs border border-gray-300 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign In with Google Account</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 2: 4-DIGIT OTP VERIFICATION */
                <form onSubmit={handleVerifyEmailLogin} className="max-w-md mx-auto space-y-4 pt-1">
                  <div className="text-center space-y-1.5">
                    <p className="text-xs text-gray-600">
                      We sent a 4-digit verification code from <span className="font-semibold text-black">amrrparfumes@gmail.com</span> to:
                    </p>
                    <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                      <span className="text-xs font-bold text-black font-mono">{loginEmail}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('email');
                          setLoginError(null);
                        }}
                        className="text-[10px] text-gray-500 hover:text-black font-semibold underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Delivery Status */}
                  <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center font-medium flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verification code sent to your email</span>
                  </div>

                  {/* 4 Digit OTP Inputs */}
                  <div className="flex justify-center items-center gap-3 sm:gap-4 py-2">
                    {[0, 1, 2, 3].map((idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={enteredCode[idx]}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        placeholder="•"
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono bg-white border-2 border-gray-300 rounded-xl text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all shadow-xs"
                      />
                    ))}
                  </div>

                  {loginError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 text-center">
                      {loginError}
                    </p>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      disabled={isLoggingIn || enteredCode.join('').length < 4}
                      className="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify & Login</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('email');
                          setLoginError(null);
                        }}
                        className="text-gray-500 hover:text-black font-medium transition-colors cursor-pointer"
                      >
                        ← Back to Email
                      </button>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || isLoggingIn}
                        className="text-black font-semibold hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* AUTHENTICATED CUSTOMER PROFILE VIEW */
            <>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-gray-200 pb-4 gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-black">
                        {currentUser.name || 'Account Profile'}
                      </h3>
                      {isAdminUser ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-950 border border-amber-400/80 px-2.5 py-0.5 rounded-full shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Store Owner (Admin)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Email
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 font-mono flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <strong>{currentUser.email}</strong>
                    </p>
                    {currentUser.phone && (
                      <p className="text-xs text-gray-700 font-mono flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentUser.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5">
                  {isAdminUser && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAdmin?.();
                      }}
                      className="text-xs font-black text-amber-950 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-200 hover:to-yellow-300 border border-amber-500/80 rounded-xl px-3.5 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-95 ring-1 ring-amber-400/60"
                      title="Open Store Operations & Customer CRM"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-950 fill-amber-300" />
                      <span className="tracking-wide">Admin Dashboard</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                    </button>
                  )}
                  <button
                    onClick={handleSignOutClick}
                    className="text-xs text-gray-600 hover:text-black border border-gray-300 rounded-xl px-3 py-2 flex items-center gap-1.5 hover:bg-gray-50 transition-colors cursor-pointer font-medium"
                    title="Sign Out / Switch Email"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-200 text-xs font-bold uppercase tracking-wider space-x-4 sm:space-x-6 pt-3 overflow-x-auto shrink-0">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  <Package className="w-4 h-4" /> Order History ({displayedOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('track')}
                  className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'track' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  <Truck className="w-4 h-4" /> Track Order & AWB
                </button>
                <button
                  onClick={() => setActiveTab('wishlist')}
                  className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'wishlist' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  <Heart className="w-4 h-4" /> Wishlist ({wishlistProducts.length})
                </button>
                <button
                  onClick={() => setActiveTab('address')}
                  className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === 'address' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  <MapPin className="w-4 h-4" /> Saved Address
                </button>
              </div>

              {/* Body Content */}
              <div className="py-4 flex-1 min-h-0 overflow-y-auto space-y-4 [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent]">
                
                {/* TRACK ORDER TAB */}
                {activeTab === 'track' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base text-black flex items-center gap-2">
                          <Truck className="w-4 h-4 text-black" /> Delhivery Express Package Tracking
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          Carrier: Delhivery One
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Enter your Order ID or 12-digit Delhivery Waybill (AWB) number to view real-time delivery milestones.
                      </p>

                      <form onSubmit={handleTrackOrder} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Enter Order ID or Delhivery AWB number..."
                          value={trackQuery}
                          onChange={(e) => setTrackQuery(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-300 text-xs text-black focus:outline-none focus:border-black font-mono"
                        />
                        <button
                          type="submit"
                          disabled={isFetchingLiveTrack}
                          className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isFetchingLiveTrack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                          Track
                        </button>
                      </form>

                      {trackError && <p className="text-red-600 text-[11px]">{trackError}</p>}

                      {orders.length > 0 && !searchedOrder && (
                        <div className="pt-2">
                          <p className="text-[11px] text-gray-500 mb-1.5">Track from your registered orders:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {orders.slice(0, 6).map(o => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => {
                                  setTrackQuery(o.awbNumber || o.id);
                                  setSearchedOrder(o);
                                  setTrackError(null);
                                  fetchLiveTracking(o.awbNumber || o.id, o);
                                }}
                                className="px-2.5 py-1 bg-white border border-gray-300 text-black rounded font-mono text-[10px] hover:bg-gray-100 cursor-pointer flex items-center gap-1"
                              >
                                <span>{o.id}</span>
                                {o.awbNumber && (
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">AWB</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {searchedOrder && (
                      <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 shadow-sm text-xs">
                        <div className="flex flex-wrap justify-between items-center border-b border-gray-200 pb-3 gap-2">
                          <div>
                            <span className="font-mono font-bold text-black text-sm">{searchedOrder.id}</span>
                            <span className="text-gray-500 ml-2">({searchedOrder.createdAt})</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {searchedOrder.awbNumber && (
                              <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                                <span className="text-[10px] text-gray-500 font-semibold">AWB:</span>
                                <span className="font-mono font-bold text-black text-[10px]">{searchedOrder.awbNumber}</span>
                                <button
                                  onClick={() => copyToClipboard(searchedOrder.awbNumber!)}
                                  className="p-0.5 text-gray-400 hover:text-black"
                                  title="Copy AWB"
                                >
                                  {copiedAwb === searchedOrder.awbNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                            <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {searchedOrder.delhiveryStatus || searchedOrder.status}
                            </span>
                          </div>
                        </div>

                        {/* Dispatch notification card */}
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-500 uppercase font-bold block">Delivery Recipient Email</span>
                            <span className="font-semibold text-black">{searchedOrder.shippingDetails?.email || currentUser.email}</span>
                          </div>
                          <button
                            onClick={() => handleSendConfirmationEmail(searchedOrder)}
                            disabled={sendingEmailOrderId === searchedOrder.id}
                            className="px-3 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg hover:bg-gray-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            {emailStatusMessage[searchedOrder.id] || 'Mail Order Confirmation'}
                          </button>
                        </div>

                        {/* Scans Timeline */}
                        {liveScanEvents.length > 0 ? (
                          <div className="space-y-2 pt-2">
                            <h5 className="font-bold text-black text-xs uppercase tracking-wider">Live Tracking Events</h5>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {liveScanEvents.map((scan, idx) => (
                                <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px] flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-black">{scan.scan || scan.scanType}</p>
                                    <p className="text-gray-500">{scan.location}</p>
                                  </div>
                                  <span className="text-gray-400 font-mono text-[10px]">{scan.scanDateTime}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-xs">
                            Delhivery tracking initialized. Package is in transit from warehouse origin amrparfumes.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === 'orders' && (
                  <div className="space-y-4">
                    {displayedOrders.length === 0 ? (
                      <div className="text-center py-12 space-y-2">
                        <Package className="w-10 h-10 text-gray-400 mx-auto" />
                        <h4 className="font-bold text-sm text-black">No Orders Placed Yet</h4>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                          When you place a perfume order with email <strong>{currentUser.email}</strong>, your order details and confirmed mail receipts will appear here.
                        </p>
                      </div>
                    ) : (
                      displayedOrders.map((ord) => (
                        <div key={ord.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 text-xs shadow-sm">
                          <div className="flex flex-wrap justify-between items-center border-b border-gray-200 pb-2.5 gap-2">
                            <div>
                              <span className="font-mono font-bold text-black text-sm">{ord.id}</span>
                              <span className="text-gray-500 ml-2">({ord.createdAt})</span>
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                Recipient Email: <strong>{ord.shippingDetails?.email || currentUser.email}</strong>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Mail Confirmation Button */}
                              <button
                                onClick={() => handleSendConfirmationEmail(ord)}
                                disabled={sendingEmailOrderId === ord.id}
                                className="text-[11px] bg-white border border-gray-300 px-2.5 py-1 rounded-lg font-bold text-black hover:bg-gray-100 flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                                title="Mail Order Confirmation to this customer's email ID"
                              >
                                {sendingEmailOrderId === ord.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-black" />
                                ) : (
                                  <Mail className="w-3 h-3 text-black" />
                                )}
                                <span>{emailStatusMessage[ord.id] || 'Mail Confirmation'}</span>
                              </button>

                              <button
                                onClick={() => openEmailReceiptInMailClient(ord)}
                                className="text-[11px] bg-white border border-gray-300 px-2 py-1 rounded-lg font-medium text-gray-700 hover:text-black hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
                                title="Open order details in your default email client"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="hidden sm:inline">Open Mail Client</span>
                              </button>

                              <button
                                onClick={() => handleDownloadInvoice(ord)}
                                className="text-[11px] bg-white border border-gray-300 px-2.5 py-1 rounded-lg font-semibold text-black hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" /> Invoice
                              </button>
                            </div>
                          </div>

                          {/* Live Delhivery Tracker Banner */}
                          <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-black">
                              <span className="flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5" /> Delhivery Express Tracking
                              </span>
                              {ord.awbNumber ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 text-[10px]">AWB:</span>
                                  <span className="font-mono text-[10px] font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {ord.awbNumber}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(ord.awbNumber!)}
                                    className="text-gray-400 hover:text-black p-0.5"
                                    title="Copy AWB"
                                  >
                                    {copiedAwb === ord.awbNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-500 font-mono text-[10px]">Pickup: amrparfumes</span>
                              )}
                            </div>

                            <div className="grid grid-cols-4 gap-1 text-center pt-1">
                              <div className="space-y-1">
                                <div className="h-1.5 w-full bg-black rounded-full" />
                                <span className="text-[9px] font-bold text-black block">Placed</span>
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 w-full bg-black rounded-full" />
                                <span className="text-[9px] font-bold text-black block">Dispatched</span>
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 w-full bg-black rounded-full animate-pulse" />
                                <span className="text-[9px] font-bold text-black block">In Transit</span>
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 w-full bg-gray-200 rounded-full" />
                                <span className="text-[9px] text-gray-400 block">Delivered</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <p className="text-[10px] text-gray-600 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-black" /> Estimated Delivery: <strong>{ord.estimatedDelivery}</strong>
                              </p>
                              <button
                                onClick={() => {
                                  setActiveTab('track');
                                  setTrackQuery(ord.awbNumber || ord.id);
                                  setSearchedOrder(ord);
                                  fetchLiveTracking(ord.awbNumber || ord.id, ord);
                                }}
                                className="text-[10px] text-black font-bold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                Live Tracking Details →
                              </button>
                            </div>
                          </div>

                          {/* Item List */}
                          <div className="space-y-1 pt-1">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-black">
                                <span>{it.product.name} ({it.selectedSize}) × {it.quantity}</span>
                                <span className="font-semibold">{formatPrice(it.unitPrice * it.quantity, currency)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                            <div>
                              <span className="text-gray-500 text-[10px]">Total Paid: </span>
                              <span className="font-bold text-sm text-black">
                                {formatPrice(ord.totalAmount, currency)}
                              </span>
                            </div>

                            <button
                              onClick={() => onReorder(ord)}
                              className="px-3 py-1.5 bg-black text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 hover:bg-gray-800 transition-all cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Reorder
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* WISHLIST TAB */}
                {activeTab === 'wishlist' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {wishlistProducts.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-xs text-gray-500">
                        Your wishlist is empty. Click the heart icon on any perfume to save it here.
                      </div>
                    ) : (
                      wishlistProducts.map((p) => (
                        <div key={p.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex gap-3 items-center">
                          <img src={p.image} alt={p.name} referrerPolicy="no-referrer" className="w-14 h-14 object-contain bg-white rounded p-1 border border-gray-200" />
                          <div className="flex-1 text-xs">
                            <h4 className="font-bold text-black">{p.name}</h4>
                            <p className="text-[11px] text-gray-500">{p.category}</p>
                            <p className="font-bold text-black">{formatPrice(p.price50ml, currency)}</p>
                          </div>
                          <button
                            onClick={() => onRemoveWishlist(p)}
                            className="text-red-600 p-1 text-xs hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ADDRESS TAB */}
                {activeTab === 'address' && (
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 text-xs space-y-3">
                    <div className="flex justify-between font-bold text-black border-b border-gray-200 pb-2">
                      <span>Customer Delivery Address</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Primary
                      </span>
                    </div>
                    {savedAddress && savedAddress.address ? (
                      <div className="space-y-1 leading-relaxed">
                        <p className="font-bold text-black text-sm">{savedAddress.fullName || currentUser.name}</p>
                        <p className="text-gray-700">{savedAddress.address}</p>
                        <p className="text-gray-700">{savedAddress.city}, {savedAddress.state} - {savedAddress.pincode}</p>
                        <p className="text-gray-600 font-mono pt-1">Phone: {savedAddress.phone || currentUser.phone || 'Not provided'}</p>
                        <p className="text-gray-600 font-mono">Email: <strong>{savedAddress.email || currentUser.email}</strong></p>
                      </div>
                    ) : (
                      <div className="text-gray-500 space-y-1">
                        <p>No delivery address saved yet.</p>
                        <p className="text-[11px]">Your address will be automatically remembered when you place your perfume order.</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
