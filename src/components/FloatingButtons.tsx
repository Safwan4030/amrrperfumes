import React, { useState, useEffect } from 'react';
import { MessageCircle, Heart, ArrowUp } from 'lucide-react';
import { Product } from '../types';

interface FloatingButtonsProps {
  wishlist: Product[];
  onOpenWishlist: () => void;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  wishlist,
  onOpenWishlist,
}) => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleWhatsAppChat = () => {
    const text = encodeURIComponent('Hello Zeufi.co Concierge! I would like personal guidance selecting my signature fragrance.');
    window.open(`https://wa.me/919876543210?text=${text}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col space-y-3">
      {/* Floating Wishlist */}
      {wishlist.length > 0 && (
        <button
          onClick={onOpenWishlist}
          className="relative p-3.5 bg-black text-white rounded-full shadow-2xl border border-gray-700 hover:scale-110 transition-all group"
          title="Wishlist"
        >
          <Heart className="w-5 h-5 fill-white text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black font-bold text-xs rounded-full flex items-center justify-center">
            {wishlist.length}
          </span>
        </button>
      )}

      {/* WhatsApp Concierge Button */}
      <button
        onClick={handleWhatsAppChat}
        className="p-3.5 bg-[#25D366] text-white rounded-full shadow-2xl hover:scale-110 transition-all flex items-center justify-center group"
        title="Chat with Zeufi.co Concierge on WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
      </button>

      {/* Back to Top */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="p-3 bg-black text-white rounded-full shadow-2xl border border-gray-700 hover:scale-110 transition-all"
          title="Back to Top"
        >
          <ArrowUp className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
};
