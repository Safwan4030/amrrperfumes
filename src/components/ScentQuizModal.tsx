import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Compass, RotateCcw, ShoppingBag, Zap } from 'lucide-react';
import { Product, BottleSize } from '../types';
import { Currency, formatPrice } from '../utils/helpers';

interface ScentQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: Currency;
  onAddToCart: (p: Product, size: BottleSize, qty: number) => void;
  onBuyNow: (p: Product, size: BottleSize, qty: number) => void;
}

export const ScentQuizModal: React.FC<ScentQuizModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onAddToCart,
  onBuyNow
}) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    vibe: '',
    occasion: '',
    note: ''
  });

  const [recommendation, setRecommendation] = useState<Product | null>(null);

  if (!isOpen) return null;

  const quizSteps = [
    {
      title: "What is your primary fragrance personality?",
      subtitle: "Choose the atmosphere you want to radiate",
      options: [
        { label: "Regal & Woody Oud", value: "woody", icon: "🪵", matchId: "khael-valley" },
        { label: "Fresh Aquatic & Ocean Breeze", value: "fresh", icon: "🌊", matchId: "kaahf" },
        { label: "Sensual Rosey Oud & Velvet Amber", value: "oriental", icon: "🌹", matchId: "rosey-oud" },
        { label: "Luminous Pearl Amber & Solar Florals", value: "solar", icon: "✨", matchId: "akoya" },
        { label: "Prestige Saffron & Smoked Tuscan Leather", value: "leather", icon: "👑", matchId: "alif-escala" },
        { label: "Royal White Musk & Silken Cashmere", value: "musk", icon: "🤍", matchId: "musk-rijali" },
        { label: "Intense Cardamom & Warm Glazed Chestnut", value: "warm-spicy", icon: "🌰", matchId: "armani-stronger" },
        { label: "Sunlit Citrus & Airy Summer Oud", value: "citrus-oud", icon: "☀️", matchId: "summer-oud" },
        { label: "Royal Imperial Citrus & Noble Smoked Oud", value: "imperial-oud", icon: "🌿", matchId: "inperial" }
      ]
    },
    {
      title: "When will you wear this fragrance most?",
      subtitle: "Select your main occasion",
      options: [
        { label: "Everyday Executive Signature", value: "daily" },
        { label: "Gala Dinners & High Formal Events", value: "formal" },
        { label: "Yacht, Resort & Beachside Evenings", value: "resort" },
        { label: "Intimate Evenings & Private Clubs", value: "night" }
      ]
    }
  ];

  const handleSelectOption = (value: string, matchId?: string) => {
    if (step === 1 && matchId) {
      setAnswers({ ...answers, vibe: value });
      const matched = products.find(p => p.id === matchId) || products[0];
      setRecommendation(matched);
      setStep(2);
    } else {
      setStep(3); // Result step
    }
  };

  const resetQuiz = () => {
    setStep(1);
    setAnswers({ vibe: '', occasion: '', note: '' });
    setRecommendation(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 my-auto overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-black" />
              <h3 className="text-xl font-bold text-black">Find Your Signature Scent</h3>
            </div>

            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1 & 2 */}
          {step < 3 && (
            <div className="py-6 space-y-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                  Step {step} of 2
                </span>
                <h4 className="text-2xl font-bold mt-2 text-black">
                  {quizSteps[step - 1].title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {quizSteps[step - 1].subtitle}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizSteps[step - 1].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(opt.value, opt.matchId)}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-black hover:bg-gray-50 text-left transition-all flex items-center gap-3 cursor-pointer group"
                  >
                    <span className="text-2xl">{opt.icon || '✨'}</span>
                    <span className="font-semibold text-xs text-black">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Recommendation Result */}
          {step === 3 && recommendation && (
            <div className="py-6 space-y-6 text-center">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black text-white text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                Your Ideal Match
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center gap-6 text-left">
                <img 
                  src={recommendation.image} 
                  alt={recommendation.name} 
                  referrerPolicy="no-referrer"
                  className="w-32 h-32 object-contain bg-white p-2 rounded-xl border border-gray-200 shadow-sm"
                />

                <div className="space-y-2 flex-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{recommendation.family}</span>
                  <h4 className="text-2xl font-bold text-black">{recommendation.name}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed font-normal">{recommendation.shortDescription}</p>
                  <p className="text-base font-extrabold text-black pt-1">{formatPrice(recommendation.price50ml, currency)} <span className="text-xs font-normal text-gray-500">(50ml Extrait de Parfum)</span></p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={resetQuiz}
                  className="py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-wider hover:border-black hover:text-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Quiz
                </button>

                <button
                  onClick={() => {
                    onAddToCart(recommendation, '50 ml', 1);
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-black text-black font-bold text-xs uppercase tracking-wider hover:bg-black hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add To Bag
                </button>

                <button
                  onClick={() => {
                    onBuyNow(recommendation, '50 ml', 1);
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Buy Now
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
