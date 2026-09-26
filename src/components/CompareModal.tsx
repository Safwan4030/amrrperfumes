import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import { Product } from '../types';

interface CompareModalProps {
  compareList: Product[];
  onClose: () => void;
  onRemoveFromCompare: (productId: string) => void;
  currency: 'INR' | 'USD';
}

export const CompareModal: React.FC<CompareModalProps> = ({
  compareList,
  onClose,
  onRemoveFromCompare,
  currency,
}) => {
  if (compareList.length === 0) return null;

  const formatPrice = (usdAmount: number) => {
    if (currency === 'INR') {
      const inrAmount = Math.round(usdAmount * 85);
      return `₹${inrAmount.toLocaleString('en-IN')}`;
    }
    return `$${usdAmount}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold uppercase tracking-wider">Compare Fragrances</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-800 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto p-6">
            <div className={`grid grid-cols-${compareList.length + 1} gap-4 min-w-[600px]`}>
              
              {/* Feature Labels Column */}
              <div className="space-y-6 text-xs font-bold uppercase tracking-widest text-gray-500 pt-32">
                <p>Category</p>
                <p>Fragrance Family</p>
                <p>50ml Price</p>
                <p>Longevity</p>
                <p>Projection</p>
                <p>Top Notes</p>
                <p>Heart Notes</p>
                <p>Base Notes</p>
              </div>

              {/* Product Columns */}
              {compareList.map((p) => (
                <div key={p.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col space-y-6 text-xs">
                  <div className="flex flex-col items-center text-center relative h-28">
                    <button
                      onClick={() => onRemoveFromCompare(p.id)}
                      className="absolute top-0 right-0 p-1 text-gray-400 hover:text-black cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <img src={p.image} alt={p.name} referrerPolicy="no-referrer" className="h-20 object-contain mb-2 bg-white rounded p-1 border border-gray-200" />
                    <p className="font-bold text-sm text-black">{p.name}</p>
                  </div>

                  <p className="font-semibold text-center text-black">{p.category}</p>
                  <p className="font-semibold text-center text-gray-600">{p.family}</p>
                  <p className="font-bold text-center text-sm text-black">{formatPrice(p.price50ml)}</p>
                  <p className="font-semibold text-center text-gray-700">{p.longevity} / 5</p>
                  <p className="font-semibold text-center text-gray-700">{p.sillage}</p>
                  <p className="text-center text-gray-600">{p.notes.top.join(', ')}</p>
                  <p className="text-center text-gray-600">{p.notes.heart.join(', ')}</p>
                  <p className="text-center text-gray-600">{p.notes.base.join(', ')}</p>
                </div>
              ))}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
