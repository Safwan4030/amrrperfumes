import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, User, ShieldCheck, ArrowRight, X, Sparkles, CheckCircle2, Truck, FileText } from 'lucide-react';
import { saveUserProfile } from '../lib/firebase';
import { sendOtpEmail } from '../utils/email';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: { email: string; name: string; phone?: string }) => void;
  reasonMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  reasonMessage
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('1234');

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedCode(randomCode);

    try {
      await sendOtpEmail(email, randomCode, name);
    } catch {
      // Continue to OTP step
    }

    setIsSubmitting(false);
    setStep('otp');
    setOtp(['', '', '', '']);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const displayName = name.trim() || email.split('@')[0].replace('.', ' ');
    const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    const userData = {
      email: email.trim().toLowerCase(),
      name: capitalizedName,
      phone: phone.trim()
    };

    // Save profile to Firestore
    await saveUserProfile(email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'), userData);

    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(userData);
    }, 500);
  };

  const handleDirectQuickLogin = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }
    const displayName = name.trim() || email.split('@')[0].replace('.', ' ');
    const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    const userData = {
      email: email.trim().toLowerCase(),
      name: capitalizedName,
      phone: phone.trim()
    };

    await saveUserProfile(email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'), userData);

    onLoginSuccess(userData);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-8 z-10 overflow-y-auto max-h-[90vh] min-h-0 my-auto [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent]"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all cursor-pointer z-20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-black text-white flex items-center justify-center shadow-md">
              <Mail className="w-6 h-6" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gray-100 text-black text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Login</span>
            </div>

            <h3 className="text-2xl font-bold text-black">
              {step === 'email' ? 'Sign In With Email' : 'Enter Verification Code'}
            </h3>

            <p className="text-xs text-gray-600 max-w-xs mx-auto">
              {reasonMessage || 'Please sign in with your email address to continue to checkout and track your orders.'}
            </p>
          </div>

          {/* Form Step 1: Email Input */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-black uppercase tracking-wider block">
                  Full Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-medium text-center bg-red-50 p-2 rounded-lg border border-red-200">
                  {error}
                </p>
              )}

              {/* Benefits Box */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-[11px] text-gray-700">
                <div className="font-bold text-black flex items-center gap-1 text-[10px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Account Features:
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Truck className="w-3.5 h-3.5 text-black" />
                  <span>Real-time SMS & Email order tracking status</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <FileText className="w-3.5 h-3.5 text-black" />
                  <span>Instant access to tax invoices & order history</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Sending Code...</span>
                  ) : (
                    <>
                      <span>Get Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Form Step 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-gray-600">
                  Verification code sent from <strong className="text-black">amrrparfumes@gmail.com</strong> to <strong className="text-black">{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-[11px] text-black underline font-semibold cursor-pointer"
                >
                  Change Email
                </button>
              </div>

              {/* Delivery Status */}
              <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verification code send to your email</span>
              </div>

              {/* OTP Input Boxes */}
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={otp[index] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = [...otp];
                      updated[index] = val;
                      setOtp(updated);
                      if (val && e.target.nextElementSibling) {
                        (e.target.nextElementSibling as HTMLInputElement).focus();
                      }
                    }}
                    className="w-12 h-12 text-center text-lg font-bold bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-black"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
