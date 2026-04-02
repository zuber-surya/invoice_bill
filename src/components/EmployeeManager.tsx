import { useState } from 'react';
import { Employee, EmployeePayment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, X, Wallet, History, Loader2, UserCircle, Phone, Calendar, CreditCard } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, query, where, onSnapshot, orderBy, arrayUnion, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';

interface EmployeeManagerProps {
  employees: Employee[];
}

export function EmployeeManager({ employees }: EmployeeManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const employeeData = {
      name: formData.get('name') as string,
      designation: formData.get('designation') as string,
      salary: parseFloat(formData.get('salary') as string) || 0,
      phone: formData.get('phone') as string,
      joiningDate: formData.get('joiningDate') as string,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id!), employeeData);
      } else {
        await addDoc(collection(db, 'employees'), employeeData);
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'employees');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string) || 0;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'salary' | 'advance';
    const remarks = formData.get('remarks') as string;

    const payment: EmployeePayment = {
      employeeId: selectedEmployee.id!,
      amount,
      date,
      type,
      remarks,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'employeePayments'), payment);
      setIsPaymentModalOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'employeePayments');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Employees</h2>
          <p className="text-xs text-gray-500">Manage staff, salaries, and advances.</p>
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-50 flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or designation..."
            className="flex-1 outline-none text-xs font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{emp.name}</p>
                    <p className="text-[10px] text-gray-500">{emp.designation}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Salary</p>
                  <p className="text-xs font-bold text-gray-900">{formatCurrency(emp.salary)}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {emp.phone || 'No phone'}
                </p>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setSelectedEmployee(emp); setIsPaymentModalOpen(true); }}
                    className="p-2 text-blue-600 bg-blue-50 rounded-lg"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                    className="p-2 text-gray-600 bg-gray-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Delete this employee?')) {
                        try {
                          await updateDoc(doc(db, 'employees', emp.id!), { isDeleted: true });
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `employees/${emp.id}`);
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
          {filteredEmployees.length === 0 && (
            <p className="p-8 text-center text-xs text-gray-400 italic font-medium">No employees found</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-[10px] uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Employee</th>
                <th className="px-4 py-3 font-bold">Designation</th>
                <th className="px-4 py-3 font-bold text-right">Salary</th>
                <th className="px-4 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <UserCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900">{emp.name}</div>
                        <div className="text-[10px] text-gray-500">{emp.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{emp.designation}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-900">
                    {formatCurrency(emp.salary)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => { setSelectedEmployee(emp); setIsPaymentModalOpen(true); }}
                        title="Record Payment"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Delete this employee?')) {
                            try {
                              await updateDoc(doc(db, 'employees', emp.id!), { isDeleted: true });
                            } catch (error) {
                              handleFirestoreError(error, OperationType.UPDATE, `employees/${emp.id}`);
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Full Name *</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingEmployee?.name}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Designation *</label>
                  <input
                    name="designation"
                    required
                    defaultValue={editingEmployee?.designation}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Monthly Salary *</label>
                    <input
                      name="salary"
                      type="number"
                      required
                      defaultValue={editingEmployee?.salary}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Phone</label>
                    <input
                      name="phone"
                      defaultValue={editingEmployee?.phone}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Joining Date</label>
                  <input
                    name="joiningDate"
                    type="date"
                    defaultValue={editingEmployee?.joiningDate || format(new Date(), 'yyyy-MM-dd')}
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
                  {editingEmployee ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedEmployee && (
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
                <p className="text-[10px] font-bold text-blue-600 uppercase">Employee</p>
                <p className="text-sm font-bold text-blue-900">{selectedEmployee.name}</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Amount *</label>
                    <input
                      name="amount"
                      type="number"
                      required
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Type *</label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    >
                      <option value="salary">Salary</option>
                      <option value="advance">Advance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Date *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Remarks</label>
                  <input
                    name="remarks"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    placeholder="e.g. March Salary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
