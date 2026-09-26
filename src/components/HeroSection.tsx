import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const scrollToCollections = () => {
    const elem = document.getElementById('collections');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero-section" className="relative pt-24 pb-12 sm:pt-28 sm:pb-16 bg-white text-black overflow-hidden border-b border-gray-100">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="space-y-5 sm:space-y-6 max-w-4xl mx-auto"
        >
          {/* Exact Quote Headline */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.08] text-black">
              They will remember you
            </h1>
            <p className="text-3xl sm:text-5xl xl:text-6xl font-serif italic font-normal text-gray-800 leading-[1.15]">
              before they remember your name.
            </p>
          </div>

          {/* Editorial Subtitle */}
          <p className="text-sm sm:text-base text-gray-700 font-normal leading-relaxed max-w-3xl mx-auto">
            AMRR is more than a fragrance. It is the feeling that lingers after you leave, the presence that speaks before you do, and the memory that stays long after the moment has passed. Crafted for those who move with quiet confidence, every scent carries its own character—deep, refined, sensual, and impossible to overlook. Wear it close. Let it become yours.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={scrollToCollections}
              className="px-8 py-3.5 rounded-full bg-black text-white text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-gray-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer group"
            >
              <span>DISCOVER AMRR</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};


