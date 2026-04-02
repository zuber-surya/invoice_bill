import { useState } from 'react';
import { Expense } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, X, Receipt, Calendar, Tag, Loader2, Filter } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';

interface ExpenseManagerProps {
  expenses: Expense[];
}

export function ExpenseManager({ expenses }: ExpenseManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['Office', 'Travel', 'Food', 'Equipment', 'Marketing', 'Utilities', 'Other'];

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const expenseData = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string) || 0,
      date: formData.get('date') as string,
      category: formData.get('category') as string,
      paymentMode: formData.get('paymentMode') as string,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id!), expenseData);
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'expenses');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
          <p className="text-xs text-gray-500">Track your business spending and overheads.</p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="flex-1 outline-none text-xs font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="outline-none text-xs font-bold text-gray-600 bg-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-900">{exp.description}</p>
                  <p className="text-[10px] text-gray-500">{format(new Date(exp.date), 'dd MMM yyyy')}</p>
                </div>
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {exp.category}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Amount / Mode</p>
                  <p className="text-xs font-bold text-red-600">
                    {formatCurrency(exp.amount)} <span className="text-gray-400 font-medium text-[10px]">via {exp.paymentMode}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingExpense(exp); setIsModalOpen(true); }}
                    className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Delete this expense?')) {
                        try {
                          await deleteDoc(doc(db, 'expenses', exp.id!));
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, `expenses/${exp.id}`);
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
          {filteredExpenses.length === 0 && (
            <p className="p-8 text-center text-xs text-gray-400 italic font-medium">No expenses found</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Description</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold text-right">Amount</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(new Date(exp.date), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-gray-900">{exp.description}</div>
                    <div className="text-[10px] text-gray-500">{exp.paymentMode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-red-600">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => { setEditingExpense(exp); setIsModalOpen(true); }}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Delete this expense?')) {
                            try {
                              await deleteDoc(doc(db, 'expenses', exp.id!));
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `expenses/${exp.id}`);
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
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Description *</label>
                  <input
                    name="description"
                    required
                    defaultValue={editingExpense?.description}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    placeholder="e.g. Office Stationery"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Amount *</label>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingExpense?.amount}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Category *</label>
                    <select
                      name="category"
                      required
                      defaultValue={editingExpense?.category || "Office"}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Date *</label>
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={editingExpense?.date || format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Mode</label>
                    <select
                      name="paymentMode"
                      required
                      defaultValue={editingExpense?.paymentMode || "Cash"}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
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
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingExpense ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
