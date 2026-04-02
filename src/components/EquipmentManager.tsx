import { useState } from 'react';
import { Equipment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, X, HardDrive, Calendar, Tag, Loader2, AlertCircle } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';

interface EquipmentManagerProps {
  equipments: Equipment[];
}

export function EquipmentManager({ equipments }: EquipmentManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredEquipments = equipments.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const equipmentData = {
      name: formData.get('name') as string,
      serialNumber: formData.get('serialNumber') as string,
      purchaseDate: formData.get('purchaseDate') as string,
      purchaseValue: parseFloat(formData.get('purchaseValue') as string) || 0,
      status: formData.get('status') as 'active' | 'maintenance' | 'retired',
      createdAt: new Date().toISOString()
    };

    try {
      if (editingEquipment) {
        await updateDoc(doc(db, 'equipments', editingEquipment.id!), equipmentData);
      } else {
        await addDoc(collection(db, 'equipments'), equipmentData);
      }
      setIsModalOpen(false);
      setEditingEquipment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'equipments');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Equipments</h2>
          <p className="text-xs text-gray-500">Track company assets and their status.</p>
        </div>
        <button
          onClick={() => {
            setEditingEquipment(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Equipment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search equipment or serial number..."
            className="flex-1 outline-none text-xs font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredEquipments.map((eq) => (
            <div key={eq.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{eq.name}</p>
                    <p className="text-[10px] text-gray-500">SN: {eq.serialNumber || 'N/A'}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                  eq.status === 'active' ? "bg-green-100 text-green-700" : 
                  eq.status === 'maintenance' ? "bg-orange-100 text-orange-700" : 
                  "bg-red-100 text-red-700"
                )}>
                  {eq.status}
                </span>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Value / Date</p>
                  <p className="text-xs font-bold text-gray-900">
                    {formatCurrency(eq.purchaseValue)} <span className="text-gray-400 font-medium text-[10px]">on {format(new Date(eq.purchaseDate), 'dd MMM yy')}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingEquipment(eq); setIsModalOpen(true); }}
                    className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Delete this equipment?')) {
                        try {
                          await deleteDoc(doc(db, 'equipments', eq.id!));
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, `equipments/${eq.id}`);
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
          {filteredEquipments.length === 0 && (
            <p className="p-8 text-center text-xs text-gray-400 italic font-medium">No equipment found</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Equipment</th>
                <th className="px-4 py-3 font-bold">Serial Number</th>
                <th className="px-4 py-3 font-bold">Purchase Date</th>
                <th className="px-4 py-3 font-bold text-right">Value</th>
                <th className="px-4 py-3 font-bold text-center">Status</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEquipments.map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-gray-900">{eq.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{eq.serialNumber || 'N/A'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(new Date(eq.purchaseDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatCurrency(eq.purchaseValue)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                      eq.status === 'active' ? "bg-green-100 text-green-700" : 
                      eq.status === 'maintenance' ? "bg-orange-100 text-orange-700" : 
                      "bg-red-100 text-red-700"
                    )}>
                      {eq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => { setEditingEquipment(eq); setIsModalOpen(true); }}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Delete this equipment?')) {
                            try {
                              await deleteDoc(doc(db, 'equipments', eq.id!));
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `equipments/${eq.id}`);
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
                {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Equipment Name *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingEquipment?.name}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    placeholder="e.g. Laptop, Printer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Serial Number</label>
                  <input
                    name="serialNumber"
                    defaultValue={editingEquipment?.serialNumber}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    placeholder="SN-123456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Purchase Value *</label>
                    <input
                      name="purchaseValue"
                      type="number"
                      required
                      defaultValue={editingEquipment?.purchaseValue}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Status *</label>
                    <select
                      name="status"
                      required
                      defaultValue={editingEquipment?.status || "active"}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Purchase Date</label>
                  <input
                    name="purchaseDate"
                    type="date"
                    required
                    defaultValue={editingEquipment?.purchaseDate || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
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
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingEquipment ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
