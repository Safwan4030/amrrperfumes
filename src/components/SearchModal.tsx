import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Product } from '../types';
import { Currency, formatPrice } from '../utils/helpers';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: Currency;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onSelectProduct
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = products.filter(p => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.family && p.family.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
      (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
      (p.notes?.top && Array.isArray(p.notes.top) && p.notes.top.some(n => n.toLowerCase().includes(q))) ||
      (p.notes?.heart && Array.isArray(p.notes.heart) && p.notes.heart.some(n => n.toLowerCase().includes(q))) ||
      (p.notes?.base && Array.isArray(p.notes.base) && p.notes.base.some(n => n.toLowerCase().includes(q)))
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative w-full max-w-2xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 overflow-hidden space-y-4"
        >
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-gray-400 absolute left-3" />
            <input 
              type="text"
              placeholder="Search perfumes by name, note (e.g. Oud, Rose), or family..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-300 text-sm text-black focus:outline-none focus:border-black"
              autoFocus
            />
            <button onClick={onClose} className="absolute right-3 text-gray-400 hover:text-black cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pt-2">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-6">
                No matching fragrances found for "{query}".
              </p>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="bg-white hover:bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt={p.name} referrerPolicy="no-referrer" className="w-12 h-12 object-contain bg-white rounded p-1 border border-gray-200" />
                    <div>
                      <h4 className="font-bold text-sm text-black">{p.name}</h4>
                      <p className="text-[11px] text-gray-500">{p.category} • {p.family}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-sm text-black">
                      {formatPrice(p.price50ml, currency)}
                    </span>
                    <span className="block text-[10px] text-gray-500 font-medium">50 ml</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
