import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_PRODUCTS } from './data/products';
import { Product, CartItem, Order, ShippingDetails, BottleSize } from './types';
import { Currency } from './utils/helpers';

// Components
import { SplashScreen } from './components/SplashScreen';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { RazorpayModal } from './components/RazorpayModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { ScentQuizModal } from './components/ScentQuizModal';
import { UserAccountModal } from './components/UserAccountModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SearchModal } from './components/SearchModal';
import { Footer } from './components/Footer';

import { Sparkles, Flame, Layers } from 'lucide-react';
import { 
  saveOrderToFirestore, 
  subscribeToOrders, 
  onAuthUserChanged, 
  logoutFirebase,
  recordSiteVisit,
  saveCustomerLead,
  syncExistingOrdersToCustomerLeads 
} from './lib/firebase';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('amrr_catalog_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load custom products from localStorage', e);
    }
    return INITIAL_PRODUCTS;
  });
  const [currency, setCurrency] = useState<Currency>('INR');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Keep catalog synced in localStorage for permanent persistence
  useEffect(() => {
    try {
      localStorage.setItem('amrr_catalog_products', JSON.stringify(products));
    } catch (e) {}
  }, [products]);

  // Customer Account & Compulsory Email Login State
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; phone?: string; uid?: string } | null>(() => {
    try {
      const cached = localStorage.getItem('amrr_current_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Pending checkout state when user is required to login before payment
  const [pendingCheckoutAfterLogin, setPendingCheckoutAfterLogin] = useState<{ discountAmount: number; couponCode: string } | null>(null);
  const [accountLoginNotice, setAccountLoginNotice] = useState<string | null>(null);
  const pendingCheckoutRef = useRef<{ discountAmount: number; couponCode: string } | null>(null);

  // Cart & Wishlist State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('amrr_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id: string) => id !== 'khael-valley');
        }
      }
    } catch {}
    return [];
  });

  // Keep wishlist in sync with localStorage (ensuring khael-valley is unliked)
  useEffect(() => {
    try {
      localStorage.setItem('amrr_wishlist', JSON.stringify(wishlistIds));
    } catch {}
  }, [wishlistIds]);

  // Orders & Saved Customer Info
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedShipping, setSavedShipping] = useState<ShippingDetails | null>(() => {
    const cachedUser = (() => {
      try {
        const c = localStorage.getItem('amrr_current_user');
        return c ? JSON.parse(c) : null;
      } catch {
        return null;
      }
    })();

    return {
      fullName: cachedUser?.name || '',
      email: cachedUser?.email || '',
      phone: cachedUser?.phone || '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      saveInformation: true
    };
  });

  // Track site visits for Admin analytics
  useEffect(() => {
    recordSiteVisit();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthUserChanged((user) => {
      if (user && user.email) {
        const userData = {
          email: user.email.toLowerCase(),
          name: user.name || user.email.split('@')[0],
          phone: user.phone || '',
          uid: user.uid
        };
        setCurrentUser(userData);
        localStorage.setItem('amrr_current_user', JSON.stringify(userData));
        setSavedShipping(prev => ({
          fullName: prev?.fullName || userData.name,
          email: userData.email,
          phone: prev?.phone || userData.phone || '',
          address: prev?.address || '',
          city: prev?.city || '',
          state: prev?.state || '',
          pincode: prev?.pincode || '',
          saveInformation: true
        }));

        // Capture customer in CRM
        saveCustomerLead({
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          source: 'account_login',
          optedInOffers: true
        });

        if (pendingCheckoutRef.current) {
          const pending = pendingCheckoutRef.current;
          pendingCheckoutRef.current = null;
          setPendingCheckoutAfterLogin(null);
          setAccountLoginNotice(null);
          setShowAccount(false);
          setCheckoutDiscount(pending.discountAmount);
          setCheckoutCoupon(pending.couponCode);
          setShowRazorpay(true);
        }
      }
    });

    return () => {
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, []);

  const handleCustomerLogin = (userData: { email: string; name: string; phone?: string }) => {
    setCurrentUser(userData);
    localStorage.setItem('amrr_current_user', JSON.stringify(userData));
    setSavedShipping(prev => ({
      fullName: prev?.fullName || userData.name,
      email: userData.email,
      phone: prev?.phone || userData.phone || '',
      address: prev?.address || '',
      city: prev?.city || '',
      state: prev?.state || '',
      pincode: prev?.pincode || '',
      saveInformation: true
    }));

    // Capture customer in CRM
    saveCustomerLead({
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      source: 'account_login',
      optedInOffers: true
    });

    if (pendingCheckoutRef.current) {
      const pending = pendingCheckoutRef.current;
      pendingCheckoutRef.current = null;
      setPendingCheckoutAfterLogin(null);
      setAccountLoginNotice(null);
      setShowAccount(false);
      setCheckoutDiscount(pending.discountAmount);
      setCheckoutCoupon(pending.couponCode);
      setShowRazorpay(true);
    }
  };

  const handleCustomerLogout = () => {
    logoutFirebase().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('amrr_current_user');
  };

  const ADMIN_EMAILS = ['amrrperfumes@gmail.com', 'amrrparfumes@gmail.com', 'safwaanvv@gmail.com'];
  const isAdmin = Boolean(currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.trim().toLowerCase()));

  // Subscribe to real-time Firestore orders securely scoped (admins get all orders, customers get their own, guests get none)
  useEffect(() => {
    const unsubscribe = subscribeToOrders((firestoreOrders) => {
      if (firestoreOrders) {
        setOrders(firestoreOrders);
        if (isAdmin && firestoreOrders.length > 0) {
          syncExistingOrdersToCustomerLeads(firestoreOrders);
        }
      }
    }, currentUser?.email, isAdmin);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.email, isAdmin]);

  // Modal Controllers
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Quick admin opening via Alt+A shortcut or #admin URL hash
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
      setShowAdmin(true);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 'a' || e.key === 'A')) || (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A'))) {
        e.preventDefault();
        setShowAdmin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Checkout & Payment State
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutCoupon, setCheckoutCoupon] = useState('');
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleOpenAccountOrLogin = () => {
    setAccountLoginNotice(null);
    setShowAccount(true);
  };

  // Wishlist Toggle
  const toggleWishlist = (product: Product) => {
    setWishlistIds((prev) => 
      prev.includes(product.id)
        ? prev.filter(id => id !== product.id)
        : [...prev, product.id]
    );
  };

  // Add to Cart
  const handleAddToCart = (product: Product, selectedSize: BottleSize, quantity: number) => {
    const unitPrice = product.price50ml;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === selectedSize
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, selectedSize, quantity, unitPrice }];
      }
    });

    setShowCart(true);
  };

  // Fast "Buy Now"
  const handleBuyNow = (product: Product, selectedSize: BottleSize, quantity: number) => {
    const unitPrice = product.price50ml;

    setCartItems([{ product, selectedSize, quantity, unitPrice }]);
    setCheckoutDiscount(0);
    setCheckoutCoupon('');

    if (!currentUser) {
      const pending = { discountAmount: 0, couponCode: '' };
      pendingCheckoutRef.current = pending;
      setPendingCheckoutAfterLogin(pending);
      setAccountLoginNotice('Please log in to your customer account to proceed to payment. Your selected fragrance is ready for payment.');
      setShowAccount(true);
      return;
    }

    setShowRazorpay(true);
  };

  // Update Cart Quantity
  const handleUpdateCartQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  // Remove Cart Item
  const handleRemoveCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Save For Later (Move to wishlist)
  const handleSaveForLater = (item: CartItem) => {
    toggleWishlist(item.product);
    setCartItems((prev) => prev.filter(i => i.product.id !== item.product.id));
  };

  // Open Checkout
  const handleStartCheckout = (discountAmount: number, couponCode: string) => {
    setCheckoutDiscount(discountAmount);
    setCheckoutCoupon(couponCode);
    setShowCart(false);

    if (!currentUser) {
      const pending = { discountAmount, couponCode };
      pendingCheckoutRef.current = pending;
      setPendingCheckoutAfterLogin(pending);
      setAccountLoginNotice('Please log in to your customer account to proceed to payment. Your selected fragrances will be ready for payment immediately after sign-in.');
      setShowAccount(true);
      return;
    }

    setShowRazorpay(true);
  };

  // Payment Success Handler
  const handlePaymentSuccess = (newOrder: Order, shippingDetails: ShippingDetails) => {
    setOrders((prev) => [newOrder, ...prev]);
    if (shippingDetails.saveInformation) {
      setSavedShipping(shippingDetails);
    }
    saveOrderToFirestore(newOrder);

    // Capture or update customer in CRM database
    if (shippingDetails.email || shippingDetails.phone) {
      saveCustomerLead({
        name: shippingDetails.fullName || 'AMRR Patron',
        email: shippingDetails.email,
        phone: shippingDetails.phone,
        city: shippingDetails.city,
        state: shippingDetails.state,
        pincode: shippingDetails.pincode,
        source: 'order_checkout',
        totalOrders: 1,
        totalSpent: newOrder.totalAmount,
        optedInOffers: true,
        notes: `Order #${newOrder.id} (${newOrder.items.length} item(s))`
      });
    }

    setCartItems([]);
    setShowRazorpay(false);
    setLatestOrder(newOrder);
    setShowConfirmation(true);
  };

  // Navigation scroll helper
  const scrollToSection = (sectionId: string) => {
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

  // Extract all distinct categories from current catalog
  const distinctCategories: string[] = Array.from(new Set(products.map(p => p.category))).filter((cat): cat is string => typeof cat === 'string' && cat.length > 0);

  const filteredProducts = activeCategory === 'all'
    ? products
    : (activeCategory === 'signature' || activeCategory === 'bestseller')
      ? products.filter(p => p.id.toLowerCase() === 'akoya' || p.name.toLowerCase() === 'akoya' || p.isBestSeller)
      : products.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased selection:bg-black selection:text-white">
      
      {/* Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Main Navbar */}
      <Navbar
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={wishlistIds.length}
        currentUser={currentUser}
        onOpenCart={() => setShowCart(true)}
        onOpenWishlist={handleOpenAccountOrLogin}
        onOpenAccount={handleOpenAccountOrLogin}
        onOpenQuiz={() => setShowQuiz(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        activeSection="hero"
        onNavigate={scrollToSection}
      />

      {/* Hero Section */}
      <div id="hero">
        <HeroSection />
      </div>

      {/* Product Collection Showcase - Signature Collections */}
      <section id="collections" className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Section Header matching the screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200/80 pb-4">
          <div className="space-y-1 text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-black">
              Signature Collections
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-normal">
              Artisanal 50ml Eau de Parfum • High-Concentrate French Essences
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 'all', label: 'THE AMRR COLLECTION' },
              { id: 'signature', label: 'SIGNATURE SCENTS' },
              ...distinctCategories
                .filter(cat => cat !== 'Eau de Parfum')
                .map(cat => ({ id: cat.toLowerCase(), label: cat.toUpperCase() }))
            ].map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Perfume Selection Tab Container - 2 columns on mobile scrolling down, responsive grid on desktop */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              className="w-full flex flex-col"
            >
              <ProductCard
                product={product}
                currency={currency}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={toggleWishlist}
                onQuickView={(p) => setQuickViewProduct(p)}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            </div>
          ))}
        </div>

      </section>

      {/* Footer */}
      <Footer
        onNavigate={scrollToSection}
        onOpenQuiz={() => setShowQuiz(true)}
      />

      {/* MODALS */}
      {/* Product Detail Modal */}
      <ProductDetailModal
        product={quickViewProduct}
        currency={currency}
        isWishlisted={quickViewProduct ? wishlistIds.includes(quickViewProduct.id) : false}
        onClose={() => setQuickViewProduct(null)}
        onToggleWishlist={toggleWishlist}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        allProducts={products}
      />

      {/* Slide-out Shopping Cart Drawer */}
      <CartDrawer
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        currency={currency}
        currentUser={currentUser}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onSaveForLater={handleSaveForLater}
        onCheckout={handleStartCheckout}
      />

      {/* Razorpay Payment Modal */}
      <RazorpayModal
        isOpen={showRazorpay}
        onClose={() => setShowRazorpay(false)}
        cartItems={cartItems}
        currency={currency}
        discountAmount={checkoutDiscount}
        couponCode={checkoutCoupon}
        savedDetails={savedShipping}
        currentUser={currentUser}
        onPromptLogin={() => {
          setShowRazorpay(false);
          const pending = { discountAmount: checkoutDiscount, couponCode: checkoutCoupon };
          pendingCheckoutRef.current = pending;
          setPendingCheckoutAfterLogin(pending);
          setAccountLoginNotice('Please sign in to your customer account to complete your payment.');
          setShowAccount(true);
        }}
        onSuccess={handlePaymentSuccess}
      />

      {/* Order Confirmation Success Modal */}
      {showConfirmation && (
        <OrderConfirmationModal
          isOpen={showConfirmation}
          order={latestOrder}
          onClose={() => {
            setShowConfirmation(false);
            setLatestOrder(null);
            setShowCart(false);
            setShowRazorpay(false);
            setShowAccount(false);
            setShowQuiz(false);
            setShowSearch(false);
            setShowAdmin(false);
            setQuickViewProduct(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onContinueShopping={() => {
            setShowConfirmation(false);
            setLatestOrder(null);
            setShowCart(false);
            setShowRazorpay(false);
            setShowAccount(false);
            setShowQuiz(false);
            setShowSearch(false);
            setShowAdmin(false);
            setQuickViewProduct(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Scent Quiz Modal */}
      <ScentQuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        products={products}
        currency={currency}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* User Account / Orders Modal */}
      <UserAccountModal
        isOpen={showAccount}
        onClose={() => {
          setShowAccount(false);
          setAccountLoginNotice(null);
        }}
        orders={orders}
        wishlistProducts={wishlistProducts}
        savedAddress={savedShipping}
        currency={currency}
        currentUser={currentUser}
        loginNotice={accountLoginNotice}
        onLogin={handleCustomerLogin}
        onLogout={handleCustomerLogout}
        onRemoveWishlist={toggleWishlist}
        onOpenAdmin={() => setShowAdmin(true)}
        onReorder={(ord) => {
          setCartItems(ord.items);
          setShowAccount(false);
          setShowCart(true);
        }}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        products={products}
        currency={currency}
        onSelectProduct={(p) => setQuickViewProduct(p)}
      />

      {/* Admin Dashboard */}
      <AdminDashboard
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        products={products}
        orders={orders}
        currency={currency}
        currentUserEmail={currentUser?.email}
        onOpenLogin={() => setShowAccount(true)}
        onUpdateProduct={(updated) => {
          setProducts((prev) => prev.map(p => p.id === updated.id ? updated : p));
        }}
        onAddProduct={(newProduct) => {
          setProducts((prev) => [newProduct, ...prev.filter(p => p.id !== newProduct.id)]);
        }}
        onDeleteProduct={(productId) => {
          setProducts((prev) => prev.filter(p => p.id !== productId));
        }}
        onUpdateOrder={(updated) => {
          setOrders((prev) => prev.map(o => o.id === updated.id ? updated : o));
          saveOrderToFirestore(updated);
        }}
      />

    </div>
  );
}
