import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag, Lock, CheckCircle2 } from 'lucide-react';
import { CartItem } from '../types';
import { Currency, formatPrice } from '../utils/helpers';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currency: Currency;
  currentUser?: { email: string; name: string } | null;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onSaveForLater: (item: CartItem) => void;
  onCheckout: (discountAmount: number, couponCode: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  currency,
  currentUser,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) => {
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  
  const discountAmount = (appliedCoupon === 'AMRR10' || appliedCoupon === 'ZEUFI10' || appliedCoupon === 'FADE10') ? Math.round(subtotal * 0.1) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const applyCouponCode = () => {
    const code = coupon.trim().toUpperCase();
    if (code === 'AMRR10' || code === 'ZEUFI10' || code === 'FADE10') {
      setAppliedCoupon('AMRR10');
      setCouponError(null);
    } else {
      setCouponError('Invalid coupon code.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
        
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-white text-black h-full shadow-2xl flex flex-col z-10"
        >
          {/* Cart Header */}
          <div className="p-5 bg-black text-white flex items-center justify-between border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold">Shopping Bag</h2>
              <p className="text-xs text-gray-400">
                {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'} Selected
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-black">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Your Bag is Empty</h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                    Explore our luxury perfume collection and select your signature scent.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-black text-white text-xs font-semibold rounded-full uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer"
                >
                  Explore Fragrances
                </button>
              </div>
            ) : (
              cartItems.map((item, index) => (
                <div 
                  key={`${item.product.id}-${item.selectedSize}-${index}`}
                  className="bg-white p-3 rounded-xl border border-gray-200 flex gap-3 shadow-sm"
                >
                  {/* Thumbnail */}
                  <img 
                    src={item.product.image} 
                    alt={item.product.name} 
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 object-contain bg-white p-1.5 rounded-lg border border-gray-200 shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-black">{item.product.name}</h4>
                        <button 
                          onClick={() => onRemoveItem(index)}
                          className="text-gray-400 hover:text-black transition-colors p-1 cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">{item.selectedSize} Extrait de Parfum</p>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-300 rounded-lg bg-gray-50">
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded-l-lg transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-black">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded-r-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="font-bold text-sm text-black">
                        {formatPrice(item.unitPrice * item.quantity, currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer / Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-gray-200 bg-gray-50 space-y-4">
              
              {/* Promo Code Input */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="Enter promo code"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:border-black uppercase"
                    />
                  </div>
                  <button
                    onClick={applyCouponCode}
                    className="px-4 py-2 bg-black text-white text-xs font-bold uppercase rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="text-[11px] text-black font-semibold">
                    ✓ Promo Code AMRR10 applied (10% Off)
                  </p>
                )}
                {couponError && (
                  <p className="text-[11px] text-red-600 font-medium">{couponError}</p>
                )}
              </div>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-gray-600 border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal, currency)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-black font-semibold">
                    <span>Discount (10%)</span>
                    <span>-{formatPrice(discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-black font-semibold">FREE</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-black pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal, currency)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  onCheckout(discountAmount, appliedCoupon || '');
                  onClose();
                }}
                className="w-full py-3.5 bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Pay</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!currentUser ? (
                <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-gray-500 font-medium">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Sign in required before payment</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Signed in as <strong>{currentUser.name || currentUser.email}</strong></span>
                </div>
              )}

            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
