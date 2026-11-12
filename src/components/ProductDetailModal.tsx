import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShoppingBag, 
  Zap, 
  Heart, 
  Sparkles
} from 'lucide-react';
import { Product, BottleSize } from '../types';
import { Currency, formatPrice } from '../utils/helpers';
import { resolveProductImage } from '../data/products';

interface ProductDetailModalProps {
  product: Product | null;
  currency: Currency;
  isWishlisted: boolean;
  onClose: () => void;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (product: Product, size: BottleSize, quantity: number, giftWrap?: boolean, giftMsg?: string) => void;
  onBuyNow: (product: Product, size: BottleSize, quantity: number, giftWrap?: boolean, giftMsg?: string) => void;
  allProducts: Product[];
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  currency,
  isWishlisted,
  onClose,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
}) => {
  const [quantity] = useState(1);

  if (!product) return null;

  const selectedSize: BottleSize = '50 ml';
  const currentPrice = product.price50ml;
  const originalPrice = product.originalPrice50ml;
  const isAvailable = product.inStock && (product.stockQuantity === undefined || product.stockQuantity > 0);

  const resolvedMainImage = resolveProductImage(product.image, product.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-5xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-[11px] tracking-wider uppercase font-bold border border-gray-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{product.category}</span>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Image Visualizer */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative bg-white rounded-xl p-6 h-80 sm:h-[400px] flex items-center justify-center overflow-hidden border border-gray-200 shadow-inner">
                {/* Wishlist Button */}
                <button
                  onClick={() => onToggleWishlist(product)}
                  className={`absolute top-4 right-4 z-10 p-2.5 rounded-full shadow transition-all cursor-pointer ${
                    isWishlisted ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100 border border-gray-200'
                  }`}
                  aria-label="Add to wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current text-white' : ''}`} />
                </button>

                {/* Primary Perfume Bottle Image */}
                <img 
                  src={resolvedMainImage} 
                  alt={product.name} 
                  referrerPolicy="no-referrer"
                  className="h-72 sm:h-88 w-auto object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>

            {/* Right Details & Configuration */}
            <div className="lg:col-span-6 space-y-5 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    {product.family}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-black">
                    {product.name}
                  </h2>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
                    {product.subtitle}
                  </p>
                </div>

                {/* Olfactory Notes Pyramid */}
                {product.notes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                      Fragrance Accord Architecture:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Top Notes</span>
                        <span className="font-semibold text-gray-900 leading-tight block mt-0.5">
                          {product.notes.top?.join(', ') || 'Botanical Bergamot'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Heart Notes</span>
                        <span className="font-semibold text-gray-900 leading-tight block mt-0.5">
                          {product.notes.heart?.join(', ') || 'Floral Woods'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">Base Notes</span>
                        <span className="font-semibold text-gray-900 leading-tight block mt-0.5">
                          {product.notes.base?.join(', ') || 'Aged Agarwood'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Price Display */}
                <div className="flex items-baseline gap-3 pt-2">
                  <span className="text-3xl font-extrabold text-black">
                    {formatPrice(currentPrice * quantity, currency)}
                  </span>
                  {originalPrice && originalPrice > currentPrice && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(originalPrice * quantity, currency)}
                    </span>
                  )}
                </div>

              </div>

              {/* CTAs Footer */}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={!isAvailable}
                    onClick={() => {
                      if (!isAvailable) return;
                      onAddToCart(product, selectedSize, quantity);
                      onClose();
                    }}
                    className={`py-3 px-4 rounded-xl border border-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isAvailable
                        ? 'text-black hover:bg-black hover:text-white'
                        : 'text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {isAvailable ? 'Add To Cart' : 'Sold Out'}
                  </button>

                  <button
                    disabled={!isAvailable}
                    onClick={() => {
                      if (!isAvailable) return;
                      onBuyNow(product, selectedSize, quantity);
                      onClose();
                    }}
                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      isAvailable
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    {isAvailable ? 'Buy Now' : 'Out of Stock'}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
};

