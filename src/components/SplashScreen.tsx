import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmrrLogo } from './AmrrLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-black"
        >
          {/* Logo container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center z-10 px-6 space-y-4"
          >
            {/* AMRR Wordmark */}
            <AmrrLogo size="xl" variant="dark" />

            <p className="text-xs font-serif italic tracking-wider text-gray-600 mt-4 max-w-sm mx-auto">
              &quot;They will remember you before they remember your name&quot;
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="w-48 h-[2px] bg-gray-200 rounded-full overflow-hidden mt-8">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="w-full h-full bg-black"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
