import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Plus, 
  MessageCircle, 
  Mail, 
  Tag, 
  Send, 
  Sparkles, 
  X, 
  Phone, 
  ShoppingBag, 
  MapPin, 
  Calendar,
  CheckCheck,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { CustomerLead, CustomerLeadSource } from '../types';
import { saveCustomerLead } from '../lib/firebase';

interface AdminCustomersTabProps {
  customers: CustomerLead[];
}

export const AdminCustomersTab: React.FC<AdminCustomersTabProps> = ({ customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | CustomerLeadSource>('all');
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [copiedPhones, setCopiedPhones] = useState(false);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    notes: '',
    optedInOffers: true
  });
  const [addCustomerError, setAddCustomerError] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Send Offer Drafter Modal
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLead | null>(null);
  const [selectedOfferType, setSelectedOfferType] = useState<'new_arrival' | 'discount' | 'vip_sample'>('new_arrival');
  const [customMessageText, setCustomMessageText] = useState('');
  const [copiedOfferText, setCopiedOfferText] = useState(false);

  // Deletion confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    if (sourceFilter !== 'all' && c.source !== sourceFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q);
      const matchCity = (c.city || '').toLowerCase().includes(q);
      const matchNotes = (c.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchNotes) return false;
    }
    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (customers.length === 0) {
      alert('No customer records to export.');
      return;
    }

    const headers = [
      'Name',
      'Email/Gmail',
      'Phone/WhatsApp',
      'City',
      'State',
      'Total Orders',
      'Total Spent (INR)',
      'Source',
      'Subscribed to Offers',
      'Joined Date',
      'Notes'
    ];

    const rows = customers.map((c) => [
      `"${(c.name || 'Customer').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.state || '').replace(/"/g, '""')}"`,
      c.totalOrders || 0,
      c.totalSpent || 0,
      `"${(c.source || 'unknown').replace(/"/g, '""')}"`,
      c.optedInOffers ? 'Yes' : 'No',
      `"${c.createdAt || ''}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `amrr_customer_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy all Gmails / Emails
  const handleCopyAllEmails = () => {
    const emails = Array.from(
      new Set(
        customers
          .map(c => c.email?.trim())
          .filter((e): e is string => Boolean(e && e.includes('@') && e !== 'not provided'))
      )
    );

    if (emails.length === 0) {
      alert('No email addresses recorded yet.');
      return;
    }

    const text = emails.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 3000);
  };

  // Copy all Phone Numbers
  const handleCopyAllPhones = () => {
    const phones = Array.from(
      new Set(
        customers
          .map(c => c.phone?.trim())
          .filter((p): p is string => Boolean(p && p.length >= 7))
      )
    );

    if (phones.length === 0) {
      alert('No phone numbers recorded yet.');
      return;
    }

    const text = phones.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedPhones(true);
    setTimeout(() => setCopiedPhones(false), 3000);
  };

  // Save new customer
  const handleSaveCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.email.trim() && !newCustomer.phone.trim()) {
      setAddCustomerError('Please provide at least a Gmail address or Phone number.');
      return;
    }

    setIsSavingCustomer(true);
    setAddCustomerError(null);

    try {
      await saveCustomerLead({
        name: newCustomer.name.trim() || 'Patron',
        email: newCustomer.email.trim().toLowerCase(),
        phone: newCustomer.phone.trim(),
        city: newCustomer.city.trim(),
        state: newCustomer.state.trim(),
        source: 'manual_admin',
        optedInOffers: newCustomer.optedInOffers,
        notes: newCustomer.notes.trim() || 'Manually registered customer'
      });

      setIsAddModalOpen(false);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        notes: '',
        optedInOffers: true
      });
    } catch (err: any) {
      setAddCustomerError(err?.message || 'Failed to save customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Open Offer Drafter
  const handleOpenOfferDrafter = (customer: CustomerLead) => {
    setSelectedCustomer(customer);
    const firstName = customer.name && customer.name !== 'Customer' ? customer.name : 'Valued Patron';

    let initialText = '';
    if (selectedOfferType === 'new_arrival') {
      initialText = `Hello ${firstName}! AMRR Perfumes is delighted to announce our latest limited-batch Extrait de Parfum release. As an esteemed client, you have priority access before the public release. Experience the new formulation at: https://amrr.in`;
    } else if (selectedOfferType === 'discount') {
      initialText = `Exclusive AMRR Privé Offer for ${firstName}: Enjoy a private 15% VIP discount on your next order with secret code 'PRIVEE15' at checkout. Complimentary express shipping included across India: https://amrr.in`;
    } else {
      initialText = `Hello ${firstName}! Order your favorite AMRR 50ml flacon today and receive a complimentary 5ml luxury discovery sample. View our artisanal collection: https://amrr.in`;
    }

    setCustomMessageText(initialText);
    setIsOfferModalOpen(true);
  };

  const handleSelectOfferTemplate = (type: 'new_arrival' | 'discount' | 'vip_sample') => {
    setSelectedOfferType(type);
    const firstName = selectedCustomer?.name && selectedCustomer.name !== 'Customer' 
      ? selectedCustomer.name 
      : 'Valued Patron';

    if (type === 'new_arrival') {
      setCustomMessageText(`Hello ${firstName}! AMRR Perfumes is delighted to announce our latest limited-batch Extrait de Parfum release. As an esteemed client, you have priority access before the public release. Experience the new formulation at: https://amrr.in`);
    } else if (type === 'discount') {
      setCustomMessageText(`Exclusive AMRR Privé Offer for ${firstName}: Enjoy a private 15% VIP discount on your next order with secret code 'PRIVEE15' at checkout. Complimentary express shipping included across India: https://amrr.in`);
    } else {
      setCustomMessageText(`Hello ${firstName}! Order your favorite AMRR 50ml flacon today and receive a complimentary 5ml luxury discovery sample. View our artisanal collection: https://amrr.in`);
    }
  };

  // Clean phone for WhatsApp
  const cleanPhoneForWhatsApp = (rawPhone?: string) => {
    if (!rawPhone) return '';
    const digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.length === 10) return '91' + digits;
    return digits;
  };

  // Launch WhatsApp
  const handleLaunchWhatsApp = (phone?: string, text?: string) => {
    const formatted = cleanPhoneForWhatsApp(phone);
    if (!formatted) {
      alert('No valid phone number for this customer.');
      return;
    }
    const message = text || `Hello ${selectedCustomer?.name || 'Customer'}! Greetings from AMRR Perfumes.`;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Launch Gmail Compose
  const handleLaunchEmail = (email?: string, text?: string) => {
    if (!email || !email.includes('@')) {
      alert('No valid email address for this customer.');
      return;
    }
    const subject = encodeURIComponent('AMRR Perfumes - Exclusive Client Privé Offer');
    const body = encodeURIComponent(text || 'Dear Valued Patron,\n\nGreetings from AMRR Perfumes.\n\nWarm regards,\nAMRR Perfumes Concierge\namrrparfumes@gmail.com\nhttps://amrr.in');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
    const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed) {
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    }
  };

  const emailCount = customers.filter(c => c.email && c.email.includes('@')).length;
  const phoneCount = customers.filter(c => c.phone && c.phone.length >= 7).length;
  const orderCount = customers.filter(c => (c.totalOrders || 0) > 0).length;
  const offersCount = customers.filter(c => c.optedInOffers).length;

  return (
    <div className="space-y-5">
      {/* Permanent CRM Data Storage Protection Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50/80 border border-emerald-200/90 rounded-xl px-4 py-3 text-xs text-emerald-950 font-medium shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Permanent Cloud CRM Storage:</strong> All customer contact records, Gmails, phone numbers, and orders are permanently stored in Firestore database and protected against deletion.
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1 rounded-full shrink-0 shadow-xs self-start sm:self-auto">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
          Cloud Synchronized
        </span>
      </div>

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total CRM Patrons</span>
            <Users className="w-4 h-4 text-black" />
          </div>
          <p className="text-2xl font-bold text-black">{customers.length}</p>
          <span className="text-[10px] text-gray-500">{orderCount} completed purchases</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gmail / Email Contacts</span>
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{emailCount}</p>
          <span className="text-[10px] text-gray-500">Ready for Gmail campaigns</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp Numbers</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{phoneCount}</p>
          <span className="text-[10px] text-gray-500">Ready for WhatsApp offers</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Offer Subscribed</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{offersCount}</p>
          <span className="text-[10px] text-gray-500">Opted in for new drops</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, Gmail, phone number, city, or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-black placeholder-gray-400 focus:outline-none focus:border-black"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyAllEmails}
            className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-gray-700 shadow-sm"
            title="Copy all customer emails separated by comma to paste into Gmail BCC"
          >
            {copiedEmails ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied {emailCount} Gmails!</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Copy All Gmails</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyAllPhones}
            className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-gray-700 shadow-sm"
            title="Copy all customer phone numbers to paste into WhatsApp broadcast"
          >
            {copiedPhones ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied {phoneCount} Numbers!</span>
              </>
            ) : (
              <>
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copy All Numbers</span>
              </>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-gray-700 shadow-sm"
            title="Download full customer spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Export CSV / Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSourceFilter('all')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            sourceFilter === 'all'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Patrons ({customers.length})
        </button>

        <button
          onClick={() => setSourceFilter('order_checkout')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            sourceFilter === 'order_checkout'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Order Checkouts ({customers.filter(c => c.source === 'order_checkout').length})
        </button>

        <button
          onClick={() => setSourceFilter('account_login')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            sourceFilter === 'account_login'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Account Logins ({customers.filter(c => c.source === 'account_login').length})
        </button>

        <button
          onClick={() => setSourceFilter('newsletter_vip')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            sourceFilter === 'newsletter_vip'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          VIP Privé Signups ({customers.filter(c => c.source === 'newsletter_vip').length})
        </button>

        <button
          onClick={() => setSourceFilter('contact_inquiry')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            sourceFilter === 'contact_inquiry'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inquiries & Feedback ({customers.filter(c => c.source === 'contact_inquiry').length})
        </button>

        <button
          onClick={() => setSourceFilter('manual_admin')}
          className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            sourceFilter === 'manual_admin'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Manual / DM ({customers.filter(c => c.source === 'manual_admin').length})
        </button>
      </div>

      {/* Customer Directory Table */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-16 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-gray-200 text-gray-400">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-black">No customer records found</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            {searchTerm
              ? 'No customer contact matches your current search keywords.'
              : 'Customers placing orders, logging into their accounts, or subscribing to VIP offers will automatically be recorded here.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            + Add First Customer
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-black border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Patron Name</th>
                <th className="py-3 px-4">Gmail / Email</th>
                <th className="py-3 px-4">WhatsApp / Mobile</th>
                <th className="py-3 px-4">Orders & Spent</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Offers</th>
                <th className="py-3 px-4 text-right">Marketing Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => {
                const cleanPhone = cleanPhoneForWhatsApp(customer.phone);
                return (
                  <tr key={customer.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Customer Name */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-black text-xs">{customer.name || 'Patron'}</p>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4">
                      {customer.email ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-gray-800 text-[11px] truncate max-w-[170px]" title={customer.email}>
                            {customer.email}
                          </span>
                          <button
                            onClick={() => handleLaunchEmail(customer.email)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors cursor-pointer"
                            title="Compose email to customer"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4">
                      {customer.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-gray-800 text-[11px]">
                            {customer.phone}
                          </span>
                          {cleanPhone && (
                            <button
                              onClick={() => handleLaunchWhatsApp(customer.phone)}
                              className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors cursor-pointer"
                              title="Chat or send offer on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Orders & Total Spent */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-black">
                          {customer.totalOrders ? `${customer.totalOrders} order${customer.totalOrders > 1 ? 's' : ''}` : '0 orders'}
                        </span>
                        {customer.totalSpent ? (
                          <p className="text-[11px] text-emerald-700 font-semibold">₹{customer.totalSpent.toLocaleString()}</p>
                        ) : null}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4">
                      {customer.city ? (
                        <span className="text-[11px] text-gray-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          {customer.city}{customer.state ? `, ${customer.state}` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          customer.source === 'order_checkout'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : customer.source === 'account_login'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : customer.source === 'newsletter_vip'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {customer.source === 'order_checkout'
                          ? 'Checkout'
                          : customer.source === 'account_login'
                          ? 'Login'
                          : customer.source === 'newsletter_vip'
                          ? 'VIP Privé'
                          : customer.source === 'contact_inquiry'
                          ? 'Inquiry'
                          : 'Manual'}
                      </span>
                    </td>

                    {/* Offers Status */}
                    <td className="py-3 px-4">
                      {customer.optedInOffers ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> Subscribed
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Unsubscribed</span>
                      )}
                    </td>

                    {/* Marketing Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenOfferDrafter(customer)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Compose and send marketing offer via WhatsApp or Gmail"
                        >
                          <Sparkles className="w-3 h-3 text-black" />
                          <span>Send Offer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: ADD NEW CUSTOMER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base">Register Customer Contact</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {addCustomerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{addCustomerError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCustomerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Zayd Khan"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Gmail / Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mobile / WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 94002 66085"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Kozhikode"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Kerala"
                    value={newCustomer.state}
                    onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notes / Fragrance Preferences</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Inquired on Instagram about Khael Valley and Royal Amber"
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-black resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newCustomer.optedInOffers}
                  onChange={(e) => setNewCustomer({ ...newCustomer, optedInOffers: e.target.checked })}
                  className="accent-black rounded"
                />
                <span className="text-gray-700 font-semibold">Subscribed to Receive Offers & New Drops</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-5 py-2 bg-black text-white rounded-xl font-bold hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingCustomer ? 'Saving...' : 'Save to CRM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND MARKETING OFFER DRAFTER */}
      {isOfferModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-base">Send Offer to {selectedCustomer.name || 'Customer'}</h3>
                  <p className="text-[11px] text-gray-500 font-mono">
                    {selectedCustomer.phone ? `WhatsApp: ${selectedCustomer.phone}` : ''} 
                    {selectedCustomer.email ? ` • Gmail: ${selectedCustomer.email}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOfferModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Choose Offer Template</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectOfferTemplate('new_arrival')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    selectedOfferType === 'new_arrival'
                      ? 'border-black bg-black text-white shadow-xs'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <p className="truncate">✦ New Arrival Drop</p>
                  <span className="text-[9px] opacity-75 font-normal block">Exclusive priority alert</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOfferTemplate('discount')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    selectedOfferType === 'discount'
                      ? 'border-black bg-black text-white shadow-xs'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <p className="truncate">🏷 15% VIP Discount</p>
                  <span className="text-[9px] opacity-75 font-normal block">Secret code PRIVEE15</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectOfferTemplate('vip_sample')}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                    selectedOfferType === 'vip_sample'
                      ? 'border-black bg-black text-white shadow-xs'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <p className="truncate">🎁 Free Sample Gift</p>
                  <span className="text-[9px] opacity-75 font-normal block">5ml discovery flacon</span>
                </button>
              </div>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 block">Offer Message Text</label>
              <textarea
                rows={5}
                value={customMessageText}
                onChange={(e) => setCustomMessageText(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs text-black leading-relaxed focus:outline-none focus:border-black resize-none"
              />
            </div>

            {/* One-click Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customMessageText);
                  setCopiedOfferText(true);
                  setTimeout(() => setCopiedOfferText(false), 2500);
                }}
                className="w-full sm:w-auto px-3.5 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedOfferText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Message!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedCustomer.email && (
                  <button
                    type="button"
                    onClick={() => handleLaunchEmail(selectedCustomer.email, customMessageText)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send via Gmail</span>
                  </button>
                )}

                {selectedCustomer.phone && (
                  <button
                    type="button"
                    onClick={() => handleLaunchWhatsApp(selectedCustomer.phone, customMessageText)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send on WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
