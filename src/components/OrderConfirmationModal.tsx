import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Calendar, ShoppingBag, Sparkles, X, Mail } from 'lucide-react';
import { Order } from '../types';
import { formatPrice, formatOrderId } from '../utils/helpers';

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
  if (!isOpen || !order) return null;

  const handleDownloadInvoice = () => {
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AMRR Perfumes Tax Invoice - ${formatOrderId(order.id)}</title>
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
            <p><strong>Order ID:</strong> ${formatOrderId(order.id)}<br/><strong>Date:</strong> ${order.createdAt}<br/><strong>Payment ID:</strong> ${order.paymentId}</p>
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
              <span className="font-mono font-bold text-black">{formatOrderId(order.id)}</span>
            </div>

            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Estimated Delivery</span>
              <span className="font-bold text-black flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-black" />
                {order.estimatedDelivery}
              </span>
            </div>

            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Payment ID</span>
              <span className="font-mono text-[11px] text-gray-700">{order.paymentId}</span>
            </div>

            <div>
              <span className="text-gray-500 font-semibold block uppercase text-[10px]">Total Paid</span>
              <span className="font-bold text-black text-sm">
                {formatPrice(order.totalAmount, order.currency as any)}
              </span>
            </div>
          </div>

          {/* Automatic Invoice Dispatched Notice */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Invoice Automatically Sent to Email
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                ✓ Sent
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Your official tax invoice with complete line-item breakdown has been automatically dispatched to: <strong className="font-mono text-emerald-950">{order.shippingDetails?.email}</strong>.
            </p>
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
