import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, ShieldCheck, Mail, Send, Check } from 'lucide-react';
import { AmrrLogo } from './AmrrLogo';
import { saveMessageToFirestore, saveCustomerLead } from '../lib/firebase';

interface FooterProps {
  onNavigate?: (sectionId: string) => void;
  onOpenQuiz: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenQuiz }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    setIsSubmittingMessage(true);
    const msgId = 'msg_' + Date.now();
    await saveMessageToFirestore({
      id: msgId,
      name: contactName.trim() || 'Valued Customer',
      email: contactEmail.trim() || 'Not provided',
      message: contactMessage.trim(),
      source: 'contact_support',
      createdAt: new Date().toISOString(),
      read: false
    });

    if (contactEmail.trim() && contactEmail.includes('@')) {
      await saveCustomerLead({
        name: contactName.trim() || 'Inquiry Contact',
        email: contactEmail.trim(),
        source: 'contact_inquiry',
        optedInOffers: true,
        notes: `Inquiry: ${contactMessage.trim().substring(0, 80)}`
      });
    }

    setIsSubmittingMessage(false);
    setMessageSent(true);
    setTimeout(() => {
      setMessageSent(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setShowContactModal(false);
    }, 2500);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    const fbId = 'fb_' + Date.now();
    await saveMessageToFirestore({
      id: fbId,
      name: 'Customer Feedback',
      email: feedbackEmail.trim() || 'Not provided',
      message: feedbackText.trim(),
      source: 'feedback',
      createdAt: new Date().toISOString(),
      read: false
    });

    if (feedbackEmail.trim() && feedbackEmail.includes('@')) {
      await saveCustomerLead({
        name: 'Patron',
        email: feedbackEmail.trim(),
        source: 'contact_inquiry',
        optedInOffers: true,
        notes: `Feedback: ${feedbackText.trim().substring(0, 80)}`
      });
    }

    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackText('');
      setFeedbackEmail('');
      setFeedbackSent(false);
    }, 3500);
  };

  const faqs = [
    { q: 'How long do AMRR Perfumes last on skin and clothes?', a: 'All AMRR Perfumes creations are formulated as Eau de Parfum, yielding 18+ hours on fabrics and 12-14 hours of persistent projection on skin.' },
    { q: 'What is the bottle volume and formulation?', a: 'Every fragrance is bottled in a heavy 50ml crystal flacon featuring a custom magnetic cap and precision high-output atomizer.' },
    { q: 'What payment methods are supported?', a: 'We accept Cash On Delivery (COD), UPI (Google Pay, PhonePe, Paytm), Net Banking, and all major Credit/Debit Cards with 256-bit encryption.' },
  ];

  return (
    <footer className="bg-black text-white border-t border-gray-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-gray-800">
          
          {/* Brand Bio */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <AmrrLogo size="md" variant="light" />
            </div>
            <p className="text-xs text-gray-400 font-normal leading-relaxed max-w-sm">
              &quot;They will remember you before they remember your name.&quot; Handcrafting Eau de Parfum and pure French perfume oils for connoisseurs across India and beyond.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 text-xs uppercase tracking-wider font-semibold">
            <p className="text-white font-bold">Collections</p>
            <ul className="space-y-2 text-gray-400">
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white cursor-pointer">Home</button></li>
              <li><button onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white cursor-pointer">The AMRR Collection</button></li>
              <li><button onClick={onOpenQuiz} className="hover:text-white cursor-pointer">Scent Finder Quiz</button></li>
              <li><button onClick={() => setShowFAQModal(true)} className="hover:text-white cursor-pointer">FAQs</button></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3 text-xs uppercase tracking-wider font-semibold">
            <p className="text-white font-bold">Client Support</p>
            <ul className="space-y-2 text-gray-400">
              <li><button onClick={() => setShowContactModal(true)} className="hover:text-white cursor-pointer">Contact Us</button></li>
            </ul>
          </div>

          {/* Customer Feedback Box */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider font-bold text-white">Customer Feedback</p>
            <p className="text-xs text-gray-400 font-normal">
              Share your thoughts, fragrance experience, or suggestions directly with our atelier.
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-2">
              <textarea
                placeholder="Enter your feedback..."
                required
                rows={2}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full p-2.5 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white resize-none"
              />
              <input
                type="email"
                placeholder="Your email (optional)"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                className="w-full p-2 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                disabled={!feedbackText.trim()}
                className="w-full py-2.5 bg-white hover:bg-gray-200 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              >
                {feedbackSent ? '✓ Thank You For Your Feedback!' : 'Submit Feedback'}
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Trust & Copyright Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 space-y-4 md:space-y-0">
          <p className="select-none text-gray-500">
            © 2026 AMRR Perfumes. All rights reserved.
          </p>

          <div className="flex items-center space-x-3 text-[11px]">
            <span>UPI & COD Available</span>
            <span>·</span>
            <span>256-bit Secure Checkout</span>
            <span>·</span>
            <span>Free Express India Delivery</span>
          </div>
        </div>

      </div>

      {/* FAQ Modal */}
      <AnimatePresence>
        {showFAQModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white text-black p-6 rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                <h3 className="text-lg font-bold">Frequently Asked Questions</h3>
                <button onClick={() => setShowFAQModal(false)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto">
                {faqs.map((f, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <p className="font-bold text-black">{f.q}</p>
                    <p className="text-gray-600 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white text-black p-6 rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl">
              <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-3">
                <h3 className="text-base font-bold text-black">Contact AMRR Support</h3>
                <button onClick={() => setShowContactModal(false)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {messageSent ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-black">Message Sent to Admin</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Thank you! Your message has been delivered directly to our atelier team inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs text-black border border-gray-300 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Your Email</label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs text-black border border-gray-300 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      How can i help you? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      placeholder="Ask about fragrance notes, custom orders, or order tracking..."
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="w-full p-3 bg-gray-50 rounded-xl text-xs text-black border border-gray-300 focus:outline-none focus:border-black"
                      rows={3}
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={!contactMessage.trim() || isSubmittingMessage}
                      className="w-full py-2.5 bg-black text-white text-xs font-bold uppercase rounded-xl hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      {isSubmittingMessage ? (
                        <span>Sending Message...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </footer>
  );
};
