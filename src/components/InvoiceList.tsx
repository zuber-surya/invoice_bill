import { useState } from 'react';
import { Invoice, Payment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Search, Plus, FileDown, Eye, Trash2, Copy, Wallet, X, Loader2, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface InvoiceListProps {
  invoices: Invoice[];
  onEdit: (invoice: Invoice) => void;
  onCreateNew: () => void;
}

export function InvoiceList({ invoices, onEdit, onCreateNew }: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.partyDetails.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSoftDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? (Soft Delete)')) {
      try {
        await updateDoc(doc(db, 'invoices', id), { isDeleted: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`);
      }
    }
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setIsSavingPayment(true);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string) || 0;
    const date = formData.get('date') as string;
    const mode = formData.get('mode') as string;

    const newPayment: Payment = { amount, date, mode };
    const newTotalPaid = (selectedInvoice.amountPaid || 0) + amount;
    const newStatus = newTotalPaid >= selectedInvoice.grandTotal ? 'paid' : 'partial';

    try {
      await updateDoc(doc(db, 'invoices', selectedInvoice.id!), {
        payments: arrayUnion(newPayment),
        amountPaid: increment(amount),
        status: newStatus
      });
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${selectedInvoice.id}`);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Invoice #', 'Date', 'Party Name', 'GSTIN', 'Subtotal', 'Total GST', 'Grand Total', 'Paid', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.date,
      inv.partyDetails.name,
      inv.partyDetails.gstin,
      inv.subtotal.toFixed(2),
      inv.totalGst.toFixed(2),
      inv.grandTotal.toFixed(2),
      (inv.amountPaid || 0).toFixed(2),
      inv.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GST_Summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
          <p className="text-xs text-gray-500">Manage and track your generated invoices.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={onCreateNew}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoice or party..."
            className="flex-1 outline-none text-xs font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredInvoices.map((inv) => (
            <div key={inv.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-[10px] text-gray-500">{format(new Date(inv.date), 'dd MMM yyyy')}</p>
                </div>
                <span className={cn(
                  "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                  inv.status === 'paid' ? "bg-green-100 text-green-700" : 
                  inv.status === 'partial' ? "bg-orange-100 text-orange-700" : 
                  "bg-red-100 text-red-700"
                )}>
                  {inv.status}
                </span>
              </div>
              
              <div>
                <p className="text-xs font-bold text-gray-900">{inv.partyDetails.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{inv.partyDetails.gstin || 'No GSTIN'}</p>
              </div>

              <div className="flex justify-between items-end pt-1">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Total / Paid</p>
                  <p className="text-xs font-bold text-gray-900">
                    {formatCurrency(inv.grandTotal)} / <span className="text-green-600">{formatCurrency(inv.amountPaid || 0)}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                    className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleSoftDelete(inv.id!)}
                    className="p-2 text-red-600 bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Invoice #</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Party</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
                <th className="px-4 py-3 font-bold text-right">Paid</th>
                <th className="px-4 py-3 font-bold text-center">Status</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(new Date(inv.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-gray-900">{inv.partyDetails.name}</div>
                    <div className="text-[10px] text-gray-500">{inv.partyDetails.gstin || 'No GSTIN'}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatCurrency(inv.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-green-600">
                    {formatCurrency(inv.amountPaid || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                      inv.status === 'paid' ? "bg-green-100 text-green-700" : 
                      inv.status === 'partial' ? "bg-orange-100 text-orange-700" : 
                      "bg-red-100 text-red-700"
                    )}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                        title="Add Payment"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleSoftDelete(inv.id!)}
                        title="Delete"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="p-4 space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Pending Amount</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(selectedInvoice.grandTotal - (selectedInvoice.amountPaid || 0))}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Amount Received</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                      max={selectedInvoice.grandTotal - (selectedInvoice.amountPaid || 0)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Mode</label>
                  <select
                    name="mode"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isSavingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
