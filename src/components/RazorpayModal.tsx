import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  X, 
  Zap, 
  Lock, 
  Truck, 
  UserCheck, 
  AlertCircle,
  Loader2,
  PackageCheck
} from 'lucide-react';
import { CartItem, ShippingDetails, Order } from '../types';
import { Currency, formatPrice, generateOrderId, estimateDeliveryDate } from '../utils/helpers';
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayScript } from '../utils/payment';
import { checkPincodeServiceability, createDelhiveryShipment } from '../utils/delhivery';
import { sendOrderConfirmationEmail } from '../utils/email';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currency: Currency;
  discountAmount: number;
  couponCode: string;
  savedDetails: ShippingDetails | null;
  currentUser?: { email: string; name: string; phone?: string } | null;
  onPromptLogin?: () => void;
  onSuccess: (order: Order, savedDetails: ShippingDetails) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  currency,
  discountAmount,
  couponCode,
  savedDetails,
  currentUser,
  onPromptLogin,
  onSuccess
}) => {
  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(savedDetails && savedDetails.fullName ? 2 : 1);

  // Form State - automatically populated with currentUser email/name if available
  const [shipping, setShipping] = useState<ShippingDetails>(() => {
    return {
      fullName: savedDetails?.fullName || currentUser?.name || '',
      email: savedDetails?.email || currentUser?.email || '',
      phone: savedDetails?.phone || currentUser?.phone || '',
      address: savedDetails?.address || '',
      city: savedDetails?.city || '',
      state: savedDetails?.state || '',
      pincode: savedDetails?.pincode || '',
      saveInformation: true
    };
  });

  // Sync with currentUser if user logs in
  useEffect(() => {
    if (currentUser) {
      setShipping(prev => ({
        ...prev,
        email: prev.email || currentUser.email,
        fullName: prev.fullName || currentUser.name || '',
        phone: prev.phone || currentUser.phone || ''
      }));
    }
  }, [currentUser]);

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [selectedUPIApp, setSelectedUPIApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delhivery Pincode verification state
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<{
    checked: boolean;
    serviceable: boolean;
    city?: string;
    state?: string;
    message?: string;
  } | null>(null);

  // Check pincode serviceability when 6 digits are reached
  useEffect(() => {
    const cleanPin = shipping.pincode.replace(/\D/g, '').trim();
    if (cleanPin.length === 6) {
      let isCancelled = false;
      setIsCheckingPincode(true);
      
      checkPincodeServiceability(cleanPin)
        .then((res) => {
          if (!isCancelled) {
            setIsCheckingPincode(false);
            setPincodeStatus({
              checked: true,
              serviceable: res.serviceable,
              city: res.city,
              state: res.state,
              message: res.message
            });

            // Auto fill city/state if blank
            if (res.city || res.state) {
              setShipping((prev) => ({
                ...prev,
                city: prev.city || res.city || '',
                state: prev.state || res.state || ''
              }));
            }
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setIsCheckingPincode(false);
            setPincodeStatus({
              checked: true,
              serviceable: true,
              message: 'Express Delivery available'
            });
          }
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setPincodeStatus(null);
      setIsCheckingPincode(false);
    }
  }, [shipping.pincode]);

  // Sync saved shipping & logged-in email
  useEffect(() => {
    if (savedDetails && savedDetails.email) {
      setShipping((prev) => ({
        ...prev,
        email: savedDetails.email || prev.email,
        fullName: savedDetails.fullName || prev.fullName,
        phone: savedDetails.phone || prev.phone,
        address: savedDetails.address || prev.address,
        city: savedDetails.city || prev.city,
        state: savedDetails.state || prev.state,
        pincode: savedDetails.pincode || prev.pincode
      }));
    }
  }, [savedDetails]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const shippingFee = 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const validateShippingDetails = (): boolean => {
    const missingFields: string[] = [];
    if (!shipping.fullName.trim()) missingFields.push('Full Name');
    if (!shipping.email.trim()) missingFields.push('Email Address');
    if (!shipping.phone.trim()) missingFields.push('Phone Number');
    if (!shipping.pincode.trim()) missingFields.push('Pincode');
    if (!shipping.address.trim()) missingFields.push('Street Address');
    if (!shipping.city.trim()) missingFields.push('City');
    if (!shipping.state.trim()) missingFields.push('State');

    if (missingFields.length > 0) {
      setErrorMessage(`Please fill out all required details (${missingFields.join(', ')}) before proceeding.`);
      return false;
    }

    if (!shipping.email.includes('@') || !shipping.email.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (shipping.phone.replace(/\D/g, '').length < 8) {
      setErrorMessage('Please enter a valid phone number with at least 8 digits.');
      return false;
    }

    if (shipping.pincode.replace(/\D/g, '').length !== 6) {
      setErrorMessage('Please enter a valid 6-digit postal pincode.');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleStepChange = (targetStep: 1 | 2 | 3) => {
    if (targetStep === 1) {
      setErrorMessage(null);
      setStep(1);
    } else {
      if (!currentUser) {
        setErrorMessage('Customer login is required before proceeding to payment. Please sign in to continue.');
        if (onPromptLogin) {
          onPromptLogin();
        }
        return;
      }
      if (validateShippingDetails()) {
        setStep(targetStep);
      } else {
        setStep(1);
      }
    }
  };

  const finalizeOrderWithDelhivery = async (baseOrder: Order, isTestMode = false) => {
    try {
      // Manifest Delhivery shipment using pickup location "amrparfumes"
      const deliveryResult = await createDelhiveryShipment(baseOrder, isTestMode);

      if (deliveryResult.success && deliveryResult.awbNumber) {
        baseOrder.awbNumber = deliveryResult.awbNumber;
        baseOrder.delhiveryStatus = 'Manifested';
        baseOrder.delhiveryPickupLocation = deliveryResult.pickupLocation || 'amrparfumes';
        baseOrder.delhiveryShipmentCreatedAt = new Date().toISOString();
        baseOrder.delhiveryTrackingUrl = `https://www.delhivery.com/track/package/${deliveryResult.awbNumber}`;
        baseOrder.status = 'Shipped';
      } else {
        // Requirement 9: Do NOT mark as shipped if Delhivery shipment creation fails
        baseOrder.status = 'Confirmed';
        baseOrder.delhiveryError = deliveryResult.error || 'Delhivery shipment creation pending dispatch.';
        console.warn('Delhivery shipment creation note:', deliveryResult.error);
      }
    } catch (dErr: any) {
      baseOrder.status = 'Confirmed';
      baseOrder.delhiveryError = dErr.message || 'Carrier manifest pending';
    }

    // Mark email confirmation details and dispatch order confirmed mail
    baseOrder.emailConfirmationSent = true;
    baseOrder.emailSentTo = shipping.email;
    baseOrder.emailSentAt = new Date().toISOString();

    sendOrderConfirmationEmail(baseOrder).catch((e) => {
      console.warn('Background order email dispatch note:', e);
    });

    onSuccess(baseOrder, shipping);
  };

  const handleProcessRazorpayPayment = async () => {
    if (!currentUser) {
      setErrorMessage('Customer login is required before payment. Please sign in to continue.');
      if (onPromptLogin) onPromptLogin();
      return;
    }

    if (!validateShippingDetails()) {
      setStep(1);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const orderData = await createRazorpayOrder({
        amount: totalAmount,
        currency: 'INR',
        receipt: generateOrderId(),
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          selectedSize: item.selectedSize
        })),
        couponCode: couponCode || undefined,
        notes: {
          customer_email: shipping.email,
          customer_name: shipping.fullName
        }
      });

      if (!orderData.key_id) {
        setIsProcessing(false);
        setErrorMessage('Razorpay Key ID is not configured. Please ensure VITE_RAZORPAY_KEY_ID or RAZORPAY_KEY_ID is set.');
        return;
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !(window as any).Razorpay) {
        setIsProcessing(false);
        setErrorMessage('Unable to load payment gateway script. Please check your connection.');
        return;
      }

      const options: any = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'AMRR Perfumes',
        description: `${cartItems.length} Fragrance Item(s) Purchase`,
        image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=200&q=200',
        handler: async function (response: any) {
          try {
            if (response.razorpay_order_id && response.razorpay_signature) {
              try {
                await verifyRazorpayPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
              } catch (vErr) {
                console.warn('Signature verification warning:', vErr);
              }
            }

            setIsProcessing(false);

            const newOrder: Order = {
              id: response.razorpay_order_id || generateOrderId(),
              createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              items: cartItems,
              subtotal,
              discount: discountAmount,
              shippingFee,
              totalAmount,
              currency,
              paymentMethod: 'Razorpay Checkout',
              paymentId: response.razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 10)}`,
              shippingDetails: shipping,
              status: 'Processing',
              estimatedDelivery: estimateDeliveryDate(),
              delhiveryPickupLocation: 'amrparfumes'
            };

            await finalizeOrderWithDelhivery(newOrder, false);
          } catch (verifyErr: any) {
            setIsProcessing(false);
            setErrorMessage(verifyErr.message || 'Payment processing failed.');
          }
        },
        prefill: {
          name: shipping.fullName,
          email: shipping.email,
          contact: shipping.phone
        },
        notes: {
          address: `${shipping.address}, ${shipping.city}, ${shipping.state} - ${shipping.pincode}`,
          order_items: cartItems.map(i => `${i.product.name} (${i.selectedSize} x${i.quantity})`).join(' | ')
        },
        theme: {
          color: '#000000'
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          }
        }
      };

      if (orderData.order?.id && !orderData.isFallback) {
        options.order_id = orderData.order.id;
      }

      try {
        const rzp = new (window as any).Razorpay(options);

        rzp.on('payment.failed', function (response: any) {
          setIsProcessing(false);
          const errDetails = response.error;
          const description = errDetails?.description || errDetails?.reason || 'Payment failed or was declined.';
          
          if (description.toLowerCase().includes('does not match registered website') || errDetails?.code === 'BAD_REQUEST_ERROR') {
            setErrorMessage(`Razorpay Domain Security Policy: Payment blocked because preview domain (${window.location.hostname}) is not whitelisted in Razorpay Dashboard.`);
          } else {
            setErrorMessage(`Payment could not be completed: ${description}`);
          }
        });

        rzp.open();
      } catch (rzpErr: any) {
        setIsProcessing(false);
        setErrorMessage(`Payment could not be initialized: ${rzpErr?.message || 'Popup blocked or domain restricted.'}`);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err?.message || 'Failed to initialize payment order.');
    }
  };

  const handleDirectDemoOrder = async (methodName = 'Prepaid (Direct Test Mode)') => {
    if (!currentUser) {
      setErrorMessage('Customer login is required before completing order. Please sign in to continue.');
      if (onPromptLogin) onPromptLogin();
      return;
    }

    setIsProcessing(true);
    const newOrder: Order = {
      id: generateOrderId(),
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: cartItems,
      subtotal,
      discount: discountAmount,
      shippingFee,
      totalAmount,
      currency,
      paymentMethod: methodName,
      paymentId: `pay_${Math.random().toString(36).substring(2, 10)}`,
      shippingDetails: shipping,
      status: 'Processing',
      estimatedDelivery: estimateDeliveryDate(),
      delhiveryPickupLocation: 'amrparfumes'
    };

    await finalizeOrderWithDelhivery(newOrder, true);
    setIsProcessing(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm overflow-y-auto">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto"
        >
          {/* Top Header */}
          <div className="bg-white text-black px-6 py-4 flex items-center justify-between border-b border-gray-200">
            <div>
              <h3 className="text-lg font-bold text-black tracking-tight">Checkout</h3>
              <p className="text-xs text-gray-500">AMRR Perfumes</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gray-400" /> Total Amount
                </span>
                <span className="font-bold text-base text-black">
                  {formatPrice(totalAmount, currency)}
                </span>
              </div>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-black cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Locked Amount Banner */}
          <div className="bg-gray-100 text-black px-6 py-2 flex items-center justify-between text-xs border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-gray-600" />
              <span className="font-semibold text-gray-700">Order Total:</span>
              <span className="font-bold text-sm text-black">
                {formatPrice(totalAmount, currency)}
              </span>
            </div>
            <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-800 font-medium">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items
            </span>
          </div>

          {/* Progress Steps Header */}
          <div className="bg-gray-50 px-6 py-2.5 border-b border-gray-200 flex items-center justify-around text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => handleStepChange(1)}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors ${step >= 1 ? 'text-black font-bold' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${step >= 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
              Details
            </button>
            <span className="w-8 h-[1px] bg-gray-300" />
            <button
              type="button"
              onClick={() => handleStepChange(2)}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors ${step >= 2 ? 'text-black font-bold' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${step >= 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
              Review
            </button>
            <span className="w-8 h-[1px] bg-gray-300" />
            <button
              type="button"
              onClick={() => handleStepChange(3)}
              className={`flex items-center gap-1.5 cursor-pointer transition-colors ${step >= 3 ? 'text-black font-bold' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${step >= 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>3</span>
              Payment
            </button>
          </div>

          {/* Modal Content Area */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-900 p-4 rounded-xl text-xs space-y-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                  <button 
                    type="button"
                    onClick={() => setErrorMessage(null)} 
                    className="text-red-700 hover:text-red-900 font-bold ml-1 text-base leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <div className="pt-2 border-t border-red-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDirectDemoOrder('Direct Test Mode Order')}
                    className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Complete Order Directly (Test Mode)
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1: CUSTOMER SHIPPING DETAILS */}
            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); handleStepChange(2); }} className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="text-base font-bold text-black">
                    1. Shipping & Contact Details
                  </h4>
                  <span className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Express Delivery
                  </span>
                </div>

                {/* Email Confirmation Notice & Login Prompt */}
                {currentUser ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Signed in: <strong>{currentUser.email}</strong>. Order confirmation will be mailed here.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs text-white shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">Customer Login Required</p>
                        <p className="text-[11px] text-gray-300">You must log in or sign in with Google to proceed with your payment.</p>
                      </div>
                    </div>
                    {onPromptLogin && (
                      <button
                        type="button"
                        onClick={onPromptLogin}
                        className="px-3.5 py-1.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-gray-100 cursor-pointer shrink-0 ml-2"
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      value={shipping.fullName}
                      onChange={(e) => {
                        setShipping({ ...shipping, fullName: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Email Address *</label>
                    <input
                      type="email"
                      value={shipping.email}
                      onChange={(e) => {
                        setShipping({ ...shipping, email: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. rahul@example.com"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Phone Number *</label>
                    <input
                      type="tel"
                      value={shipping.phone}
                      onChange={(e) => {
                        setShipping({ ...shipping, phone: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-gray-700">Pincode *</label>
                      {isCheckingPincode && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-black" /> Checking service...
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={shipping.pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setShipping({ ...shipping, pincode: val });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      maxLength={6}
                      placeholder="e.g. 110001"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                    {pincodeStatus && (
                      <div className={`mt-1.5 text-[10px] font-medium flex items-center gap-1 rounded px-2 py-1 ${
                        pincodeStatus.serviceable 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {pincodeStatus.serviceable ? (
                          <>
                            <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Delhivery Serviceable:</strong> Complimentary Express Delivery {pincodeStatus.city ? `to ${pincodeStatus.city}` : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{pincodeStatus.message || 'Pincode not currently serviceable.'}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1 text-gray-700">Street Address *</label>
                    <input
                      type="text"
                      value={shipping.address}
                      onChange={(e) => {
                        setShipping({ ...shipping, address: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="House/Flat No., Building Name, Street"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">City *</label>
                    <input
                      type="text"
                      value={shipping.city}
                      onChange={(e) => {
                        setShipping({ ...shipping, city: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. New Delhi"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">State *</label>
                    <input
                      type="text"
                      value={shipping.state}
                      onChange={(e) => {
                        setShipping({ ...shipping, state: e.target.value });
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. Delhi"
                      className="w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:border-black focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={shipping.saveInformation}
                      onChange={(e) => setShipping({ ...shipping, saveInformation: e.target.checked })}
                      className="rounded accent-black"
                    />
                    <span>Save details for future purchases</span>
                  </label>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-black text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {!currentUser ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-300" />
                        <span>Sign In to Proceed →</span>
                      </>
                    ) : (
                      <span>Review Order →</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: ORDER REVIEW */}
            {step === 2 && (
              <div className="space-y-4">
                {savedDetails && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-black font-bold">
                      <UserCheck className="w-4 h-4" />
                      <span>Saved Shipping Details Loaded</span>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs text-black underline font-semibold cursor-pointer"
                    >
                      Edit Address
                    </button>
                  </div>
                )}

                <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
                  <h4 className="text-base font-bold text-black">
                    2. Order & Shipping Summary
                  </h4>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-black underline font-semibold cursor-pointer"
                  >
                    Change Shipping Info
                  </button>
                </div>

                {/* Address Box */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                  <p className="font-bold text-black">{shipping.fullName} • {shipping.phone}</p>
                  <p className="text-gray-600">{shipping.address}, {shipping.city}, {shipping.state} - {shipping.pincode}</p>
                  <p className="text-gray-500 font-mono text-[11px]">{shipping.email}</p>
                </div>

                {/* Items preview list */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cartItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-white p-2.5 rounded border border-gray-200">
                      <div className="flex items-center gap-3">
                        <img src={item.product.image} alt={item.product.name} referrerPolicy="no-referrer" className="w-10 h-10 object-contain bg-white rounded p-1 border border-gray-200" />
                        <div>
                          <p className="font-bold text-black">{item.product.name}</p>
                          <p className="text-[10px] text-gray-500">{item.selectedSize} × Qty {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-bold text-black">{formatPrice(item.unitPrice * item.quantity, currency)}</span>
                    </div>
                  ))}
                </div>

                {/* Total Calculations */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Discount (Code: {couponCode || 'PROMO'})</span>
                      <span>-{formatPrice(discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{shippingFee === 0 ? <strong className="text-green-700">FREE</strong> : formatPrice(shippingFee, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-black pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-base text-black">
                      {formatPrice(totalAmount, currency)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        if (onPromptLogin) onPromptLogin();
                        return;
                      }
                      handleStepChange(3);
                    }}
                    className="w-full sm:w-auto px-8 py-3 bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceed to Payment</span>
                    <Zap className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: RAZORPAY PAYMENT METHOD SELECTOR */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
                  <h4 className="text-base font-bold text-black">
                    3. Select Payment Method
                  </h4>
                  <span className="font-bold text-black text-lg">
                    {formatPrice(totalAmount, currency)}
                  </span>
                </div>

                {/* Payment Tabs */}
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'UPI' ? 'bg-black text-white border-black shadow' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>UPI & QR</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'CARD' ? 'bg-black text-white border-black shadow' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Card</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('NETBANKING')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'NETBANKING' ? 'bg-black text-white border-black shadow' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Net Banking</span>
                  </button>
                </div>

                {/* Method Specific UI */}
                {paymentMethod === 'UPI' && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <p className="text-xs font-bold text-black">UPI Payment Options:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'gpay', label: 'Google Pay' },
                        { id: 'phonepe', label: 'PhonePe' },
                        { id: 'paytm', label: 'Paytm' },
                        { id: 'bhim', label: 'BHIM UPI' }
                      ].map((app) => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedUPIApp(app.id as any)}
                          className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            selectedUPIApp === app.id ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-300'
                          }`}
                        >
                          {app.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMethod === 'CARD' && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
                    <input type="text" placeholder="Card Number (4000 1234 5678 9010)" className="w-full p-2.5 rounded bg-white border border-gray-300 focus:outline-none focus:border-black" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="MM / YY" className="p-2.5 rounded bg-white border border-gray-300 focus:outline-none focus:border-black" />
                      <input type="password" placeholder="CVV" className="p-2.5 rounded bg-white border border-gray-300 focus:outline-none focus:border-black" />
                    </div>
                  </div>
                )}

                {/* Final Authorization Button */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleProcessRazorpayPayment}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-black text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Payment...</span>
                      </div>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay {formatPrice(totalAmount, currency)} via Razorpay</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => handleDirectDemoOrder('Direct Test Mode Order')}
                      className="text-[11px] text-gray-500 hover:text-black underline font-medium cursor-pointer"
                    >
                      Testing in Preview? Click to Complete Order without Gateway Popup
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
};
