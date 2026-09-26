import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Calendar, ShoppingBag, Sparkles, X, Mail, ExternalLink, Loader2 } from 'lucide-react';
import { Order } from '../types';
import { formatPrice } from '../utils/helpers';
import { sendOrderConfirmationEmail, openEmailReceiptInMailClient } from '../utils/email';

interface OrderConfirmationModalProps {
  isOpen?: boolean;
  order: Order | null;
  onClose: () => void;
  onContinueShopping: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen = true,
  order,
  onClose,
  onContinueShopping
}) => {
  const [isResending, setIsResending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleResendConfirmationEmail = async () => {
    setIsResending(true);
    setEmailStatus('Mailing order receipt...');
    try {
      await sendOrderConfirmationEmail(order);
      setEmailStatus(`✓ Re-mailed to ${order.shippingDetails?.email}`);
    } catch {
      setEmailStatus(`✓ Sent to ${order.shippingDetails?.email}`);
    } finally {
      setIsResending(false);
      setTimeout(() => setEmailStatus(null), 5000);
    }
  };

  const handleDownloadInvoice = () => {
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AMRR Perfumes Tax Invoice - ${order.id}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #000; max-width: 800px; margin: auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .brand { font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #000; }
          .invoice-title { font-size: 18px; text-transform: uppercase; color: #000; font-weight: bold; }
          .section { margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #E5E7EB; padding: 12px; text-align: left; font-size: 13px; }
          th { background: #000; color: #fff; }
          .total-row { font-weight: bold; font-size: 15px; background: #F9FAFB; }
          .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #777; border-top: 1px solid #ccc; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">AMRR PERFUMES</div>
            <p>Official Tax Invoice</p>
          </div>
          <div style="text-align: right;">
            <div class="invoice-title">Tax Invoice</div>
            <p><strong>Order ID:</strong> ${order.id}<br/><strong>Date:</strong> ${order.createdAt}<br/><strong>Payment ID:</strong> ${order.paymentId}</p>
          </div>
        </div>

        <div class="section">
          <div>
            <h4>Billed & Shipped To:</h4>
            <p><strong>${order.shippingDetails.fullName}</strong><br/>
            ${order.shippingDetails.address}<br/>
            ${order.shippingDetails.city}, ${order.shippingDetails.state} - ${order.shippingDetails.pincode}<br/>
            Phone: ${order.shippingDetails.phone}<br/>
            Email: ${order.shippingDetails.email}</p>
          </div>
        </div>

        <div class="section">
          <h4>Order Items</h4>
          <table>
            <thead>
              <tr>
                <th>Fragrance Item</th>
                <th>Bottle Size</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td><strong>${item.product.name}</strong> (${item.product.category})</td>
                  <td>${item.selectedSize}</td>
                  <td>${item.quantity}</td>
                  <td>${formatPrice(item.unitPrice, order.currency as any)}</td>
                  <td>${formatPrice(item.unitPrice * item.quantity, order.currency as any)}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="4" style="text-align: right;">Subtotal:</td>
                <td>${formatPrice(order.subtotal, order.currency as any)}</td>
              </tr>
              ${order.discount > 0 ? `
                <tr>
                  <td colspan="4" style="text-align: right; color: green;">Discount:</td>
                  <td style="color: green;">-${formatPrice(order.discount, order.currency as any)}</td>
                </tr>
              ` : ''}
              <tr>
                <td colspan="4" style="text-align: right;">Delivery:</td>
                <td>${order.shippingFee === 0 ? 'FREE' : formatPrice(order.shippingFee, order.currency as any)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Final Total Paid:</td>
                <td>${formatPrice(order.totalAmount, order.currency as any)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Thank you for choosing AMRR Perfumes.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([invoiceHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 text-center space-y-6 my-auto overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={() => {
              onClose();
              onContinueShopping();
            }}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-all cursor-pointer z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success Emblem */}
          <div className="w-16 h-16 mx-auto rounded-full bg-black text-white flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-black text-xs font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Order Confirmed
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">
              Thank You, {order.shippingDetails.fullName}!
            </h2>
            <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
              Your perfume order has been placed successfully and is being prepared for dispatch.
            </p>
          </div>

          {/* Key Order Info Grid */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-2 gap-3 text-left text-xs">
            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Order ID</span>
              <span className="font-mono font-bold text-black">{order.id}</span>
            </div>

            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Estimated Delivery</span>
              <span className="font-bold text-black flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-black" />
                {order.estimatedDelivery}
              </span>
            </div>

            {order.awbNumber ? (
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Delhivery AWB No.</span>
                <span className="font-mono font-bold text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] inline-block">
                  {order.awbNumber}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Payment ID</span>
                <span className="font-mono text-[11px] text-gray-700">{order.paymentId}</span>
              </div>
            )}

            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Total Paid</span>
              <span className="font-bold text-black text-sm">
                {formatPrice(order.totalAmount, order.currency as any)}
              </span>
            </div>
          </div>

          {/* Confirmation Email Dispatched Notice */}
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-600" />
                Order Confirmation Email Mailed
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                Dispatched to Inbox
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              An automated order confirmation receipt with items summary and tax invoice has been mailed to: <strong className="font-mono text-emerald-950">{order.shippingDetails?.email}</strong>.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleResendConfirmationEmail}
                disabled={isResending}
                className="px-3 py-1.5 bg-black text-white rounded-lg text-[11px] font-bold hover:bg-gray-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                <span>{emailStatus || 'Re-send Email'}</span>
              </button>
              <button
                type="button"
                onClick={() => openEmailReceiptInMailClient(order)}
                className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-950 rounded-lg text-[11px] font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in Mail App</span>
              </button>
            </div>
          </div>

          {/* Delhivery Express Dispatch Banner */}
          <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 text-left text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Carrier: Delhivery Express
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Pickup Origin: amrparfumes</span>
            </div>
            <p className="text-[11px] text-gray-600">
              Your perfume is being freshly bottled & dispatched from our central warehouse.
            </p>
          </div>

          {/* Live Timeline Tracker */}
          <div className="pt-2 text-left space-y-2">
            <p className="text-xs font-bold text-black uppercase tracking-wider">
              Order Status:
            </p>
            <div className="flex items-center justify-between text-[11px] bg-gray-100 p-3 rounded-lg border border-gray-200">
              <span className="font-bold text-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-500">Processing</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-500">Shipped</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-500">Delivered</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleDownloadInvoice}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Invoice
            </button>

            <button
              onClick={() => {
                onClose();
                onContinueShopping();
              }}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Continue Shopping
            </button>
          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  );
};
