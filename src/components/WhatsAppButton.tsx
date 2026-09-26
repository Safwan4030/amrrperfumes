import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

export const WhatsAppButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(message || "Hello AMRR Perfumes Concierge! I would like help selecting a fragrance.");
    window.open(`https://wa.me/919876543210?text=${text}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {isOpen ? (
        <div className="bg-white text-black p-4 rounded-2xl shadow-2xl border border-gray-200 w-72 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                AMRR Concierge
              </h4>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-600">
            Chat with our fragrance specialist on WhatsApp for personalized scent notes and immediate order support.
          </p>

          <input 
            type="text"
            placeholder="Type your question..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs text-black focus:outline-none"
          />

          <button
            onClick={handleSendWhatsApp}
            className="w-full py-2 bg-black text-white rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Start Chat
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white p-3.5 rounded-full shadow-2xl hover:bg-gray-800 transition-all flex items-center gap-2 border border-gray-700 group cursor-pointer"
          title="WhatsApp Concierge"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider pr-1">
            Fragrance Concierge
          </span>
        </button>
      )}
    </div>
  );
};
