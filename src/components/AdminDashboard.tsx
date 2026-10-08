import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldAlert, 
  Download, 
  Edit, 
  Truck, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  Search, 
  Clock, 
  Layers, 
  Check, 
  Activity,
  Send,
  Sparkles,
  Inbox,
  Mail,
  MessageSquare,
  Trash2,
  CheckCheck,
  Plus,
  Upload,
  Image as ImageIcon,
  Tag,
  Sliders,
  Filter,
  Eye,
  Users,
  Globe,
  Wallet
} from 'lucide-react';
import { 
  Product, 
  Order, 
  DelhiveryScanEvent, 
  CustomerInboxMessage, 
  CustomerLead, 
  SiteVisitorStats,
  FinancialAccount,
  AccountingTransaction,
  ExpenseItem,
  AccountTransfer
} from '../types';
import { Currency, formatPrice } from '../utils/helpers';
import { PRESET_IMAGES } from '../data/products';
import { 
  subscribeToMessages, 
  updateMessageStatusInFirestore, 
  deleteMessageFromFirestore,
  subscribeToSiteStats,
  subscribeToCustomerLeads,
  syncExistingOrdersToCustomerLeads,
  subscribeToFinancialAccounts,
  subscribeToAccountingTransactions,
  subscribeToExpenses,
  subscribeToTransfers,
  syncAllOrdersToAccounting
} from '../lib/firebase';
import { AdminCustomersTab } from './AdminCustomersTab';
import { AdminTrafficTab } from './AdminTrafficTab';
import { AdminAccountsTab } from './AdminAccountsTab';
import { 
  createDelhiveryShipment, 
  trackDelhiveryShipment, 
  checkPincodeServiceability, 
  calculateShippingCharges,
  getDelhiveryStatus 
} from '../utils/delhivery';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  currency: Currency;
  currentUserEmail?: string;
  initialTab?: 'orders' | 'inventory' | 'customers' | 'accounts' | 'traffic' | 'delhivery-test' | 'inbox';
  onOpenLogin?: () => void;
  onUpdateProduct: (updated: Product) => void;
  onAddProduct?: (newProduct: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onTogglePublish?: (productId: string, isPublished: boolean) => void;
  onUpdateOrder?: (updated: Order) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  products,
  orders,
  currency,
  currentUserEmail,
  initialTab,
  onOpenLogin,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onTogglePublish,
  onUpdateOrder
}) => {
  const ADMIN_EMAILS = ['amrrperfumes@gmail.com', 'amrrparfumes@gmail.com', 'safwaanvv@gmail.com'];
  const isVerifiedAdminEmail = Boolean(
    currentUserEmail && ADMIN_EMAILS.includes(currentUserEmail.trim().toLowerCase())
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Authenticate only when store owner is signed in with their verified admin email
  useEffect(() => {
    if (isVerifiedAdminEmail && isOpen) {
      setIsAuthenticated(true);
    } else if (!isVerifiedAdminEmail) {
      setIsAuthenticated(false);
    }
  }, [isVerifiedAdminEmail, isOpen]);

  // Tab State (Default or initialTab)
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'customers' | 'accounts' | 'traffic' | 'delhivery-test' | 'inbox'>(initialTab || 'orders');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Accounts & Accounting State
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [accountingTransactions, setAccountingTransactions] = useState<AccountingTransaction[]>([]);
  const [accountingExpenses, setAccountingExpenses] = useState<ExpenseItem[]>([]);
  const [accountingTransfers, setAccountingTransfers] = useState<AccountTransfer[]>([]);

  // Site Visitors Analytics & Customer CRM State
  const [siteStats, setSiteStats] = useState<SiteVisitorStats | null>(null);
  const [customerLeads, setCustomerLeads] = useState<CustomerLead[]>([]);

  // Customer Inbox State
  const [messages, setMessages] = useState<CustomerInboxMessage[]>([]);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'contact_support' | 'feedback'>('all');
  const [inboxSearch, setInboxSearch] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // Inventory Tab Search & Filter
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');

  // Product Add / Edit Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalMode, setProductModalMode] = useState<'add' | 'edit'>('add');
  const [editingOriginalId, setEditingOriginalId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product Form State
  const [formState, setFormState] = useState({
    name: '',
    subtitle: 'Extrait de Parfum (50 ml)',
    category: 'Extrait de Parfum',
    customCategory: '',
    family: 'Woody Oud',
    price50ml: 999,
    originalPrice50ml: 1299,
    costPrice: undefined as number | undefined,
    stockQuantity: 20,
    inStock: true,
    sku: '',
    tags: '',
    shortDescription: 'Exquisite artisanal formulation crafted with rare botanical essences.',
    story: 'Distilled with high-concentration French botanicals and warm aged woods, creating an unmistakable trail.',
    image: '',
    galleryUrls: '',
    topNotes: 'Calabrian Bergamot, Pink Pepper',
    heartNotes: 'Taif Rose, White Suede',
    baseNotes: 'Wild Agarwood, Bourbon Vanilla, Amber',
    longevity: 5,
    projection: 4,
    sillage: 'Enveloping' as 'Intense' | 'Enveloping' | 'Subtle' | 'Moderate',
    gender: 'Unisex' as 'Unisex' | 'Masculine' | 'Feminine',
    isBestSeller: false,
    isNewArrival: false,
    isLimitedEdition: false,
    isPublished: true,
    concentration: 'Extrait de Parfum',
    ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool.'
  });

  // Legacy Quick Inline Edit State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice50, setEditPrice50] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);

  // Delhivery Status & Simulation Config
  const [isTestMode, setIsTestMode] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);
  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [dispatchMessage, setDispatchMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // Live Tracking Modal State
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [trackingDetails, setTrackingDetails] = useState<{
    awbNumber?: string;
    currentStatus?: string;
    statusLocation?: string;
    expectedDelivery?: string;
    origin?: string;
    destination?: string;
    scans: DelhiveryScanEvent[];
    error?: string;
  } | null>(null);

  // Delhivery Integration Info
  const [delhiveryHealth, setDelhiveryHealth] = useState<{
    isConfigured: boolean;
    pickupLocation: string;
    environment: string;
    tokenPrefix?: string | null;
  } | null>(null);

  // Pincode Tester State
  const [testPincode, setTestPincode] = useState('110001');
  const [testingPincodeLoading, setTestingPincodeLoading] = useState(false);
  const [pincodeTestResult, setPincodeTestResult] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      getDelhiveryStatus().then(setDelhiveryHealth).catch(() => {});
      const unsubscribeMessages = subscribeToMessages((msgs) => {
        setMessages(msgs);
      });
      const unsubscribeStats = subscribeToSiteStats((stats) => {
        setSiteStats(stats);
      });
      const unsubscribeLeads = subscribeToCustomerLeads((leads) => {
        setCustomerLeads(leads);
      });
      const unsubscribeAccounts = subscribeToFinancialAccounts((accs) => {
        setFinancialAccounts(accs);
      });
      const unsubscribeTxns = subscribeToAccountingTransactions((txns) => {
        setAccountingTransactions(txns);
      });
      const unsubscribeExpenses = subscribeToExpenses((exps) => {
        setAccountingExpenses(exps);
      });
      const unsubscribeTransfers = subscribeToTransfers((trfs) => {
        setAccountingTransfers(trfs);
      });

      // Synchronize all completed orders into persistent Cloud CRM & Accounting
      if (orders && orders.length > 0) {
        syncExistingOrdersToCustomerLeads(orders).catch(() => {});
        syncAllOrdersToAccounting(orders).catch(() => {});
      }

      return () => {
        unsubscribeMessages();
        unsubscribeStats();
        unsubscribeLeads();
        unsubscribeAccounts();
        unsubscribeTxns();
        unsubscribeExpenses();
        unsubscribeTransfers();
      };
    }
  }, [isAuthenticated, orders]);

  if (!isOpen) return null;

  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setProductModalMode('add');
    setEditingOriginalId(null);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
    setFormState({
      name: '',
      subtitle: 'Extrait de Parfum (50 ml)',
      category: 'Extrait de Parfum',
      customCategory: '',
      family: 'Woody Oud',
      price50ml: 999,
      originalPrice50ml: 1299,
      costPrice: undefined,
      stockQuantity: 20,
      inStock: true,
      shortDescription: 'Exquisite artisanal formulation crafted with rare botanical essences.',
      story: 'Distilled with high-concentration French botanicals and warm aged woods, creating an unmistakable trail.',
      image: PRESET_IMAGES[0]?.url || '',
      topNotes: 'Calabrian Bergamot, Pink Pepper',
      heartNotes: 'Taif Rose, White Suede',
      baseNotes: 'Wild Agarwood, Bourbon Vanilla, Amber',
      longevity: 5,
      projection: 4,
      sillage: 'Enveloping',
      gender: 'Unisex',
      isBestSeller: false,
      isNewArrival: true,
      isLimitedEdition: false,
      isPublished: true,
      concentration: 'Extrait de Parfum',
      ingredients: 'Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool.'
    });
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal with existing perfume details
  const handleOpenEditProduct = (p: Product) => {
    setProductModalMode('edit');
    setEditingOriginalId(p.id);
    setFormErrorMessage(null);
    setFormSuccessMessage(null);
    const standardCategories = ['Extrait de Parfum', 'Perfume Oil', 'Concentrated Attar', 'Cologne', 'Body Mist'];
    const isStandard = standardCategories.includes(p.category);

    setFormState({
      name: p.name,
      subtitle: p.subtitle || `${p.category} (50 ml)`,
      category: isStandard ? p.category : 'Custom',
      customCategory: isStandard ? '' : p.category,
      family: p.family || 'Woody Oud',
      price50ml: p.price50ml,
      originalPrice50ml: p.originalPrice50ml || Math.round(p.price50ml * 1.25),
      costPrice: p.costPrice,
      stockQuantity: p.stockQuantity ?? 15,
      inStock: p.inStock ?? true,
      sku: p.sku || '',
      tags: p.tags?.join(', ') || '',
      shortDescription: p.shortDescription || '',
      story: p.story || '',
      image: p.image || PRESET_IMAGES[0]?.url || '',
      galleryUrls: p.gallery && Array.isArray(p.gallery) ? p.gallery.join(', ') : '',
      topNotes: p.notes?.top?.join(', ') || '',
      heartNotes: p.notes?.heart?.join(', ') || '',
      baseNotes: p.notes?.base?.join(', ') || '',
      longevity: p.longevity || 5,
      projection: p.projection || 4,
      sillage: p.sillage || 'Enveloping',
      gender: p.gender || 'Unisex',
      isBestSeller: !!p.isBestSeller,
      isNewArrival: !!p.isNewArrival,
      isLimitedEdition: !!p.isLimitedEdition,
      isPublished: p.isPublished !== false,
      concentration: p.concentration || p.category,
      ingredients: p.ingredients || 'Alcohol Denat., Parfum (Fragrance), Aqua (Water).'
    });
    setIsProductModalOpen(true);
  };

  // Image Upload handler (supports phone camera & file upload)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFormErrorMessage('Image file is larger than 8MB. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormState(prev => ({ ...prev, image: base64 }));
        setFormErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Add/Edit Perfume
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      setFormErrorMessage('Please provide a perfume name.');
      return;
    }
    if (Number(formState.price50ml) <= 0) {
      setFormErrorMessage('Price must be greater than 0.');
      return;
    }

    const effectiveCategory = formState.category === 'Custom'
      ? (formState.customCategory.trim() || 'Extrait de Parfum')
      : formState.category;

    const parseNotes = (str: string) => 
      str.split(',').map(s => s.trim()).filter(Boolean);

    const productId = productModalMode === 'edit' && editingOriginalId
      ? editingOriginalId
      : formState.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `amrr-${Date.now()}`;

    const existing = products.find(p => p.id === productId);

    const parsedGallery = formState.galleryUrls
      ? formState.galleryUrls.split(',').map(s => s.trim()).filter(Boolean)
      : (existing?.gallery || [formState.image || PRESET_IMAGES[0]?.url]);
    if (formState.image && !parsedGallery.includes(formState.image)) {
      parsedGallery.unshift(formState.image);
    }

    const parsedTags = formState.tags
      ? formState.tags.split(',').map(s => s.trim()).filter(Boolean)
      : (existing?.tags || []);

    const productPayload: Product = {
      ...existing,
      id: productId,
      name: formState.name.trim(),
      subtitle: formState.subtitle.trim() || `${effectiveCategory} (50 ml)`,
      category: effectiveCategory,
      family: formState.family.trim() || 'Woody Oud',
      price50ml: Number(formState.price50ml),
      originalPrice50ml: Number(formState.originalPrice50ml) || undefined,
      costPrice: formState.costPrice !== undefined && formState.costPrice !== null && !isNaN(Number(formState.costPrice)) ? Number(formState.costPrice) : (existing?.costPrice || undefined),
      availableSizes: ['50 ml'],
      stockQuantity: Number(formState.stockQuantity),
      inStock: Boolean(formState.inStock && Number(formState.stockQuantity) > 0),
      sku: formState.sku.trim() || undefined,
      tags: parsedTags,
      shortDescription: formState.shortDescription.trim() || `Luxurious artisanal formulation crafted by AMRR Perfumes.`,
      story: formState.story.trim() || `Crafted with meticulous attention to detail, featuring high-concentration French botanicals and artisanal aged resins.`,
      image: formState.image || existing?.image || PRESET_IMAGES[0]?.url,
      gallery: parsedGallery.length > 0 ? parsedGallery : [formState.image || PRESET_IMAGES[0]?.url],
      notes: {
        top: parseNotes(formState.topNotes),
        heart: parseNotes(formState.heartNotes),
        base: parseNotes(formState.baseNotes)
      },
      longevity: Number(formState.longevity),
      projection: Number(formState.projection),
      sillage: formState.sillage,
      gender: formState.gender,
      season: existing?.season || ['All Seasons'],
      occasion: existing?.occasion || ['Signature Daily', 'Evenings'],
      concentration: formState.concentration || effectiveCategory,
      ingredients: formState.ingredients || 'Alcohol Denat., Parfum (Fragrance), Aqua (Water).',
      rating: existing?.rating || 5.0,
      reviewCount: existing?.reviewCount || 14,
      reviews: existing?.reviews || [],
      isBestSeller: formState.isBestSeller,
      isNewArrival: formState.isNewArrival,
      isLimitedEdition: formState.isLimitedEdition,
      isPublished: formState.isPublished,
      isActive: formState.isPublished,
      updatedAt: new Date().toISOString()
    };

    if (productModalMode === 'add') {
      if (onAddProduct) {
        onAddProduct(productPayload);
      } else {
        onUpdateProduct(productPayload);
      }
      setFormSuccessMessage(`"${productPayload.name}" added to catalog successfully!`);
    } else {
      onUpdateProduct(productPayload);
      setFormSuccessMessage(`"${productPayload.name}" updated successfully!`);
    }

    setTimeout(() => {
      setIsProductModalOpen(false);
      setFormSuccessMessage(null);
    }, 700);
  };

  // Delete Perfume handler
  const handleDeleteProduct = (productId: string) => {
    if (onDeleteProduct) {
      onDeleteProduct(productId);
    }
    setConfirmDeleteId(null);
    setIsProductModalOpen(false);
  };

  const startEditProduct = (p: Product) => {
    handleOpenEditProduct(p);
  };

  const saveProductEdit = (p: Product) => {
    onUpdateProduct({
      ...p,
      price50ml: editPrice50,
      stockQuantity: editStock,
      inStock: editStock > 0
    });
    setEditingProductId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAwb(text);
    setTimeout(() => setCopiedAwb(null), 2500);
  };

  const handleMarkAllAsRead = async () => {
    const unread = messages.filter(m => !m.read);
    for (const m of unread) {
      await updateMessageStatusInFirestore(m.id, { read: true });
    }
  };

  const handleReplyViaGmail = (msg: CustomerInboxMessage) => {
    if (!msg.email || msg.email === 'Not provided') return;

    const subject = `AMRR Perfumes - Re: ${msg.source === 'feedback' ? 'Your Feedback' : 'Your Inquiry'}`;
    const greeting = msg.name && msg.name !== 'Customer Feedback' && msg.name !== 'Valued Customer'
      ? `Dear ${msg.name},`
      : 'Dear Customer,';
    
    const bodyText = `${greeting}\n\nThank you for reaching out to AMRR Perfumes atelier.\n\nIn response to your message:\n"${msg.message}"\n\n[Type your response here]\n\n---\nWarm regards,\nAMRR Perfumes Concierge\namrrparfumes@gmail.com\nhttps://amrr.in`;

    const encodedRecipient = encodeURIComponent(msg.email.trim());
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(bodyText);

    // Direct Gmail Web Composer URL
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedRecipient}&su=${encodedSubject}&body=${encodedBody}`;

    // Mark as read and replied in database
    updateMessageStatusInFirestore(msg.id, { read: true, replied: true });

    const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // Fallback to mailto if browser popups are blocked
      window.location.href = `mailto:${encodedRecipient}?subject=${encodedSubject}&body=${encodedBody}`;
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (inboxFilter === 'unread' && msg.read) return false;
    if (inboxFilter === 'contact_support' && msg.source !== 'contact_support') return false;
    if (inboxFilter === 'feedback' && msg.source !== 'feedback') return false;
    
    if (inboxSearch.trim()) {
      const q = inboxSearch.toLowerCase();
      const matchName = (msg.name || '').toLowerCase().includes(q);
      const matchEmail = (msg.email || '').toLowerCase().includes(q);
      const matchMsg = (msg.message || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchMsg) return false;
    }
    return true;
  });

  const handleManualDispatch = async (order: Order) => {
    setDispatchingOrderId(order.id);
    setDispatchMessage(null);

    try {
      const res = await createDelhiveryShipment(order, isTestMode);
      if (res.success && res.awbNumber) {
        const updatedOrder: Order = {
          ...order,
          awbNumber: res.awbNumber,
          delhiveryStatus: 'Manifested',
          delhiveryPickupLocation: res.pickupLocation || 'amrparfumes',
          delhiveryShipmentCreatedAt: new Date().toISOString(),
          delhiveryTrackingUrl: `https://www.delhivery.com/track/package/${res.awbNumber}`,
          status: 'Shipped',
          delhiveryError: undefined
        };

        if (onUpdateOrder) {
          onUpdateOrder(updatedOrder);
        }

        setDispatchMessage({
          id: order.id,
          success: true,
          text: `Shipment manifested! AWB: ${res.awbNumber} (Pickup: ${res.pickupLocation})`
        });
      } else {
        const updatedOrder: Order = {
          ...order,
          delhiveryError: res.error || 'Delhivery shipment creation failed.'
        };
        if (onUpdateOrder) {
          onUpdateOrder(updatedOrder);
        }

        setDispatchMessage({
          id: order.id,
          success: false,
          text: res.error || 'Delhivery shipment creation failed. Verify pincode & API token.'
        });
      }
    } catch (err: any) {
      setDispatchMessage({
        id: order.id,
        success: false,
        text: err.message || 'Dispatch error'
      });
    } finally {
      setDispatchingOrderId(null);
    }
  };

  const handleOpenTracking = async (order: Order) => {
    setTrackingOrder(order);
    setIsLoadingTracking(true);
    setTrackingDetails(null);

    const awbToTrack = order.awbNumber || order.id;
    try {
      const tracking = await trackDelhiveryShipment(awbToTrack);
      setTrackingDetails({
        awbNumber: tracking.awbNumber || awbToTrack,
        currentStatus: tracking.currentStatus || 'In Transit',
        statusLocation: tracking.statusLocation || 'Central Sorting Hub',
        expectedDelivery: tracking.expectedDelivery || order.estimatedDelivery,
        origin: tracking.origin || 'amrparfumes',
        destination: tracking.destination || `${order.shippingDetails.city} (${order.shippingDetails.pincode})`,
        scans: tracking.scans || [],
        error: tracking.error
      });
    } catch (err: any) {
      setTrackingDetails({
        awbNumber: awbToTrack,
        currentStatus: 'Unknown',
        origin: 'amrparfumes',
        scans: [],
        error: err.message || 'Could not fetch live tracking data.'
      });
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const handleRunPincodeTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingPincodeLoading(true);
    setPincodeTestResult(null);

    try {
      const [serviceRes, rateRes] = await Promise.all([
        checkPincodeServiceability(testPincode, isTestMode),
        calculateShippingCharges({ pincode: testPincode, weightGrams: 500, test: isTestMode })
      ]);

      setPincodeTestResult({
        pincode: testPincode,
        service: serviceRes,
        rate: rateRes
      });
    } catch (err: any) {
      setPincodeTestResult({
        pincode: testPincode,
        error: err.message || 'Verification test failed'
      });
    } finally {
      setTestingPincodeLoading(false);
    }
  };

  const exportSalesCSV = () => {
    let csv = "Order ID,Date,Customer,Phone,Pincode,City,Items,Total,Payment ID,Delhivery AWB,Status\n";
    orders.forEach(o => {
      const itemsList = o.items.map(i => `${i.product.name} x${i.quantity}`).join('; ');
      csv += `"${o.id}","${o.createdAt}","${o.shippingDetails.fullName}","${o.shippingDetails.phone}","${o.shippingDetails.pincode}","${o.shippingDetails.city}","${itemsList}",${o.totalAmount},"${o.paymentId}","${o.awbNumber || 'None'}","${o.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AMRR_Perfumes_Orders_Delhivery.csv';
    a.click();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-5xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-7 my-auto overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">AMRR Perfumes Admin Portal</h3>
                <p className="text-[11px] text-gray-500">Logistics & Catalog Operations Center</p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="py-16 space-y-4 max-w-sm mx-auto text-center px-4">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-2 text-amber-700">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-black">Administrator Access Only</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                This dashboard contains customer records, inventory controls, and order dispatch systems. Access is strictly protected and requires signing in with an authorized store administrator account.
              </p>
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLogin) onOpenLogin();
                  }}
                  className="w-full py-3 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-colors cursor-pointer shadow-md"
                >
                  Sign In With Admin Account
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Return to Store
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-5 flex-1 overflow-y-auto">
              
              {/* KPIs Header */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Total Revenue</span>
                  <p className="text-xl font-bold text-black">{formatPrice(totalRevenue, currency)}</p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Total Orders</span>
                  <p className="text-xl font-bold text-black">{orders.length}</p>
                </div>

                {/* Site Visitors KPI Card */}
                <div 
                  onClick={() => setActiveTab('traffic')}
                  className="bg-gray-50 hover:bg-gray-100 p-3.5 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                  title="View live site visitors & traffic analytics"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Site Visitors</span>
                    <Globe className="w-3.5 h-3.5 text-black" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-xl font-bold text-black">
                      {(siteStats?.totalVisits ?? 0).toLocaleString()}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      +{siteStats?.todayVisits ?? 0} today
                    </span>
                  </div>
                </div>

                {/* Customers & CRM KPI Card */}
                <div 
                  onClick={() => setActiveTab('customers')}
                  className="bg-gray-50 hover:bg-gray-100 p-3.5 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                  title="View registered customer Gmails & WhatsApp phone numbers"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Customers CRM</span>
                    <Users className="w-3.5 h-3.5 text-black" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-xl font-bold text-black">{customerLeads.length}</p>
                    {customerLeads.filter(c => c.phone).length > 0 && (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-md">
                        {customerLeads.filter(c => c.phone).length} on WA
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Delhivery Manifested</span>
                  <p className="text-xl font-bold text-emerald-700">
                    {orders.filter(o => o.awbNumber).length}
                  </p>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-500">Customer Inbox</span>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xl font-bold text-black">{messages.length}</p>
                    {messages.filter(m => !m.read).length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        {messages.filter(m => !m.read).length} new
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'orders' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" /> Orders ({orders.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'inventory' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Product Inventory ({products.length})
                  </button>

                  {/* Accounts / Accounting Tab */}
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'accounts' ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" /> Accounts
                  </button>

                  {/* Customers CRM Tab */}
                  <button
                    onClick={() => setActiveTab('customers')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'customers' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Customers CRM ({customerLeads.length})
                  </button>

                  {/* Site Visitors Tab */}
                  <button
                    onClick={() => setActiveTab('traffic')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'traffic' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> Site Visitors ({siteStats?.totalVisits ?? 0})
                  </button>

                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'inbox' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" /> Customer Inbox ({messages.length})
                    {messages.filter(m => !m.read).length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-600 text-white font-bold rounded-full">
                        {messages.filter(m => !m.read).length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('delhivery-test')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'delhivery-test' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" /> Delhivery Diagnostics
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isTestMode} 
                      onChange={(e) => setIsTestMode(e.target.checked)}
                      className="accent-black rounded"
                    />
                    <span className={isTestMode ? 'text-amber-700 font-bold' : 'text-gray-600'}>
                      {isTestMode ? 'Test Mode Active (Dry-Run)' : 'Live Carrier Mode'}
                    </span>
                  </label>

                  <button
                    onClick={exportSalesCSV}
                    className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* TAB 1: ORDERS & DELHIVERY LOGISTICS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {/* Delhivery Quick Status Banner */}
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-black">Delhivery Express B2C API:</span>
                      <span className="text-gray-600">Pickup Origin: <strong>amrparfumes</strong></span>
                    </div>
                    <div className="text-gray-500 text-[11px]">
                      Automatic AWB generation upon checkout | Real-time scan sync enabled
                    </div>
                  </div>

                  {dispatchMessage && (
                    <div className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                      dispatchMessage.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {dispatchMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                        <span className="font-semibold">{dispatchMessage.text}</span>
                      </div>
                      <button 
                        onClick={() => setDispatchMessage(null)}
                        className="text-gray-400 hover:text-black font-bold text-sm"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {orders.length === 0 ? (
                    <div className="text-center py-12 space-y-2 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <Package className="w-10 h-10 text-gray-400 mx-auto" />
                      <p className="text-xs text-gray-600 font-semibold">No orders received yet.</p>
                      <p className="text-[11px] text-gray-400">Customer checkout orders will appear here automatically with Delhivery tracking.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-black font-bold border-b border-gray-200">
                            <th className="p-3">Order & Date</th>
                            <th className="p-3">Customer & Destination</th>
                            <th className="p-3">Items & Value</th>
                            <th className="p-3">Delhivery Waybill (AWB)</th>
                            <th className="p-3">Shipment Status</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 align-top">
                                <span className="font-mono font-bold text-black block">{ord.id}</span>
                                <span className="text-[11px] text-gray-500 block">{ord.createdAt}</span>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[120px]" title={ord.paymentId}>
                                  Pay ID: {ord.paymentId}
                                </span>
                              </td>

                              <td className="p-3 align-top">
                                <span className="font-semibold text-black block">{ord.shippingDetails.fullName}</span>
                                <span className="text-[11px] text-gray-600 block">
                                  {ord.shippingDetails.city}, {ord.shippingDetails.state}
                                </span>
                                <span className="text-[10px] font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-800 inline-block mt-0.5 font-bold">
                                  PIN: {ord.shippingDetails.pincode}
                                </span>
                                <span className="text-[10px] text-gray-500 block mt-0.5">{ord.shippingDetails.phone}</span>
                              </td>

                              <td className="p-3 align-top">
                                <span className="font-bold text-black block">{formatPrice(ord.totalAmount, currency)}</span>
                                <span className="text-[11px] text-gray-600 block">
                                  {ord.items.map(i => `${i.product.name} (${i.selectedSize}) x${i.quantity}`).join(', ')}
                                </span>
                              </td>

                              <td className="p-3 align-top">
                                {ord.awbNumber ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-black text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded">
                                        {ord.awbNumber}
                                      </span>
                                      <button
                                        onClick={() => copyToClipboard(ord.awbNumber!)}
                                        className="p-1 text-gray-400 hover:text-black rounded hover:bg-gray-200 transition-colors"
                                        title="Copy AWB Number"
                                      >
                                        {copiedAwb === ord.awbNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-gray-500 block">
                                      Pickup: <strong>{ord.delhiveryPickupLocation || 'amrparfumes'}</strong>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold inline-block">
                                      Unassigned AWB
                                    </span>
                                    {ord.delhiveryError && (
                                      <span className="text-[10px] text-red-600 block leading-tight max-w-[150px]" title={ord.delhiveryError}>
                                        {ord.delhiveryError}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="p-3 align-top">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                  ord.status === 'Shipped' || ord.status === 'In Transit' || ord.status === 'Manifested'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    : ord.status === 'Delivered'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                                }`}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {ord.status}
                                </span>
                              </td>

                              <td className="p-3 align-top space-y-1.5">
                                {ord.awbNumber ? (
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => handleOpenTracking(ord)}
                                      className="px-2.5 py-1 bg-black text-white text-[10px] font-bold rounded hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Truck className="w-3 h-3" /> Track Live
                                    </button>
                                    <a
                                      href={`https://www.delhivery.com/track/package/${ord.awbNumber}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-gray-500 hover:text-black flex items-center gap-0.5 underline"
                                    >
                                      Delhivery.com <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleManualDispatch(ord)}
                                    disabled={dispatchingOrderId === ord.id}
                                    className="px-2.5 py-1 bg-black text-white text-[10px] font-bold rounded hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {dispatchingOrderId === ord.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Manifesting...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-3 h-3" /> Dispatch via Delhivery
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PRODUCT INVENTORY */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  {/* Top Toolbar: Search, Category Filter, and Add New Perfume CTA */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      {/* Search Input */}
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          placeholder="Search perfumes, notes, or categories..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>

                      {/* Category Filter */}
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3 h-3 text-gray-500" />
                        <select
                          value={inventoryCategoryFilter}
                          onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                          className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer"
                        >
                          <option value="all">All Categories ({products.length})</option>
                          {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                            <option key={cat} value={cat}>
                              {cat} ({products.filter(p => p.category === cat).length})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Add New Perfume Primary Button */}
                    <button
                      onClick={handleOpenAddProduct}
                      className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow cursor-pointer flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add New Perfume
                    </button>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 font-semibold border border-gray-200">
                      Total Fragrances: <strong className="text-black">{products.length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                      Live on Store: <strong className="text-emerald-950">{products.filter(p => p.isPublished !== false).length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-gray-50 text-gray-700 font-semibold border border-gray-200">
                      Hidden / Draft: <strong className="text-gray-900">{products.filter(p => p.isPublished === false).length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                      In Stock: <strong className="text-emerald-950">{products.filter(p => p.stockQuantity > 0).length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                      Low Stock (&lt;10): <strong className="text-amber-950">{products.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length}</strong>
                    </span>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-black font-bold border-b border-gray-200">
                          <th className="p-3">Perfume &amp; Photo</th>
                          <th className="p-3">Category &amp; Accord</th>
                          <th className="p-3">50ml Price</th>
                          <th className="p-3">Inventory Stock</th>
                          <th className="p-3">Storefront Status</th>
                          <th className="p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {products
                          .filter(p => {
                            const q = inventorySearch.toLowerCase().trim();
                            const matchesSearch = !q || 
                              p.name.toLowerCase().includes(q) ||
                              p.category.toLowerCase().includes(q) ||
                              (p.family && p.family.toLowerCase().includes(q)) ||
                              (p.notes?.top && p.notes.top.some(n => n.toLowerCase().includes(q))) ||
                              (p.notes?.base && p.notes.base.some(n => n.toLowerCase().includes(q)));
                            const matchesCat = inventoryCategoryFilter === 'all' || p.category.toLowerCase() === inventoryCategoryFilter.toLowerCase();
                            return matchesSearch && matchesCat;
                          })
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1 relative">
                                    <img 
                                      src={p.image} 
                                      alt={p.name} 
                                      referrerPolicy="no-referrer" 
                                      className="w-full h-full object-contain" 
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-black text-sm">{p.name}</span>
                                      {p.isBestSeller && (
                                        <span className="px-1.5 py-0.2 text-[9px] bg-amber-100 text-amber-900 font-bold rounded">
                                          Bestseller
                                        </span>
                                      )}
                                      {p.isNewArrival && (
                                        <span className="px-1.5 py-0.2 text-[9px] bg-blue-100 text-blue-900 font-bold rounded">
                                          New
                                        </span>
                                      )}
                                      {p.isLimitedEdition && (
                                        <span className="px-1.5 py-0.2 text-[9px] bg-purple-100 text-purple-900 font-bold rounded">
                                          Limited
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-gray-500 block font-normal">{p.subtitle}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3 align-middle">
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                                  {p.category}
                                </span>
                                {p.family && (
                                  <span className="text-[10px] text-gray-500 block mt-1 font-medium">{p.family}</span>
                                )}
                              </td>

                              <td className="p-3 align-middle">
                                <div className="font-bold text-black text-sm">
                                  {formatPrice(p.price50ml, currency)}
                                </div>
                                {p.originalPrice50ml && p.originalPrice50ml > p.price50ml && (
                                  <span className="text-[10px] text-gray-400 line-through block">
                                    {formatPrice(p.originalPrice50ml, currency)}
                                  </span>
                                )}
                              </td>

                              <td className="p-3 align-middle">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                                  p.stockQuantity <= 0
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : p.stockQuantity < 10
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${p.stockQuantity <= 0 ? 'bg-red-600' : p.stockQuantity < 10 ? 'bg-amber-600' : 'bg-emerald-600'}`} />
                                  {p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : 'Out of Stock'}
                                </span>
                              </td>

                              <td className="p-3 align-middle">
                                <div className="flex items-center gap-2">
                                  {p.isPublished !== false ? (
                                    <>
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Live on Store
                                      </span>
                                      <button
                                        onClick={() => onTogglePublish?.(p.id, false)}
                                        title="Hide this fragrance from the public storefront"
                                        className="text-[10px] text-gray-500 hover:text-black font-semibold underline cursor-pointer"
                                      >
                                        Hide
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-200 text-gray-700 border border-gray-300">
                                        Hidden / Draft
                                      </span>
                                      <button
                                        onClick={() => onTogglePublish?.(p.id, true)}
                                        title="Make this fragrance visible on the public storefront"
                                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                                      >
                                        Publish
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 align-middle">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenEditProduct(p)}
                                    className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                  >
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                  </button>

                                  {confirmDeleteId === p.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleDeleteProduct(p.id)}
                                        className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-[10px] font-bold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteId(p.id)}
                                      title="Delete perfume from catalog"
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: DELHIVERY DIAGNOSTICS & PINCODE TESTER */}
              {activeTab === 'delhivery-test' && (
                <div className="space-y-5">
                  {/* Configuration Diagnostic Card */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 text-xs">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Delhivery B2C Server Integration Status
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">API Secret Token</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${delhiveryHealth?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="font-bold text-black">
                            {delhiveryHealth?.isConfigured ? `Loaded (${delhiveryHealth.tokenPrefix || 'Active'})` : 'Default Simulation / Secret Injected'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">Pickup Location Registered</span>
                        <p className="font-bold text-black font-mono mt-0.5">
                          {delhiveryHealth?.pickupLocation || 'amrparfumes'}
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">Delhivery Endpoint</span>
                        <p className="font-bold text-black truncate mt-0.5" title="https://track.delhivery.com">
                          https://track.delhivery.com
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Pincode & Shipping Calculator Tool */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4 text-xs">
                    <div>
                      <h4 className="font-bold text-black text-sm">Pincode Serviceability & Shipping Calculator</h4>
                      <p className="text-gray-500 text-[11px]">
                        Verify whether Delhivery delivers to a destination pincode and inspect live rate responses.
                      </p>
                    </div>

                    <form onSubmit={handleRunPincodeTest} className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        value={testPincode}
                        onChange={(e) => setTestPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit Pincode (e.g. 110001, 400001, 560001)"
                        maxLength={6}
                        className="flex-1 p-2.5 rounded-lg border border-gray-300 bg-white font-mono font-bold focus:outline-none focus:border-black"
                      />
                      <button
                        type="submit"
                        disabled={testingPincodeLoading || testPincode.length !== 6}
                        className="px-4 py-2.5 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {testingPincodeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Check Serviceability
                      </button>
                    </form>

                    {pincodeTestResult && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">
                            Results for PIN: <strong className="font-mono">{pincodeTestResult.pincode}</strong>
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            pincodeTestResult.service?.serviceable ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                          }`}>
                            {pincodeTestResult.service?.serviceable ? 'Serviceable' : 'Non-Serviceable'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <span className="text-gray-500 block">District / City:</span>
                            <span className="font-semibold text-black">{pincodeTestResult.service?.city || pincodeTestResult.service?.district || 'General Zone'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Prepaid Delivery:</span>
                            <span className="font-semibold text-black">{pincodeTestResult.service?.prepaidAvailable ? 'Available' : 'Standard'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Estimated Courier Charge:</span>
                            <span className="font-semibold text-black">
                              ₹{pincodeTestResult.rate?.shippingCharge || 0} ({pincodeTestResult.rate?.isComplimentary ? 'Complimentary for Customer' : 'Calculated'})
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CUSTOMER INBOX TAB */}
              {activeTab === 'inbox' && (
                <div className="space-y-4">
                  {/* Search, Filters, and Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search messages by customer name, email, or keywords..."
                        value={inboxSearch}
                        onChange={(e) => setInboxSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white text-xs border border-gray-300 rounded-lg text-black focus:outline-none focus:border-black"
                      />
                      {inboxSearch && (
                        <button
                          onClick={() => setInboxSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {messages.some(m => !m.read) && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-gray-700 whitespace-nowrap"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-blue-600" /> Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setInboxFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        inboxFilter === 'all'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All Messages ({messages.length})
                    </button>

                    <button
                      onClick={() => setInboxFilter('unread')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        inboxFilter === 'unread'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Unread ({messages.filter(m => !m.read).length})
                    </button>

                    <button
                      onClick={() => setInboxFilter('contact_support')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        inboxFilter === 'contact_support'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Support Inquiries ({messages.filter(m => m.source === 'contact_support').length})
                    </button>

                    <button
                      onClick={() => setInboxFilter('feedback')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        inboxFilter === 'feedback'
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Customer Feedback ({messages.filter(m => m.source === 'feedback').length})
                    </button>
                  </div>

                  {/* Messages List */}
                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-200 text-gray-400">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-black">No messages in inbox</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        {inboxSearch
                          ? 'No customer inquiries match your current search keywords.'
                          : 'Messages submitted by customers via "Contact AMRR Support" or "Customer Feedback" will be received here in real time.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`bg-white rounded-xl border p-4 transition-all ${
                            msg.read
                              ? 'border-gray-200 opacity-90'
                              : 'border-blue-300 shadow-sm ring-1 ring-blue-100'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              {msg.read ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  <CheckCheck className="w-3 h-3 text-gray-400" /> Read
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span> New
                                </span>
                              )}

                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  msg.source === 'contact_support'
                                    ? 'text-indigo-800 bg-indigo-50 border border-indigo-200'
                                    : 'text-amber-800 bg-amber-50 border border-amber-200'
                                }`}
                              >
                                {msg.source === 'contact_support' ? 'Support Inquiry' : 'Customer Feedback'}
                              </span>

                              <span className="text-xs font-bold text-black">
                                {msg.name || 'Anonymous Customer'}
                              </span>

                              {msg.email && msg.email !== 'Not provided' && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {msg.email}
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-gray-400 font-mono whitespace-nowrap flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(msg.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>

                          {/* Message Body */}
                          <div className="mt-3 p-3.5 bg-gray-50 rounded-lg text-xs leading-relaxed text-gray-800 font-normal whitespace-pre-wrap border border-gray-100">
                            {msg.message}
                          </div>

                          {/* Action Toolbar */}
                          <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateMessageStatusInFirestore(msg.id, { read: !msg.read })}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-gray-700 transition-colors"
                              >
                                {msg.read ? (
                                  <>
                                    <Clock className="w-3 h-3 text-gray-500" /> Mark Unread
                                  </>
                                ) : (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-blue-600" /> Mark as Read
                                  </>
                                )}
                              </button>

                              {msg.email && msg.email !== 'Not provided' && (
                                <button
                                  onClick={() => handleReplyViaGmail(msg)}
                                  className="px-3.5 py-1.5 bg-black text-white hover:bg-gray-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                  title={`Open Gmail and reply directly to ${msg.email}`}
                                >
                                  <Send className="w-3.5 h-3.5 text-amber-300" /> Reply via Gmail
                                </button>
                              )}

                              {msg.replied && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                                  <Check className="w-3 h-3 text-emerald-600" /> Replied
                                </span>
                              )}
                            </div>

                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this message from your inbox?')) {
                                  await deleteMessageFromFirestore(msg.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ACCOUNTS & ACCOUNTING */}
              {activeTab === 'accounts' && (
                <AdminAccountsTab
                  orders={orders}
                  products={products}
                  currency={currency}
                  accounts={financialAccounts}
                  transactions={accountingTransactions}
                  expenses={accountingExpenses}
                  transfers={accountingTransfers}
                />
              )}

              {/* TAB: CUSTOMERS & LEADS CRM (GMAIL & WHATSAPP) */}
              {activeTab === 'customers' && (
                <AdminCustomersTab customers={customerLeads} />
              )}

              {/* TAB: SITE TRAFFIC & VISITOR ANALYTICS */}
              {activeTab === 'traffic' && (
                <AdminTrafficTab stats={siteStats} />
              )}

            </div>
          )}

        </motion.div>

        {/* LIVE CARRIER TRACKING MODAL */}
        {trackingOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-black" />
                  <div>
                    <h4 className="font-bold text-base">Delhivery Live Tracking</h4>
                    <p className="text-[11px] text-gray-500">AWB: {trackingOrder.awbNumber || trackingOrder.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTrackingOrder(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoadingTracking ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-black" />
                  <p className="text-xs text-gray-600 font-semibold">Querying Delhivery Tracking Network...</p>
                </div>
              ) : trackingDetails ? (
                <div className="space-y-4 text-xs">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Current Status</span>
                      <span className="font-bold text-sm text-black flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {trackingDetails.currentStatus}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Expected Delivery</span>
                      <span className="font-bold text-sm text-black flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-4 h-4 text-black" />
                        {trackingDetails.expectedDelivery || 'Within 48-72 Hours'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Pickup Origin</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {trackingDetails.origin || 'amrparfumes'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Destination</span>
                      <span className="font-semibold text-gray-800">
                        {trackingDetails.destination || trackingOrder.shippingDetails.city}
                      </span>
                    </div>
                  </div>

                  {/* Scans Timeline */}
                  <div className="space-y-2 pt-1">
                    <h5 className="font-bold text-black text-xs uppercase tracking-wider">Carrier Scans & Events</h5>
                    {trackingDetails.scans && trackingDetails.scans.length > 0 ? (
                      <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 pl-6">
                        {trackingDetails.scans.map((scan, idx) => (
                          <div key={idx} className="relative space-y-0.5">
                            <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-black ring-4 ring-white" />
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-black">{scan.scan}</span>
                              <span className="text-gray-400 font-mono text-[10px]">
                                {scan.scanDateTime ? new Date(scan.scanDateTime).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600">{scan.location} {scan.instructions ? `— ${scan.instructions}` : ''}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-[11px] italic bg-gray-50 p-3 rounded-lg border border-gray-200">
                        Shipment manifested at pickup warehouse ("amrparfumes"). Courier pickup scan will update shortly upon dispatch.
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200 flex justify-end">
                    <a
                      href={`https://www.delhivery.com/track/package/${trackingOrder.awbNumber || trackingOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 text-xs flex items-center gap-1.5"
                    >
                      Open Official Delhivery Tracking <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}

        {/* ADD / EDIT PERFUME FULL MODAL */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black text-white">
                      {productModalMode === 'add' ? 'Add Perfume' : 'Edit Perfume'}
                    </span>
                    <h4 className="font-bold text-base sm:text-lg text-black">
                      {productModalMode === 'add' ? 'Add New Fragrance to Catalog' : `Edit: ${formState.name}`}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Set up fragrance category, photo, pricing, inventory count, and scent profile notes.
                  </p>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Notifications */}
              {formSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              {formErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formErrorMessage}</span>
                </div>
              )}

              {/* Add / Edit Form */}
              <form onSubmit={handleSaveProduct} className="space-y-5 text-xs">
                
                {/* 1. Basic Details & Category */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> 1. Fragrance Identity &amp; Category
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Perfume Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Khael Valley, Royal Amber..."
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black focus:ring-1 focus:ring-black outline-none font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={formState.subtitle}
                        onChange={(e) => setFormState(prev => ({ ...prev, subtitle: e.target.value }))}
                        placeholder="e.g. Extrait de Parfum (50 ml)"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black focus:ring-1 focus:ring-black outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={formState.category}
                        onChange={(e) => setFormState(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black focus:ring-1 focus:ring-black outline-none cursor-pointer"
                      >
                        <option value="Extrait de Parfum">Extrait de Parfum</option>
                        <option value="Eau de Parfum">Eau de Parfum</option>
                        <option value="Perfume Oil">Perfume Oil</option>
                        <option value="Concentrated Attar">Concentrated Attar</option>
                        <option value="Cologne">Cologne</option>
                        <option value="Body Mist">Body Mist</option>
                        <option value="Custom">+ Custom Category...</option>
                      </select>
                      {formState.category === 'Custom' && (
                        <input
                          type="text"
                          value={formState.customCategory}
                          onChange={(e) => setFormState(prev => ({ ...prev, customCategory: e.target.value }))}
                          placeholder="Type category name..."
                          className="w-full mt-1.5 p-1.5 bg-white border border-gray-300 rounded-lg text-black text-xs outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Fragrance Family
                      </label>
                      <select
                        value={formState.family}
                        onChange={(e) => setFormState(prev => ({ ...prev, family: e.target.value }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black focus:ring-1 focus:ring-black outline-none cursor-pointer"
                      >
                        <option value="Woody Oud">Woody Oud</option>
                        <option value="Fresh Aquatic">Fresh Aquatic</option>
                        <option value="Oriental Floral">Oriental Floral</option>
                        <option value="Spicy Amber">Spicy Amber</option>
                        <option value="Gourmand Citrus">Gourmand Citrus</option>
                        <option value="Solar Amber Floral">Solar Amber Floral</option>
                        <option value="Regal Musk">Regal Musk</option>
                        <option value="Fresh Citrus Oud">Fresh Citrus Oud</option>
                        <option value="Warm Spicy Amber">Warm Spicy Amber</option>
                        <option value="Aromatic Leather">Aromatic Leather</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Target Gender
                      </label>
                      <select
                        value={formState.gender}
                        onChange={(e) => setFormState(prev => ({ ...prev, gender: e.target.value as any }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black focus:ring-1 focus:ring-black outline-none cursor-pointer"
                      >
                        <option value="Unisex">Unisex</option>
                        <option value="Masculine">Masculine</option>
                        <option value="Feminine">Feminine</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Photo & Image Changing */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> 2. Bottle Photo &amp; Imagery
                  </h5>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Live Bottle Preview */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border-2 border-gray-300 shadow-sm flex items-center justify-center p-2 overflow-hidden mx-auto">
                        {formState.image ? (
                          <img
                            src={formState.image}
                            alt="Perfume preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-gray-400 text-center text-[10px]">No Photo</div>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold mt-1 block">Live Preview</span>
                    </div>

                    {/* Upload / URL Input options */}
                    <div className="flex-1 space-y-2.5 w-full">
                      <div>
                        <span className="block text-[11px] font-bold text-gray-700 mb-1">Upload Photo from Device</span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" /> Choose Photo from Phone / PC
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Or Paste Image URL</label>
                        <input
                          type="text"
                          value={formState.image}
                          onChange={(e) => setFormState(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="https://example.com/perfume-bottle.jpg"
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AMRR Studio Presets */}
                  <div className="pt-2 border-t border-gray-200">
                    <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Or Pick From AMRR Studio Bottle Presets:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {PRESET_IMAGES.map((preset) => {
                        const isSelected = formState.image === preset.url;
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setFormState(prev => ({ ...prev, image: preset.url }))}
                            className={`p-1 rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-black ring-2 ring-black bg-white'
                                : 'border-gray-200 bg-white hover:border-gray-400'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-10 object-contain mx-auto"
                            />
                            <span className="text-[9px] font-semibold text-gray-700 block truncate mt-0.5">
                              {preset.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Pricing, Inventory & Badges */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> 3. Pricing, Stock &amp; Badges
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        50ml Selling Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formState.price50ml}
                        onChange={(e) => setFormState(prev => ({ ...prev, price50ml: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Original MRP Price (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formState.originalPrice50ml}
                        onChange={(e) => setFormState(prev => ({ ...prev, originalPrice50ml: Number(e.target.value) }))}
                        placeholder="e.g. 1499"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Unit Cost Price (₹ COGS) <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formState.costPrice !== undefined ? formState.costPrice : ''}
                        onChange={(e) => setFormState(prev => ({ ...prev, costPrice: e.target.value !== '' ? Number(e.target.value) : undefined }))}
                        placeholder="e.g. 180"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Stock Quantity (Bottles)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formState.stockQuantity}
                        onChange={(e) => setFormState(prev => ({ ...prev, stockQuantity: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Badges & In Stock Toggle */}
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <input
                        type="checkbox"
                        checked={formState.isPublished}
                        onChange={(e) => setFormState(prev => ({ ...prev, isPublished: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span>Visible on Storefront (Published)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-black">
                      <input
                        type="checkbox"
                        checked={formState.inStock}
                        onChange={(e) => setFormState(prev => ({ ...prev, inStock: e.target.checked }))}
                        className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                      />
                      <span>In Stock (Available for Purchase)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-800">
                      <input
                        type="checkbox"
                        checked={formState.isBestSeller}
                        onChange={(e) => setFormState(prev => ({ ...prev, isBestSeller: e.target.checked }))}
                        className="w-4 h-4 text-black rounded border-gray-300 cursor-pointer"
                      />
                      <span>Mark as Best Seller</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-800">
                      <input
                        type="checkbox"
                        checked={formState.isNewArrival}
                        onChange={(e) => setFormState(prev => ({ ...prev, isNewArrival: e.target.checked }))}
                        className="w-4 h-4 text-black rounded border-gray-300 cursor-pointer"
                      />
                      <span>Mark as New Arrival</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-800">
                      <input
                        type="checkbox"
                        checked={formState.isLimitedEdition}
                        onChange={(e) => setFormState(prev => ({ ...prev, isLimitedEdition: e.target.checked }))}
                        className="w-4 h-4 text-black rounded border-gray-300 cursor-pointer"
                      />
                      <span>Mark as Limited Edition</span>
                    </label>
                  </div>
                </div>

                {/* 4. Scent Notes & Description */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 4. Scent Pyramid &amp; Sensory Story
                  </h5>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Short Overview Description
                    </label>
                    <textarea
                      rows={2}
                      value={formState.shortDescription}
                      onChange={(e) => setFormState(prev => ({ ...prev, shortDescription: e.target.value }))}
                      placeholder="Brief fragrance description for cards..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Top Notes <span className="text-gray-400 font-normal">(Comma separated)</span>
                      </label>
                      <input
                        type="text"
                        value={formState.topNotes}
                        onChange={(e) => setFormState(prev => ({ ...prev, topNotes: e.target.value }))}
                        placeholder="e.g. Bergamot, Pink Pepper"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Heart Notes <span className="text-gray-400 font-normal">(Comma separated)</span>
                      </label>
                      <input
                        type="text"
                        value={formState.heartNotes}
                        onChange={(e) => setFormState(prev => ({ ...prev, heartNotes: e.target.value }))}
                        placeholder="e.g. Taif Rose, White Suede"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Base Notes <span className="text-gray-400 font-normal">(Comma separated)</span>
                      </label>
                      <input
                        type="text"
                        value={formState.baseNotes}
                        onChange={(e) => setFormState(prev => ({ ...prev, baseNotes: e.target.value }))}
                        placeholder="e.g. Aged Oud, Vanilla"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Longevity: {formState.longevity}/5
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={formState.longevity}
                        onChange={(e) => setFormState(prev => ({ ...prev, longevity: Number(e.target.value) }))}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Projection: {formState.projection}/5
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={formState.projection}
                        onChange={(e) => setFormState(prev => ({ ...prev, projection: Number(e.target.value) }))}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Sillage
                      </label>
                      <select
                        value={formState.sillage}
                        onChange={(e) => setFormState(prev => ({ ...prev, sillage: e.target.value as any }))}
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                      >
                        <option value="Intense">Intense</option>
                        <option value="Enveloping">Enveloping</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Subtle">Subtle</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Full Olfactory Story &amp; Heritage Description
                    </label>
                    <textarea
                      rows={3}
                      value={formState.story}
                      onChange={(e) => setFormState(prev => ({ ...prev, story: e.target.value }))}
                      placeholder="Detailed fragrance inspiration and background story..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Ingredients &amp; Botanical Formulation
                    </label>
                    <input
                      type="text"
                      value={formState.ingredients}
                      onChange={(e) => setFormState(prev => ({ ...prev, ingredients: e.target.value }))}
                      placeholder="e.g. Alcohol Denat., Parfum (Fragrance), Aqua (Water)..."
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Inventory SKU / Product Code
                      </label>
                      <input
                        type="text"
                        value={formState.sku}
                        onChange={(e) => setFormState(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="e.g. AMRR-KHL-50"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Product Search Tags <span className="text-gray-400 font-normal">(Comma separated)</span>
                      </label>
                      <input
                        type="text"
                        value={formState.tags}
                        onChange={(e) => setFormState(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="e.g. luxury, oud, bestseller, gift"
                        className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Additional Gallery Image URLs <span className="text-gray-400 font-normal">(Comma separated)</span>
                    </label>
                    <input
                      type="text"
                      value={formState.galleryUrls}
                      onChange={(e) => setFormState(prev => ({ ...prev, galleryUrls: e.target.value }))}
                      placeholder="https://example.com/gallery1.jpg, https://example.com/gallery2.jpg"
                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                    />
                  </div>
                </div>

                {/* Form Footer Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200">
                  <div>
                    {productModalMode === 'edit' && editingOriginalId && (
                      confirmDeleteId === editingOriginalId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-red-600 font-bold">Confirm delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(editingOriginalId)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(editingOriginalId)}
                          className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Perfume
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setIsProductModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {productModalMode === 'add' ? 'Add Perfume to Catalog' : 'Save Changes'}
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}

      </div>
    </AnimatePresence>
  );
};
