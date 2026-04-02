export interface Party {
  id?: string;
  name: string;
  gstin: string;
  address: string;
  stateCode: string;
  type: 'customer' | 'vendor';
  createdAt: string;
}

export interface Item {
  id?: string;
  name: string;
  hsn: string;
  price: number;
  gstRate: number;
  createdAt: string;
}

export interface InvoiceItem {
  itemId: string;
  name: string;
  hsn: string;
  price: number;
  quantity: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Payment {
  id?: string;
  date: string;
  amount: number;
  mode: string;
  reference?: string;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  date: string;
  partyId: string;
  partyDetails: Party;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  status: 'pending' | 'partial' | 'paid';
  payments: Payment[];
  isInclusive: boolean;
  isDeleted: boolean;
  estimationId?: string; // Link to the estimation it was converted from
  createdAt: string;
}

export interface Estimation {
  id?: string;
  estimationNumber: string;
  date: string;
  expiryDate?: string;
  partyId: string;
  partyDetails: Party;
  items: InvoiceItem[];
  subtotal: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'converted' | 'expired' | 'declined';
  isInclusive: boolean;
  isDeleted: boolean;
  convertedInvoiceId?: string;
  createdAt: string;
}

export interface Employee {
  id?: string;
  name: string;
  designation: string;
  salary: number;
  phone: string;
  joiningDate: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface EmployeePayment {
  id?: string;
  employeeId: string;
  amount: number;
  type: 'salary' | 'advance';
  date: string;
  remarks: string;
  createdAt: string;
}

export interface Expense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  paymentMode: string;
  createdAt: string;
}

export interface Equipment {
  id?: string;
  name: string;
  serialNumber: string;
  purchaseDate: string;
  purchaseValue: number;
  status: 'active' | 'maintenance' | 'retired';
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  gstin: string;
  address: string;
  stateCode: string;
  nextInvoiceNumber: number;
}
