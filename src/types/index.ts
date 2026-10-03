export type FragranceCategory = 'Extrait de Parfum' | 'Eau de Parfum' | 'Perfume Oil' | 'Attar' | 'Cologne' | string;
export type ProductCategory = FragranceCategory;
export type FragranceFamily = 'Woody Oud' | 'Fresh Aquatic' | 'Oriental Floral' | 'Spicy Amber' | 'Gourmand Citrus' | 'Solar Amber Floral' | 'Regal Musk' | 'Fresh Citrus Oud' | 'Warm Spicy Amber' | string;
export type BottleSize = '50 ml' | '100 ml' | '10 ml' | string;

export interface FragranceNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface ProductReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  userPhoto?: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: FragranceCategory;
  family: FragranceFamily;
  shortDescription: string;
  story: string;
  price50ml: number;
  originalPrice50ml?: number;
  costPrice?: number;
  availableSizes?: BottleSize[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity: number;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isLimitedEdition?: boolean;
  image: string;
  gallery: string[];
  notes: FragranceNotes;
  longevity: number; // 1-5
  projection: number; // 1-5
  sillage: 'Intense' | 'Enveloping' | 'Subtle' | 'Moderate';
  gender: 'Unisex' | 'Masculine' | 'Feminine';
  season: string[];
  occasion: string[];
  concentration: string;
  ingredients: string;
  reviews: ProductReview[];
}

export interface CartItem {
  product: Product;
  selectedSize: BottleSize;
  quantity: number;
  unitPrice: number;
}

export interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  saveInformation?: boolean;
}

export interface Order {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  razorpayOrderId?: string;
  shippingDetails: ShippingDetails;
  status: 'Confirmed' | 'Processing' | 'Manifested' | 'Shipped' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  estimatedDelivery: string;
  giftWrapped?: boolean;
  giftMessage?: string;
  // Delhivery Logistics Integration Fields
  awbNumber?: string;
  delhiveryStatus?: string;
  delhiveryStatusDetails?: string;
  delhiveryPickupLocation?: string;
  delhiveryShipmentCreatedAt?: string;
  delhiveryTrackingUrl?: string;
  delhiveryError?: string;
  delhiveryServiceable?: boolean;
  emailConfirmationSent?: boolean;
  emailSentTo?: string;
  emailSentAt?: string;
}

export interface DelhiveryPincodeResponse {
  success: boolean;
  serviceable: boolean;
  pincode: string;
  district?: string;
  city?: string;
  state?: string;
  prepaidAvailable?: boolean;
  codAvailable?: boolean;
  isOda?: boolean;
  message?: string;
  raw?: any;
}

export interface DelhiveryRateResponse {
  success: boolean;
  chargeableWeightGrams?: number;
  shippingCharge: number;
  grossAmount?: number;
  taxAmount?: number;
  isComplimentary?: boolean;
  message?: string;
}

export interface DelhiveryShipmentResponse {
  success: boolean;
  awbNumber?: string;
  orderId: string;
  pickupLocation: string;
  status: string;
  message: string;
  packagesCount?: number;
  raw?: any;
  error?: string;
}

export interface DelhiveryScanEvent {
  scanDateTime: string;
  scanType: string;
  scan: string;
  location: string;
  instructions?: string;
}

export interface DelhiveryTrackingResponse {
  success: boolean;
  awbNumber?: string;
  orderId?: string;
  currentStatus: string;
  statusType?: string;
  statusLocation?: string;
  statusDateTime?: string;
  statusInstructions?: string;
  expectedDelivery?: string;
  pickupDate?: string;
  origin?: string;
  destination?: string;
  scans: DelhiveryScanEvent[];
  raw?: any;
  error?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  isLoggedIn: boolean;
  savedAddresses: ShippingDetails[];
  wishlistIds: string[];
  orders: Order[];
}

export interface CustomerInboxMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  source: 'contact_support' | 'feedback';
  createdAt: string;
  read: boolean;
  replied?: boolean;
}

export type CustomerLeadSource = 'order_checkout' | 'account_login' | 'newsletter_vip' | 'contact_inquiry' | 'manual_admin';

export interface CustomerLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: CustomerLeadSource;
  optedInOffers: boolean;
  totalOrders: number;
  totalSpent: number;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  lastActiveAt: string;
}

export interface SiteVisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  lastVisitAt: string;
  lastVisitDate?: string;
  deviceCounts?: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  recentVisits?: {
    id: string;
    timestamp: string;
    device: 'Mobile' | 'Desktop' | 'Tablet';
    page: string;
    referrer?: string;
  }[];
}

// ==========================================
// ACCOUNTS & FINANCIAL ACCOUNTING TYPES
// ==========================================

export type FinancialAccountType = 'razorpay' | 'bank' | 'cash' | 'upi' | 'other';

export interface FinancialAccount {
  id: string;
  name: string;
  type: FinancialAccountType;
  openingBalance: number;
  currentBalance: number;
  totalMoneyIn: number;
  totalMoneyOut: number;
  accountNumber?: string;
  bankName?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'sale' | 'expense' | 'refund' | 'transfer';

export type IncomeCategory = 'Product Sales' | 'Shipping Income' | 'Other Income';

export type ExpenseCategory = 
  | 'Perfume Oil'
  | 'Raw Materials'
  | 'Bottles'
  | 'Caps'
  | 'Pumps'
  | 'Labels'
  | 'Stickers'
  | 'Boxes'
  | 'Packaging'
  | 'Shipping'
  | 'Marketing'
  | 'Instagram Ads'
  | 'Website'
  | 'Domain'
  | 'Software'
  | 'Salary'
  | 'Electricity'
  | 'Rent'
  | 'Other';

export type PaymentMethodType = 'Razorpay' | 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';

export interface AccountingTransaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: IncomeCategory | ExpenseCategory | 'Transfer' | string;
  accountId: string;
  accountName: string;
  toAccountId?: string;
  toAccountName?: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  vendorName?: string;
  paymentMethod: PaymentMethodType | string;
  paymentStatus: 'Completed' | 'Pending' | 'Failed' | 'Refunded';
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  referenceNumber?: string;
  notes?: string;
  cogs?: number; // Cost of goods sold for this transaction
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory | string;
  supplier: string;
  amount: number;
  paymentMethod: PaymentMethodType | string;
  accountId: string;
  accountName: string;
  referenceNumber?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface AccountTransfer {
  id: string;
  date: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export type AccountingDateFilterOption = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

