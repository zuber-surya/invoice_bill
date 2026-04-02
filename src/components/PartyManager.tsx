import { useState } from 'react';
import { Party, Invoice } from '../types';
import { STATE_CODES, formatCurrency, cn } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, X, Eye, ArrowLeft, Receipt, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';

interface PartyManagerProps {
  parties: Party[];
  invoices: Invoice[];
}

export function PartyManager({ parties, invoices }: PartyManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const partyData = {
      name: formData.get('name') as string,
      gstin: formData.get('gstin') as string,
      address: formData.get('address') as string,
      stateCode: formData.get('stateCode') as string,
      type: formData.get('type') as 'customer' | 'vendor',
      createdAt: new Date().toISOString()
    };

    try {
      if (editingParty) {
        await updateDoc(doc(db, 'parties', editingParty.id!), partyData);
      } else {
        await addDoc(collection(db, 'parties'), partyData);
      }
      setIsModalOpen(false);
      setEditingParty(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'parties');
    }
  };

  if (selectedParty) {
    const partyInvoices = invoices.filter(inv => inv.partyId === selectedParty.id);
    const totalBilled = partyInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = partyInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalPending = totalBilled - totalPaid;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedParty(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{selectedParty.name}</h2>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{selectedParty.gstin || 'No GSTIN'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Billed</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalBilled)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-1">
            <p className="text-[10px] font-bold text-green-400 uppercase">Total Received</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-1">
            <p className="text-[10px] font-bold text-orange-400 uppercase">Outstanding</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totalPending)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              Invoice History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Invoice #</th>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold text-right">Amount</th>
                  <th className="px-4 py-3 font-bold text-right">Paid</th>
                  <th className="px-4 py-3 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {partyInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {format(new Date(inv.date), 'dd MMM yyyy')}
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
                  </tr>
                ))}
                {partyInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic text-xs">
                      No invoices found for this party.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Parties</h2>
          <p className="text-xs text-gray-500">Manage your customers and vendors.</p>
        </div>
        <button
          onClick={() => {
            setEditingParty(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Party
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or GSTIN..."
            className="flex-1 outline-none text-xs font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredParties.map((party) => (
            <div key={party.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <button 
                  onClick={() => setSelectedParty(party)}
                  className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
                >
                  {party.name}
                </button>
                <span className={cn(
                  "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                  party.type === 'customer' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                )}>
                  {party.type}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-500">{party.gstin || 'No GSTIN'}</p>
                  <p className="text-[10px] text-gray-400">{STATE_CODES[party.stateCode]}</p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setSelectedParty(party)}
                    className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => {
                      setEditingParty(party);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-600 bg-gray-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Delete this party?')) {
                        try {
                          await deleteDoc(doc(db, 'parties', party.id!));
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, `parties/${party.id}`);
                        }
                      }
                    }}
                    className="p-2 text-red-600 bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredParties.length === 0 && (
            <p className="p-8 text-center text-xs text-gray-400 italic font-medium">No parties found</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">GSTIN</th>
                <th className="px-4 py-3 font-bold">State</th>
                <th className="px-4 py-3 font-bold text-center">Type</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredParties.map((party) => (
                <tr key={party.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => setSelectedParty(party)}
                      className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
                    >
                      {party.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{party.gstin || 'N/A'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {STATE_CODES[party.stateCode]} ({party.stateCode})
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                      party.type === 'customer' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    )}>
                      {party.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => setSelectedParty(party)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingParty(party);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Delete this party?')) {
                            try {
                              await deleteDoc(doc(db, 'parties', party.id!));
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `parties/${party.id}`);
                            }
                          }
                        }}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {editingParty ? 'Edit Party' : 'Add New Party'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Party Name *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingParty?.name}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">GSTIN</label>
                  <input
                    name="gstin"
                    defaultValue={editingParty?.gstin}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">State Code *</label>
                    <select
                      name="stateCode"
                      required
                      defaultValue={editingParty?.stateCode || "27"}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    >
                      {Object.entries(STATE_CODES).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Type *</label>
                    <select
                      name="type"
                      required
                      defaultValue={editingParty?.type || "customer"}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
                  <textarea
                    name="address"
                    rows={2}
                    defaultValue={editingParty?.address}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs resize-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  {editingParty ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
