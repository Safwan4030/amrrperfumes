import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Product, BottleSize } from '../types';
import { Currency } from '../utils/helpers';

interface ProductCardProps {
  product: Product;
  currency: Currency;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, size: BottleSize, quantity: number) => void;
  onBuyNow: (product: Product, size: BottleSize, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onQuickView,
}) => {
  const currentPrice = product.price50ml;
  const originalPrice = product.originalPrice50ml || Math.round(product.price50ml * 1.25);
  const hasDiscount = originalPrice && originalPrice > currentPrice;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="group flex flex-col w-full bg-white select-none text-left"
    >
      {/* Product Image Stage - Square aspect ratio matching luxury screenshot */}
      <div 
        onClick={() => onQuickView(product)}
        className="relative aspect-square w-full bg-white overflow-hidden cursor-pointer flex items-center justify-center p-3 sm:p-5 border border-gray-100 group-hover:border-gray-300 transition-colors"
      >
        {/* Wishlist Heart Action - Clean Floating Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all flex items-center justify-center shadow-sm ${
            isWishlisted 
              ? 'text-black bg-white shadow' 
              : 'text-black/70 hover:text-black bg-white/90 hover:bg-white'
          }`}
          aria-label="Add to wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current text-black' : ''}`} />
        </button>

        {/* Perfume Bottle Photography */}
        <img 
          src={product.image} 
          alt={product.name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Bottom-Left Pill Badge: "Sale" */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10">
          {product.inStock ? (
            <span className="bg-[#111111] text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm tracking-wide">
              Sale
            </span>
          ) : (
            <span className="bg-gray-700 text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm tracking-wide">
              Sold out
            </span>
          )}
        </div>
      </div>

      {/* Product Information Details */}
      <div className="pt-2.5 sm:pt-3 pb-1 flex-1 flex flex-col justify-between space-y-1 sm:space-y-1.5">
        
        {/* Perfume Name */}
        <h3 
          onClick={() => onQuickView(product)}
          className="text-xs sm:text-sm md:text-base font-normal sm:font-medium text-black hover:text-gray-700 transition-colors cursor-pointer truncate leading-tight"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Price Breakdown */}
        <div className="space-y-0.5 pt-0.5">
          {hasDiscount && (
            <div className="text-[11px] sm:text-xs text-gray-400 line-through leading-tight">
              Rs. {originalPrice.toLocaleString('en-IN')}.00
            </div>
          )}
          <div className="text-xs sm:text-sm md:text-base font-semibold text-black leading-tight">
            From Rs. {currentPrice.toLocaleString('en-IN')}.00
          </div>
        </div>

        {/* Full-width Outline "Choose options" button */}
        <div className="pt-2">
          <button
            onClick={() => onQuickView(product)}
            className="w-full py-2 sm:py-2.5 px-2 sm:px-3 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors text-xs sm:text-sm font-medium text-center rounded-none cursor-pointer flex items-center justify-center whitespace-nowrap"
          >
            Choose options
          </button>
        </div>

      </div>
    </motion.div>
  );
};

