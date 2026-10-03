import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Receipt, 
  Plus, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  ArrowRightLeft, 
  PieChart as PieChartIcon, 
  FileText, 
  CreditCard, 
  Building2, 
  Banknote, 
  ShieldCheck, 
  Info, 
  X, 
  Check, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  FinancialAccount, 
  AccountingTransaction, 
  ExpenseItem, 
  AccountTransfer, 
  AccountingDateFilterOption, 
  Order, 
  Product, 
  ExpenseCategory, 
  IncomeCategory,
  PaymentMethodType
} from '../types';
import { 
  saveExpense, 
  deleteExpense, 
  saveAccountTransfer, 
  saveAccountingTransaction, 
  recordRefundInAccounting,
  saveFinancialAccount,
  DEFAULT_FINANCIAL_ACCOUNTS 
} from '../lib/firebase';
import { Currency, formatPrice } from '../utils/helpers';

interface AdminAccountsTabProps {
  orders: Order[];
  products: Product[];
  currency: Currency;
  accounts: FinancialAccount[];
  transactions: AccountingTransaction[];
  expenses: ExpenseItem[];
  transfers: AccountTransfer[];
}

export const AdminAccountsTab: React.FC<AdminAccountsTabProps> = ({
  orders,
  products,
  currency,
  accounts = [],
  transactions = [],
  expenses = [],
  transfers = []
}) => {
  // Navigation Tabs within Accounts module
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'income' | 'expenses' | 'transactions' | 'accounts' | 'pnl' | 'reports'>('overview');

  // Date Filtering State (Default: This Month as required in Section 4)
  const [dateFilter, setDateFilter] = useState<AccountingDateFilterOption>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AccountingTransaction | null>(null);
  const [refundOrderTarget, setRefundOrderTarget] = useState<Order | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<number>(0);
  const [refundReasonInput, setRefundReasonInput] = useState('Customer return / formulation adjustment');
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Packaging' as ExpenseCategory,
    supplier: '',
    amount: '',
    paymentMethod: 'Bank Transfer' as PaymentMethodType,
    accountId: 'acc_bank',
    referenceNumber: '',
    notes: ''
  });

  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Product Sales' as IncomeCategory,
    amount: '',
    paymentMethod: 'Razorpay' as PaymentMethodType,
    accountId: 'acc_razorpay',
    customerName: '',
    notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    date: new Date().toISOString().split('T')[0],
    fromAccountId: 'acc_razorpay',
    toAccountId: 'acc_bank',
    amount: '',
    referenceNumber: '',
    notes: ''
  });

  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as 'bank' | 'cash' | 'razorpay' | 'upi' | 'other',
    openingBalance: '0',
    accountNumber: '',
    bankName: '',
    notes: ''
  });

  // Table filtering & search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'expense' | 'refund' | 'transfer'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  // Chart timeframe toggle (Daily / Weekly / Monthly)
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Helper to determine if a date falls within the selected dateFilter
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return false;
    const target = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'today') {
      return target.toDateString() === now.toDateString();
    }
    if (dateFilter === 'yesterday') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      return target.toDateString() === y.toDateString();
    }
    if (dateFilter === 'this_week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay() || 7;
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      return target >= startOfWeek && target <= now;
    }
    if (dateFilter === 'this_month') {
      return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
    }
    if (dateFilter === 'last_month') {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return target.getFullYear() === year && target.getMonth() === lastMonth;
    }
    if (dateFilter === 'this_year') {
      return target.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate) : new Date(8640000000000000);
      end.setHours(23, 59, 59, 999);
      return target >= start && target <= end;
    }
    return true;
  };

  // Filter transactions based on date
  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter(t => isDateInRange(t.date || t.createdAt));
  }, [transactions, dateFilter, customStartDate, customEndDate]);

  // Aggregate Metrics based on actual database data
  const metrics = useMemo(() => {
    const sales = dateFilteredTransactions.filter(t => t.type === 'sale');
    const exp = dateFilteredTransactions.filter(t => t.type === 'expense');
    const refs = dateFilteredTransactions.filter(t => t.type === 'refund');

    const totalRevenue = sales.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = exp.reduce((sum, t) => sum + t.amount, 0);
    const totalRefunds = refs.reduce((sum, t) => sum + t.amount, 0);
    const totalCogs = sales.reduce((sum, t) => sum + (t.cogs || 0), 0);

    // Paid orders count (deduped by orderId)
    const paidOrderIds = new Set(sales.filter(s => s.orderId).map(s => s.orderId));
    const totalOrdersCount = paidOrderIds.size;

    // Gross Profit = Revenue - COGS - Refunds
    const grossProfit = totalRevenue - totalRefunds - totalCogs;

    // Net Profit = Revenue - Total Refunds - COGS - Operating Expenses
    const netProfit = totalRevenue - totalRefunds - totalCogs - totalExpenses;

    // Current Balances across active accounts
    const effectiveAccounts = accounts.length > 0 ? accounts : DEFAULT_FINANCIAL_ACCOUNTS;
    const cashAcc = effectiveAccounts.find(a => a.type === 'cash');
    const bankAcc = effectiveAccounts.find(a => a.type === 'bank');
    const razorpayAcc = effectiveAccounts.find(a => a.type === 'razorpay');

    const cashBalance = cashAcc ? cashAcc.currentBalance : 0;
    const bankBalance = bankAcc ? bankAcc.currentBalance : 0;
    const razorpayBalance = razorpayAcc ? razorpayAcc.currentBalance : 0;

    return {
      totalRevenue,
      totalOrdersCount,
      totalExpenses,
      totalRefunds,
      totalCogs,
      grossProfit,
      netProfit,
      cashBalance,
      bankBalance,
      razorpayBalance,
      receivables: 0, // In AMRR e-commerce, prepaid orders or 0
      payables: 0     // Unpaid vendor bills if any
    };
  }, [dateFilteredTransactions, accounts]);

  // Filtered transactions for the ledger table
  const tableFilteredTransactions = useMemo(() => {
    return dateFilteredTransactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (paymentFilter !== 'all' && t.paymentMethod !== paymentFilter) return false;
      if (accountFilter !== 'all' && t.accountId !== accountFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchId = (t.id || '').toLowerCase().includes(q);
        const matchOrder = (t.orderId || '').toLowerCase().includes(q);
        const matchCust = (t.customerName || '').toLowerCase().includes(q);
        const matchPay = (t.razorpayPaymentId || '').toLowerCase().includes(q);
        if (!matchDesc && !matchId && !matchOrder && !matchCust && !matchPay) return false;
      }
      return true;
    });
  }, [dateFilteredTransactions, typeFilter, categoryFilter, paymentFilter, accountFilter, searchTerm]);

  // Expenses grouped by Category for Donut / Pie Breakdown
  const expenseCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    const filteredExp = dateFilteredTransactions.filter(t => t.type === 'expense');
    filteredExp.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    const entries = Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      percentage: metrics.totalExpenses > 0 ? (amount / metrics.totalExpenses) * 100 : 0
    }));

    return entries.sort((a, b) => b.amount - a.amount);
  }, [dateFilteredTransactions, metrics.totalExpenses]);

  // Chart data calculation
  const chartData = useMemo(() => {
    const buckets: Record<string, { label: string; sales: number; expenses: number; profit: number }> = {};
    const now = new Date();

    if (chartTimeframe === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
        buckets[key] = { label, sales: 0, expenses: 0, profit: 0 };
      }
    } else if (chartTimeframe === 'weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);
        const key = `Wk ${4 - i}`;
        buckets[key] = { label: key, sales: 0, expenses: 0, profit: 0 };
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', { month: 'short' });
        buckets[key] = { label, sales: 0, expenses: 0, profit: 0 };
      }
    }

    // Populate with real transactions
    transactions.forEach(t => {
      const d = new Date(t.date || t.createdAt);
      let matchKey = '';
      if (chartTimeframe === 'daily') {
        matchKey = d.toISOString().split('T')[0];
      } else if (chartTimeframe === 'weekly') {
        const diffWeeks = Math.floor((now.getTime() - d.getTime()) / (7 * 86400000));
        if (diffWeeks >= 0 && diffWeeks < 4) {
          matchKey = `Wk ${4 - diffWeeks}`;
        }
      } else {
        matchKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (buckets[matchKey]) {
        if (t.type === 'sale') {
          buckets[matchKey].sales += t.amount;
        } else if (t.type === 'expense') {
          buckets[matchKey].expenses += t.amount;
        } else if (t.type === 'refund') {
          buckets[matchKey].sales -= t.amount;
        }
        buckets[matchKey].profit = buckets[matchKey].sales - buckets[matchKey].expenses;
      }
    });

    return Object.values(buckets);
  }, [transactions, chartTimeframe]);

  // Max value in chart for scale
  const maxChartVal = useMemo(() => {
    let max = 0;
    chartData.forEach(d => {
      if (d.sales > max) max = d.sales;
      if (d.expenses > max) max = d.expenses;
      if (Math.abs(d.profit) > max) max = Math.abs(d.profit);
    });
    return max > 0 ? max : 1000;
  }, [chartData]);

  // Handle adding expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }

    const effectiveAccounts = accounts.length > 0 ? accounts : DEFAULT_FINANCIAL_ACCOUNTS;
    const selectedAcc = effectiveAccounts.find(a => a.id === expenseForm.accountId) || effectiveAccounts[1];

    const newExpense: ExpenseItem = {
      id: editingExpense ? editingExpense.id : `exp_${Date.now()}`,
      date: expenseForm.date || new Date().toISOString().split('T')[0],
      description: expenseForm.description.trim() || `${expenseForm.category} Expense`,
      category: expenseForm.category,
      supplier: expenseForm.supplier.trim() || 'Vendor',
      amount: amountNum,
      paymentMethod: expenseForm.paymentMethod,
      accountId: selectedAcc.id,
      accountName: selectedAcc.name,
      referenceNumber: expenseForm.referenceNumber.trim(),
      notes: expenseForm.notes.trim(),
      createdAt: editingExpense ? editingExpense.createdAt : new Date().toISOString()
    };

    await saveExpense(newExpense);
    setIsAddExpenseOpen(false);
    setEditingExpense(null);
    setExpenseForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: 'Packaging',
      supplier: '',
      amount: '',
      paymentMethod: 'Bank Transfer',
      accountId: 'acc_bank',
      referenceNumber: '',
      notes: ''
    });
  };

  // Handle adding manual income
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(incomeForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid income amount greater than 0.');
      return;
    }

    const effectiveAccounts = accounts.length > 0 ? accounts : DEFAULT_FINANCIAL_ACCOUNTS;
    const selectedAcc = effectiveAccounts.find(a => a.id === incomeForm.accountId) || effectiveAccounts[0];

    const newTx: AccountingTransaction = {
      id: `tx_inc_${Date.now()}`,
      date: incomeForm.date || new Date().toISOString().split('T')[0],
      type: 'sale',
      amount: amountNum,
      description: incomeForm.description.trim() || 'Direct Sales Income',
      category: incomeForm.category,
      accountId: selectedAcc.id,
      accountName: selectedAcc.name,
      customerName: incomeForm.customerName.trim() || 'Direct Customer',
      paymentMethod: incomeForm.paymentMethod,
      paymentStatus: 'Completed',
      notes: incomeForm.notes.trim(),
      createdAt: new Date().toISOString()
    };

    await saveAccountingTransaction(newTx);
    // Update account balance
    await saveFinancialAccount({
      ...selectedAcc,
      totalMoneyIn: (selectedAcc.totalMoneyIn || 0) + amountNum,
      currentBalance: (selectedAcc.currentBalance || 0) + amountNum
    });

    setIsAddIncomeOpen(false);
    setIncomeForm({
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: 'Product Sales',
      amount: '',
      paymentMethod: 'Razorpay',
      accountId: 'acc_razorpay',
      customerName: '',
      notes: ''
    });
  };

  // Handle transfer
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(transferForm.amount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid transfer amount greater than 0.');
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('Source and destination accounts must be different.');
      return;
    }

    const effectiveAccounts = accounts.length > 0 ? accounts : DEFAULT_FINANCIAL_ACCOUNTS;
    const fromAcc = effectiveAccounts.find(a => a.id === transferForm.fromAccountId);
    const toAcc = effectiveAccounts.find(a => a.id === transferForm.toAccountId);

    if (!fromAcc || !toAcc) {
      alert('Invalid accounts selected for transfer.');
      return;
    }

    const newTransfer: AccountTransfer = {
      id: `trf_${Date.now()}`,
      date: transferForm.date || new Date().toISOString().split('T')[0],
      fromAccountId: fromAcc.id,
      fromAccountName: fromAcc.name,
      toAccountId: toAcc.id,
      toAccountName: toAcc.name,
      amount: amountNum,
      referenceNumber: transferForm.referenceNumber.trim(),
      notes: transferForm.notes.trim(),
      createdAt: new Date().toISOString()
    };

    await saveAccountTransfer(newTransfer);
    setIsTransferOpen(false);
    setTransferForm({
      date: new Date().toISOString().split('T')[0],
      fromAccountId: 'acc_razorpay',
      toAccountId: 'acc_bank',
      amount: '',
      referenceNumber: '',
      notes: ''
    });
  };

  // Handle refund order
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundOrderTarget) return;

    if (!refundAmountInput || refundAmountInput <= 0 || refundAmountInput > refundOrderTarget.totalAmount) {
      alert(`Please enter a valid refund amount between ₹1 and ₹${refundOrderTarget.totalAmount}`);
      return;
    }

    if (window.confirm(`Confirm processing refund of ₹${refundAmountInput} for Order #${refundOrderTarget.id}?`)) {
      await recordRefundInAccounting(refundOrderTarget, refundAmountInput, refundReasonInput);
      setRefundOrderTarget(null);
      alert(`Refund of ₹${refundAmountInput} successfully recorded.`);
    }
  };

  // Export to CSV
  const handleExportCSV = (reportType: 'transactions' | 'sales' | 'expenses' | 'pnl') => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `AMRR_Accounts_${reportType}_${dateFilter}.csv`;

    if (reportType === 'transactions') {
      headers = ['Date', 'Transaction ID', 'Type', 'Amount', 'Description', 'Category', 'Account', 'Payment Method', 'Status', 'Order ID', 'Customer'];
      rows = tableFilteredTransactions.map(t => [
        t.date,
        t.id,
        t.type.toUpperCase(),
        t.type === 'expense' || t.type === 'refund' ? -t.amount : t.amount,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.accountName,
        t.paymentMethod,
        t.paymentStatus,
        t.orderId || '',
        `"${(t.customerName || '').replace(/"/g, '""')}"`
      ]);
    } else if (reportType === 'sales') {
      headers = ['Date', 'Order ID', 'Customer', 'Category', 'Amount', 'COGS', 'Payment Method', 'Razorpay Payment ID', 'Status'];
      const sales = dateFilteredTransactions.filter(t => t.type === 'sale');
      rows = sales.map(s => [
        s.date,
        s.orderId || s.id,
        `"${(s.customerName || '').replace(/"/g, '""')}"`,
        s.category,
        s.amount,
        s.cogs || 0,
        s.paymentMethod,
        s.razorpayPaymentId || '',
        s.paymentStatus
      ]);
    } else if (reportType === 'expenses') {
      headers = ['Date', 'Expense ID', 'Category', 'Supplier', 'Amount', 'Account', 'Payment Method', 'Reference', 'Description'];
      const exp = dateFilteredTransactions.filter(t => t.type === 'expense');
      rows = exp.map(e => [
        e.date,
        e.id,
        e.category,
        `"${(e.vendorName || '').replace(/"/g, '""')}"`,
        e.amount,
        e.accountName,
        e.paymentMethod,
        e.referenceNumber || '',
        `"${e.description.replace(/"/g, '""')}"`
      ]);
    } else {
      // P&L Statement export
      headers = ['Financial Line Item', 'Amount (INR)'];
      rows = [
        ['Product Sales Revenue', metrics.totalRevenue],
        ['Less: Refunds & Returns', -metrics.totalRefunds],
        ['Net Revenue', metrics.totalRevenue - metrics.totalRefunds],
        ['Less: Cost of Goods Sold (COGS)', -metrics.totalCogs],
        ['Gross Profit', metrics.grossProfit],
        ['Gross Margin %', metrics.totalRevenue > 0 ? `${((metrics.grossProfit / metrics.totalRevenue) * 100).toFixed(1)}%` : '0%'],
        ['Operating Expenses', -metrics.totalExpenses],
        ['Net Profit (EBITDA)', metrics.netProfit],
        ['Net Profit Margin %', metrics.totalRevenue > 0 ? `${((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1)}%` : '0%']
      ];
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  const effectiveAccounts = accounts.length > 0 ? accounts : DEFAULT_FINANCIAL_ACCOUNTS;

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: TOP BAR WITH NAVIGATION & DATE FILTER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        
        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'overview', label: 'Dashboard', icon: Wallet },
            { id: 'income', label: 'Income / Sales', icon: ArrowUpRight },
            { id: 'expenses', label: 'Expenses', icon: ArrowDownRight },
            { id: 'transactions', label: 'Transactions Ledger', icon: Receipt },
            { id: 'accounts', label: 'Accounts & Wallets', icon: Building2 },
            { id: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
            { id: 'reports', label: 'Reports', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent text-black font-semibold outline-none cursor-pointer text-xs"
            >
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs"
              />
            </div>
          )}

          {/* Quick Action Buttons */}
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => setIsTransferOpen(true)}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: TOP FINANCIAL KPI CARDS (Section 2 of brief) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-black">
            ₹{metrics.totalRevenue.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            {metrics.totalOrdersCount} paid orders
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Expenses</span>
            <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-700">
            ₹{metrics.totalExpenses.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            Operational & procurement
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Profit</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${metrics.netProfit >= 0 ? 'bg-black text-amber-400' : 'bg-red-50 text-red-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${metrics.netProfit >= 0 ? 'text-black' : 'text-red-600'}`}>
            ₹{metrics.netProfit.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            Margin: {metrics.totalRevenue > 0 ? `${((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>

        {/* Refunds */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Refunds</span>
            <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-800">
            ₹{metrics.totalRefunds.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            Actual customer returns
          </p>
        </div>

        {/* Bank & Cash Balance Combined */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bank & Cash</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-900">
            ₹{(metrics.bankBalance + metrics.cashBalance).toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            Bank: ₹{metrics.bankBalance.toLocaleString()} • Cash: ₹{metrics.cashBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ZERO DATA / EMPTY STATE NOTICE (Section 3 of brief) */}
      {transactions.length === 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-yellow-50/40 to-amber-50/70 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-xs font-bold">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-amber-950">No transactions yet</h4>
              <p className="text-xs text-amber-900/80 leading-relaxed">
                Your financial activity will appear here when you receive orders or add expenses. As soon as a customer verifies a payment or you log an expense, the dashboard will automatically record and track it.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="px-3.5 py-2 bg-amber-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
            >
              + Log First Expense
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: SUB-TAB CONTENT ROUTER */}

      {/* 1. OVERVIEW DASHBOARD */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts Row: Sales vs Expenses & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales vs Expenses Chart (Section 17) */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-black">Sales vs Expenses</h4>
                  <p className="text-[11px] text-gray-500">Revenue, expenditure and profit trends</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-semibold">
                  <button
                    onClick={() => setChartTimeframe('daily')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${chartTimeframe === 'daily' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-600'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setChartTimeframe('weekly')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${chartTimeframe === 'weekly' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-600'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setChartTimeframe('monthly')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${chartTimeframe === 'monthly' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-600'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Chart Visualizer */}
              {transactions.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <Wallet className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-600">No chart data available</p>
                  <p className="text-[11px] text-gray-400">Transactions will generate dynamic visual trends here</p>
                </div>
              ) : (
                <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-gray-200 px-2">
                  {chartData.map((bar, idx) => {
                    const salesHeight = (bar.sales / maxChartVal) * 100;
                    const expHeight = (bar.expenses / maxChartVal) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] p-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg">
                          <p className="font-bold">{bar.label}</p>
                          <p className="text-emerald-300">Sales: ₹{bar.sales.toLocaleString()}</p>
                          <p className="text-rose-300">Exp: ₹{bar.expenses.toLocaleString()}</p>
                        </div>

                        <div className="w-full flex items-end justify-center gap-1.5 h-44">
                          <div 
                            style={{ height: `${Math.max(salesHeight, 4)}%` }} 
                            className="w-3.5 bg-emerald-500 rounded-t-sm transition-all"
                            title={`Sales: ₹${bar.sales}`}
                          />
                          <div 
                            style={{ height: `${Math.max(expHeight, 4)}%` }} 
                            className="w-3.5 bg-rose-500 rounded-t-sm transition-all"
                            title={`Expenses: ₹${bar.expenses}`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 truncate max-w-[45px]">{bar.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-gray-600 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>Revenue / Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span>Expenses</span>
                </div>
              </div>
            </div>

            {/* Expense Breakdown (Section 18) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div>
                <h4 className="text-sm font-bold text-black">Expense Breakdown</h4>
                <p className="text-[11px] text-gray-500">Distribution by operational category</p>
              </div>

              {expenseCategoryBreakdown.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <PieChartIcon className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-600">No expenses recorded</p>
                  <p className="text-[11px] text-gray-400">Expense categories will form breakdown here</p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {expenseCategoryBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-800">{item.category}</span>
                        <span className="text-black">₹{item.amount.toLocaleString()} ({item.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${item.percentage}%` }}
                          className={`h-full ${
                            idx % 4 === 0 ? 'bg-black' :
                            idx % 4 === 1 ? 'bg-amber-500' :
                            idx % 4 === 2 ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel (Section 22) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-black">Accounting Quick Actions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <button
                onClick={() => setIsAddIncomeOpen(true)}
                className="p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-black">+ Add Income</span>
              </button>

              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-black">+ Add Expense</span>
              </button>

              <button
                onClick={() => setIsTransferOpen(true)}
                className="p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-black">Transfer Money</span>
              </button>

              <button
                onClick={() => setActiveSubTab('transactions')}
                className="p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-800 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-black">View Transactions</span>
              </button>

              <button
                onClick={() => setActiveSubTab('pnl')}
                className="p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-black">Profit & Loss</span>
              </button>

              <button
                onClick={() => setActiveSubTab('reports')}
                className="p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center text-center gap-1.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-black">Reports & CSV</span>
              </button>
            </div>
          </div>

          {/* Recent Financial Transactions Preview */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-black">Recent Journal Entries</h4>
                <p className="text-[11px] text-gray-500">Latest recorded transactions</p>
              </div>
              <button
                onClick={() => setActiveSubTab('transactions')}
                className="text-xs font-bold text-black hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({transactions.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.slice(0, 5).map(t => (
                      <tr 
                        key={t.id} 
                        onClick={() => setSelectedTransaction(t)}
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                            t.type === 'sale' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            t.type === 'expense' ? 'bg-red-50 text-red-800 border border-red-200' :
                            t.type === 'refund' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                            'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-black max-w-[200px] truncate">{t.description}</td>
                        <td className="py-2.5 px-3 text-gray-600">{t.category}</td>
                        <td className="py-2.5 px-3 text-gray-500 text-[11px]">{t.accountName}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          t.type === 'sale' ? 'text-emerald-700' :
                          t.type === 'expense' || t.type === 'refund' ? 'text-red-700' :
                          'text-blue-700'
                        }`}>
                          {t.type === 'sale' ? '+' : t.type === 'expense' || t.type === 'refund' ? '-' : ''}
                          ₹{t.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INCOME / SALES (Section 5) */}
      {activeSubTab === 'income' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-black">Sales & Verified Income</h3>
              <p className="text-xs text-gray-500">Real verified customer orders synced automatically</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('sales')}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-gray-700"
              >
                <Download className="w-3.5 h-3.5" /> Export Sales CSV
              </button>
              <button
                onClick={() => setIsAddIncomeOpen(true)}
                className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Income
              </button>
            </div>
          </div>

          {/* Sales Table */}
          {dateFilteredTransactions.filter(t => t.type === 'sale').length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-700">No Sales Recorded Yet</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                When customer payments are verified through Razorpay or checkout, they will automatically be cataloged as accounting sales.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Order / Tx ID</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dateFilteredTransactions.filter(t => t.type === 'sale').map(s => {
                    const linkedOrder = orders.find(o => o.id === s.orderId);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{new Date(s.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setSelectedTransaction(s)}
                            className="font-mono text-black font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{s.orderId ? `#${s.orderId}` : s.id}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </button>
                        </td>
                        <td className="py-3 px-3 font-medium text-black">
                          <p>{s.customerName || 'Customer'}</p>
                          {s.customerEmail && <span className="text-[10px] text-gray-400 font-normal">{s.customerEmail}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-gray-100 text-gray-700 font-medium">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-800">{s.paymentMethod}</p>
                          {s.razorpayPaymentId && (
                            <span className="font-mono text-[10px] text-gray-400" title={s.razorpayPaymentId}>
                              {s.razorpayPaymentId.slice(0, 14)}...
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-600 text-[11px]">{s.accountName}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                          +₹{s.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {linkedOrder && (
                            <button
                              onClick={() => {
                                setRefundOrderTarget(linkedOrder);
                                setRefundAmountInput(linkedOrder.totalAmount);
                              }}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-semibold cursor-pointer"
                              title="Process a customer refund"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. EXPENSES (Section 10) */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-black">Operating & Materials Expenses</h3>
              <p className="text-xs text-gray-500">Track packaging, oils, bottles, rent, and ads</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportCSV('expenses')}
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-gray-700"
              >
                <Download className="w-3.5 h-3.5" /> Export Expenses CSV
              </button>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Expense
              </button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-700">No Expenses Logged</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Log purchases of raw perfume oils, bottles, boxes, shipping costs, and advertising to track net profits.
              </p>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Log Expense Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Supplier / Vendor</th>
                    <th className="py-3 px-3">Payment Method</th>
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 font-semibold text-black">
                        {exp.description}
                        {exp.referenceNumber && (
                          <span className="block text-[10px] text-gray-400 font-normal">Ref: {exp.referenceNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-red-50 text-red-800 border border-red-100 font-medium">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-700">{exp.supplier || '—'}</td>
                      <td className="py-3 px-3 text-gray-600">{exp.paymentMethod}</td>
                      <td className="py-3 px-3 text-gray-500 text-[11px]">{exp.accountName}</td>
                      <td className="py-3 px-3 text-right font-black text-red-700 text-sm">
                        -₹{exp.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingExpense(exp);
                              setExpenseForm({
                                date: exp.date,
                                description: exp.description,
                                category: exp.category as ExpenseCategory,
                                supplier: exp.supplier,
                                amount: String(exp.amount),
                                paymentMethod: exp.paymentMethod as PaymentMethodType,
                                accountId: exp.accountId,
                                referenceNumber: exp.referenceNumber || '',
                                notes: exp.notes || ''
                              });
                              setIsAddExpenseOpen(true);
                            }}
                            className="p-1 hover:bg-gray-100 text-gray-600 rounded transition-colors cursor-pointer"
                            title="Edit expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete expense "${exp.description}" of ₹${exp.amount}?`)) {
                                await deleteExpense(exp.id, exp.amount, exp.accountId);
                              }
                            }}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. MASTER TRANSACTIONS LEDGER (Section 13) */}
      {activeSubTab === 'transactions' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-black">Master Journal Ledger</h3>
              <p className="text-xs text-gray-500">Every financial transaction, debit, credit and transfer</p>
            </div>
            <button
              onClick={() => handleExportCSV('transactions')}
              className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-gray-700"
            >
              <Download className="w-3.5 h-3.5" /> Export Ledger CSV
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-200">
            {/* Search */}
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions, orders, Razorpay IDs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-black"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="sale">Sales (+)</option>
              <option value="expense">Expenses (-)</option>
              <option value="refund">Refunds (-)</option>
              <option value="transfer">Transfers</option>
            </select>

            {/* Payment method filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="all">All Payment Methods</option>
              <option value="Razorpay">Razorpay</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
            </select>

            {/* Account filter */}
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {effectiveAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Transactions Table */}
          {tableFilteredTransactions.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-700">No Transactions Found</h4>
              <p className="text-xs text-gray-400">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableFilteredTransactions.map(tx => (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedTransaction(tx)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-700 truncate max-w-[100px]">{tx.id}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                          tx.type === 'sale' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          tx.type === 'expense' ? 'bg-red-50 text-red-800 border border-red-200' :
                          tx.type === 'refund' ? 'bg-gray-100 text-gray-800 border border-gray-200' :
                          'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-black max-w-[200px] truncate">{tx.description}</td>
                      <td className="py-3 px-3 text-gray-600">{tx.category}</td>
                      <td className="py-3 px-3 text-gray-600">{tx.paymentMethod}</td>
                      <td className="py-3 px-3 text-gray-500 text-[11px]">{tx.accountName}</td>
                      <td className={`py-3 px-3 text-right font-black text-sm ${
                        tx.type === 'sale' ? 'text-emerald-700' :
                        tx.type === 'expense' || tx.type === 'refund' ? 'text-red-700' :
                        'text-blue-700'
                      }`}>
                        {tx.type === 'sale' ? '+' : tx.type === 'expense' || tx.type === 'refund' ? '-' : ''}
                        ₹{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800">
                          {tx.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. ACCOUNTS & WALLETS (Section 11) */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-black">Payment Accounts & Wallets</h3>
              <p className="text-xs text-gray-500">Track balances across Razorpay, Bank Accounts, and Cash register</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTransferOpen(true)}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Money
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {effectiveAccounts.map(acc => (
              <div key={acc.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-800">
                    {acc.type === 'bank' ? <Building2 className="w-4 h-4 text-blue-600" /> :
                     acc.type === 'cash' ? <Banknote className="w-4 h-4 text-emerald-600" /> :
                     acc.type === 'razorpay' ? <CreditCard className="w-4 h-4 text-purple-600" /> :
                     <Wallet className="w-4 h-4 text-amber-600" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    {acc.type}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-black">{acc.name}</h4>
                  <p className="text-[11px] text-gray-500 font-normal">{acc.notes || 'Operating account'}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Balance</span>
                  <p className="text-2xl font-black text-black">₹{(acc.currentBalance || 0).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-100 text-gray-600">
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase">Money In</span>
                    <span className="font-bold text-emerald-700">+₹{(acc.totalMoneyIn || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 block uppercase">Money Out</span>
                    <span className="font-bold text-red-700">-₹{(acc.totalMoneyOut || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. PROFIT & LOSS STATEMENT (Section 16) */}
      {activeSubTab === 'pnl' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-black">Profit & Loss Statement (P&L)</h3>
              <p className="text-xs text-gray-500">Calculated strictly from real database records (Revenue - COGS - Expenses)</p>
            </div>
            <button
              onClick={() => handleExportCSV('pnl')}
              className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-gray-700 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Export P&L Statement
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Revenue */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-sm text-black border-b border-gray-200 pb-1">
                <span>REVENUE</span>
                <span>₹{metrics.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Product Sales (Verified Orders)</span>
                  <span>₹{metrics.totalRevenue.toLocaleString()}</span>
                </div>
                {metrics.totalRefunds > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Less: Customer Returns & Refunds</span>
                    <span>-₹{metrics.totalRefunds.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-black border-t border-gray-100 pt-1">
                  <span>Net Revenue</span>
                  <span>₹{(metrics.totalRevenue - metrics.totalRefunds).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 2. COGS */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between font-bold text-sm text-black border-b border-gray-200 pb-1">
                <span>COST OF GOODS SOLD (COGS)</span>
                <span>-₹{metrics.totalCogs.toLocaleString()}</span>
              </div>
              <div className="pl-4 space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Direct Product Essence & Bottle Costs</span>
                  <span>₹{metrics.totalCogs.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 3. Gross Profit */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex justify-between items-center text-black font-black text-sm">
              <span>GROSS PROFIT</span>
              <div className="text-right">
                <span>₹{metrics.grossProfit.toLocaleString()}</span>
                <span className="block text-[10px] text-gray-500 font-normal">
                  Margin: {metrics.totalRevenue > 0 ? `${((metrics.grossProfit / metrics.totalRevenue) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* 4. Operating Expenses */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between font-bold text-sm text-black border-b border-gray-200 pb-1">
                <span>OPERATING EXPENSES</span>
                <span>-₹{metrics.totalExpenses.toLocaleString()}</span>
              </div>
              {expenseCategoryBreakdown.length === 0 ? (
                <p className="pl-4 text-gray-400 italic">No operating expenses recorded for this period.</p>
              ) : (
                <div className="pl-4 space-y-1 text-gray-700">
                  {expenseCategoryBreakdown.map((cat, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{cat.category}</span>
                      <span>₹{cat.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Net Profit */}
            <div className="p-4 rounded-xl bg-black text-white flex justify-between items-center font-black text-base shadow-md">
              <div className="space-y-0.5">
                <span>NET PROFIT</span>
                <span className="block text-[10px] text-gray-400 font-normal">
                  Formula: Revenue - Refunds - COGS - Operating Expenses
                </span>
              </div>
              <div className="text-right">
                <span className="text-amber-400 text-xl font-black">₹{metrics.netProfit.toLocaleString()}</span>
                <span className="block text-[10px] text-gray-300 font-normal">
                  Net Margin: {metrics.totalRevenue > 0 ? `${((metrics.netProfit / metrics.totalRevenue) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. REPORTS & CSV EXPORTS (Section 19 & 20) */}
      {activeSubTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sales Report Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              <h4 className="font-bold text-sm text-black">Sales Report</h4>
            </div>
            <p className="text-xs text-gray-500">Gross sales, total orders count, refunds, and average order value (AOV).</p>
            <div className="space-y-1.5 text-xs text-gray-700 pt-1 border-t border-gray-100">
              <div className="flex justify-between">
                <span>Total Orders:</span>
                <span className="font-bold text-black">{metrics.totalOrdersCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Gross Sales:</span>
                <span className="font-bold text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Refunds:</span>
                <span className="font-bold text-red-600">-₹{metrics.totalRefunds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Order Value:</span>
                <span className="font-bold text-black">
                  ₹{metrics.totalOrdersCount > 0 ? Math.round(metrics.totalRevenue / metrics.totalOrdersCount).toLocaleString() : '0'}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleExportCSV('sales')}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              <Download className="w-3.5 h-3.5" /> Download Sales CSV
            </button>
          </div>

          {/* Expense Report Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-sm text-black">Expense Report</h4>
            </div>
            <p className="text-xs text-gray-500">Detailed line-item spending across raw perfume oils, bottles, and marketing.</p>
            <div className="space-y-1.5 text-xs text-gray-700 pt-1 border-t border-gray-100">
              <div className="flex justify-between">
                <span>Total Expenses Logged:</span>
                <span className="font-bold text-red-700">₹{metrics.totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Expense Entries:</span>
                <span className="font-bold text-black">{expenses.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Top Spending Category:</span>
                <span className="font-bold text-black">{expenseCategoryBreakdown[0]?.category || 'None'}</span>
              </div>
            </div>
            <button
              onClick={() => handleExportCSV('expenses')}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              <Download className="w-3.5 h-3.5" /> Download Expenses CSV
            </button>
          </div>

          {/* Profit & Loss Report Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <h4 className="font-bold text-sm text-black">Profit & Loss Report</h4>
            </div>
            <p className="text-xs text-gray-500">Executive financial performance summary with gross and net margins.</p>
            <div className="space-y-1.5 text-xs text-gray-700 pt-1 border-t border-gray-100">
              <div className="flex justify-between">
                <span>Gross Profit:</span>
                <span className="font-bold text-emerald-700">₹{metrics.grossProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Operating Expenses:</span>
                <span className="font-bold text-red-700">₹{metrics.totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Profit:</span>
                <span className="font-bold text-black">₹{metrics.netProfit.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => handleExportCSV('pnl')}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              <Download className="w-3.5 h-3.5" /> Download P&L CSV
            </button>
          </div>

          {/* Cash Flow Report Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-sm text-black">Cash Flow Report</h4>
            </div>
            <p className="text-xs text-gray-500">Liquid liquidity across Bank, Razorpay, Cash and UPI accounts.</p>
            <div className="space-y-1.5 text-xs text-gray-700 pt-1 border-t border-gray-100">
              <div className="flex justify-between">
                <span>Bank Account:</span>
                <span className="font-bold text-blue-700">₹{metrics.bankBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Razorpay Gateway:</span>
                <span className="font-bold text-purple-700">₹{metrics.razorpayBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash in Hand:</span>
                <span className="font-bold text-emerald-700">₹{metrics.cashBalance.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => handleExportCSV('transactions')}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
            >
              <Download className="w-3.5 h-3.5" /> Download Cash Flow Ledger
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT EXPENSE MODAL */}
      {/* ========================================================= */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base">{editingExpense ? 'Edit Expense' : 'Log Operating Expense'}</h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddExpenseOpen(false);
                  setEditingExpense(null);
                }} 
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Amount (INR) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="e.g. 1500"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                >
                  <option value="Perfume Oil">Perfume Oil</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Bottles">Bottles</option>
                  <option value="Caps">Caps</option>
                  <option value="Pumps">Pumps</option>
                  <option value="Labels">Labels</option>
                  <option value="Stickers">Stickers</option>
                  <option value="Boxes">Boxes</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Instagram Ads">Instagram Ads</option>
                  <option value="Website">Website</option>
                  <option value="Domain">Domain</option>
                  <option value="Software">Software</option>
                  <option value="Salary">Salary</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Rent">Rent</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 Luxury Fluted Black Caps for 50ml flacons"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. French Essence Labs"
                    value={expenseForm.supplier}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Paid From Account</label>
                  <select
                    value={expenseForm.accountId}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                  >
                    {effectiveAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethodType }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Razorpay">Razorpay / Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Invoice / Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-081"
                    value={expenseForm.referenceNumber}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or receipt tracking details..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddExpenseOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer font-bold"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD INCOME MODAL */}
      {/* ========================================================= */}
      {isAddIncomeOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">Record Income</h3>
              </div>
              <button onClick={() => setIsAddIncomeOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Date *</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Amount (INR) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="e.g. 2999"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Category *</label>
                <select
                  value={incomeForm.category}
                  onChange={(e) => setIncomeForm(prev => ({ ...prev, category: e.target.value as IncomeCategory }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                >
                  <option value="Product Sales">Product Sales</option>
                  <option value="Shipping Income">Shipping Income</option>
                  <option value="Other Income">Other Income</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pop-up Boutique sale / Wholesale order"
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Patron Name"
                    value={incomeForm.customerName}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Deposit To Account</label>
                  <select
                    value={incomeForm.accountId}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                  >
                    {effectiveAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Payment Method</label>
                <select
                  value={incomeForm.paymentMethod}
                  onChange={(e) => setIncomeForm(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethodType }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                >
                  <option value="Razorpay">Razorpay Gateway</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddIncomeOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer font-bold"
                >
                  Record Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: MONEY TRANSFER MODAL (Section 12) */}
      {/* ========================================================= */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base">Internal Money Transfer</h3>
              </div>
              <button onClick={() => setIsTransferOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <span>Transfers rebalance accounts (e.g. Razorpay → Bank) and are strictly excluded from Revenue, Expenses, and Profit calculations.</span>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">From Account (Debit) *</label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, fromAccountId: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                >
                  {effectiveAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Balance: ₹{a.currentBalance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">To Account (Credit) *</label>
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, toAccountId: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none cursor-pointer"
                >
                  {effectiveAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (Balance: ₹{a.currentBalance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Amount (INR) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Date *</label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Reference / UTR #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-984210"
                  value={transferForm.referenceNumber}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional details..."
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer font-bold"
                >
                  Transfer Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: TRANSACTION DETAILS MODAL (Section 14) */}
      {/* ========================================================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-black" />
                <h3 className="font-bold text-base">Transaction Details</h3>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Transaction Amount</span>
                  <span className={`text-2xl font-black ${
                    selectedTransaction.type === 'sale' ? 'text-emerald-700' :
                    selectedTransaction.type === 'expense' || selectedTransaction.type === 'refund' ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {selectedTransaction.type === 'sale' ? '+' : selectedTransaction.type === 'expense' || selectedTransaction.type === 'refund' ? '-' : ''}
                    ₹{selectedTransaction.amount.toLocaleString()}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedTransaction.type === 'sale' ? 'bg-emerald-100 text-emerald-900' :
                  selectedTransaction.type === 'expense' ? 'bg-red-100 text-red-900' :
                  selectedTransaction.type === 'refund' ? 'bg-gray-200 text-gray-900' :
                  'bg-blue-100 text-blue-900'
                }`}>
                  {selectedTransaction.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Transaction ID</span>
                  <span className="font-mono text-gray-800 break-all">{selectedTransaction.id}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Date</span>
                  <span className="font-medium text-black">{new Date(selectedTransaction.date).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-medium text-black">{selectedTransaction.category}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Account</span>
                  <span className="font-medium text-black">{selectedTransaction.accountName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-medium text-black">{selectedTransaction.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-emerald-700">{selectedTransaction.paymentStatus}</span>
                </div>
              </div>

              {selectedTransaction.orderId && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-500">Linked Order ID:</span>
                    <span className="font-bold text-black font-mono">#{selectedTransaction.orderId}</span>
                  </div>
                  {selectedTransaction.customerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer:</span>
                      <span className="text-black font-medium">{selectedTransaction.customerName}</span>
                    </div>
                  )}
                  {selectedTransaction.razorpayPaymentId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Razorpay Payment ID:</span>
                      <span className="font-mono text-gray-800">{selectedTransaction.razorpayPaymentId}</span>
                    </div>
                  )}
                  {selectedTransaction.cogs !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Direct Product Cost (COGS):</span>
                      <span className="font-medium text-black">₹{selectedTransaction.cogs.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedTransaction.notes && (
                <div className="space-y-0.5">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Notes</span>
                  <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-gray-200">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: REFUND ORDER MODAL (Section 9) */}
      {/* ========================================================= */}
      {refundOrderTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white text-black rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-base">Process Order Refund</h3>
              </div>
              <button onClick={() => setRefundOrderTarget(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID:</span>
                  <span className="font-bold text-black font-mono">#{refundOrderTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Original Total:</span>
                  <span className="font-bold text-black">₹{refundOrderTarget.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="text-black font-medium">{refundOrderTarget.shippingDetails?.fullName}</span>
                </div>
              </div>

              <form onSubmit={handleProcessRefund} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Refund Amount (INR) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    max={refundOrderTarget.totalAmount}
                    value={refundAmountInput}
                    onChange={(e) => setRefundAmountInput(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black font-bold outline-none"
                  />
                  <span className="text-[10px] text-gray-400">Supports full or partial refunds up to ₹{refundOrderTarget.totalAmount}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block">Refund Reason</label>
                  <input
                    type="text"
                    required
                    value={refundReasonInput}
                    onChange={(e) => setRefundReasonInput(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg text-black outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setRefundOrderTarget(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    Confirm Refund
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
