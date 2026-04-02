import { useState } from 'react';
import { Estimation } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Search, Plus, FileDown, Eye, Trash2, FileText, X, Loader2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface EstimationListProps {
  estimations: Estimation[];
  onEdit: (estimation: Estimation) => void;
  onCreateNew: () => void;
  onConvert: (estimation: Estimation) => void;
}

export function EstimationList({ estimations, onEdit, onCreateNew, onConvert }: EstimationListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEstimations = estimations.filter(est => 
    est.estimationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    est.partyDetails.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSoftDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this estimation?')) {
      try {
        await updateDoc(doc(db, 'estimations', id), { isDeleted: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `estimations/${id}`);
      }
    }
  };

  const updateStatus = async (id: string, status: Estimation['status']) => {
    try {
      await updateDoc(doc(db, 'estimations', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `estimations/${id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Estimations</h2>
          <p className="text-xs text-gray-500">Quotes and proforma invoices for potential customers.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCreateNew}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Estimation
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search estimation or party..."
            className="flex-1 outline-none text-xs font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredEstimations.map((est) => (
            <div key={est.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-900">{est.estimationNumber}</p>
                  <p className="text-[10px] text-gray-500">{format(new Date(est.date), 'dd MMM yyyy')}</p>
                </div>
                <span className={cn(
                  "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                  est.status === 'converted' ? "bg-green-100 text-green-700" : 
                  est.status === 'sent' ? "bg-blue-100 text-blue-700" : 
                  est.status === 'declined' ? "bg-red-100 text-red-700" :
                  est.status === 'expired' ? "bg-gray-100 text-gray-700" :
                  "bg-orange-100 text-orange-700"
                )}>
                  {est.status}
                </span>
              </div>
              
              <div>
                <p className="text-xs font-bold text-gray-900">{est.partyDetails.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{est.partyDetails.gstin || 'No GSTIN'}</p>
              </div>

              <div className="flex justify-between items-end pt-1">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Grand Total</p>
                  <p className="text-xs font-bold text-gray-900">{formatCurrency(est.grandTotal)}</p>
                </div>
                <div className="flex gap-1">
                  {est.status !== 'converted' && (
                    <button 
                      onClick={() => onConvert(est)}
                      className="p-2 text-green-600 bg-green-50 rounded-lg"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => onEdit(est)}
                    className="p-2 text-gray-600 bg-gray-50 rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => handleSoftDelete(est.id!)}
                    className="p-2 text-red-600 bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredEstimations.length === 0 && (
            <p className="p-8 text-center text-xs text-gray-400 italic font-medium">No estimations found</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Estimation #</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Party</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
                <th className="px-4 py-3 font-bold text-center">Status</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEstimations.map((est) => (
                <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-gray-900">{est.estimationNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(new Date(est.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-gray-900">{est.partyDetails.name}</div>
                    <div className="text-[10px] text-gray-500">{est.partyDetails.gstin || 'No GSTIN'}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatCurrency(est.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                      est.status === 'converted' ? "bg-green-100 text-green-700" : 
                      est.status === 'sent' ? "bg-blue-100 text-blue-700" : 
                      est.status === 'declined' ? "bg-red-100 text-red-700" :
                      est.status === 'expired' ? "bg-gray-100 text-gray-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {est.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {est.status !== 'converted' && (
                        <button 
                          onClick={() => onConvert(est)}
                          title="Convert to Invoice"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => onEdit(est)}
                        title="Edit"
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleSoftDelete(est.id!)}
                        title="Delete"
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEstimations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic text-xs">
                    No estimations found.
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
