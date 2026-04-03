import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { Party, Item, Invoice, InvoiceItem, BusinessSettings } from '../types';
import { formatCurrency, STATE_CODES, cn } from '../lib/utils';
import { Plus, Trash2, Save, FileDown, Image as ImageIcon, ArrowLeft, Loader2, UserPlus, PackagePlus } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { InvoicePreview } from './InvoicePreview';
import { QuickPartyModal } from './QuickPartyModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoiceFormProps {
  parties: Party[];
  items: Item[];
  settings: BusinessSettings | null;
  onSuccess: () => void;
  initialData?: Partial<Invoice>;
}

export function InvoiceForm({ parties, items, settings, onSuccess, initialData }: InvoiceFormProps) {
  const [selectedParty, setSelectedParty] = useState<Party | null>(initialData?.partyDetails || null);
  const [invoiceDate, setInvoiceDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
  const [lineItems, setLineItems] = useState<InvoiceItem[]>(initialData?.items || []);
  const [isInclusive, setIsInclusive] = useState(initialData?.isInclusive || false);
  const [roundOff, setRoundOff] = useState(initialData?.roundOff || 0);
  const [amountPaid, setAmountPaid] = useState(initialData?.amountPaid || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settings && !initialData?.invoiceNumber) {
      setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    }
  }, [settings, initialData]);

  const partyOptions = parties.map(p => ({
    value: p.id,
    label: `${p.name} (${p.gstin || 'No GSTIN'})`,
    data: p
  }));

  const itemOptions = items.map(i => ({
    value: i.id,
    label: `${i.name} - ₹${i.price} (${i.gstRate}%)`,
    data: i
  }));

  const addLineItem = (item?: Item) => {
    const newItem: InvoiceItem = {
      itemId: item?.id || '',
      name: item?.name || '',
      hsn: item?.hsn || '',
      price: item?.price || 0,
      quantity: 1,
      gstRate: item?.gstRate || 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (index: number, updates: Partial<InvoiceItem>) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    const item = updatedItems[index];
    const qty = item.quantity || 0;
    const price = item.price || 0;
    const rate = item.gstRate || 0;
    
    let baseAmount = price * qty;
    let gstAmount = 0;

    if (isInclusive) {
      const basePrice = price / (1 + rate / 100);
      baseAmount = basePrice * qty;
      gstAmount = (price * qty) - baseAmount;
    } else {
      gstAmount = (baseAmount * rate) / 100;
    }

    const isInterState = selectedParty && settings && selectedParty.stateCode !== settings.stateCode;

    if (isInterState) {
      item.igst = gstAmount;
      item.cgst = 0;
      item.sgst = 0;
    } else {
      item.igst = 0;
      item.cgst = gstAmount / 2;
      item.sgst = gstAmount / 2;
    }

    item.total = baseAmount + gstAmount;
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => {
    const rate = item.gstRate || 0;
    const total = item.total || 0;
    const base = total / (1 + rate / 100);
    return sum + base;
  }, 0);

  const totalGst = lineItems.reduce((sum, item) => sum + (item.cgst + item.sgst + item.igst), 0);
  const grandTotalRaw = subtotal + totalGst;
  const grandTotal = Math.round(grandTotalRaw + roundOff);

  const handleSave = async () => {
    if (!selectedParty || lineItems.length === 0 || !settings) {
      alert('Please select a party and add at least one item.');
      return;
    }

    setIsSaving(true);
    try {
      const status = amountPaid >= grandTotal ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
      
      const invoiceData: Omit<Invoice, 'id'> = {
        invoiceNumber,
        date: invoiceDate,
        partyId: selectedParty.id!,
        partyDetails: selectedParty,
        items: lineItems,
        subtotal,
        totalGst,
        roundOff,
        grandTotal,
        amountPaid,
        status,
        isInclusive,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        payments: amountPaid > 0 ? [{
          id: Date.now().toString(),
          date: invoiceDate,
          amount: amountPaid,
          mode: 'Cash',
          reference: 'Initial Payment'
        }] : []
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // Update party balance
      const partyRef = doc(db, 'parties', selectedParty.id!);
      await updateDoc(partyRef, {
        balance: increment(grandTotal - amountPaid)
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving invoice', error);
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoiceNumber}.pdf`);
  };

  const exportImage = async () => {
    if (!previewRef.current) return;
    const canvas = await html2canvas(previewRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.download = `${invoiceNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (showPreview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowPreview(false)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Edit
          </button>
          <div className="flex gap-3">
            <button 
              onClick={exportImage}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              Export Image
            </button>
            <button 
              onClick={exportPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
        <div ref={previewRef} className="bg-white shadow-2xl rounded-xl overflow-hidden max-w-[210mm] mx-auto">
          <InvoicePreview 
            invoice={{
              invoiceNumber,
              date: invoiceDate,
              partyId: selectedParty!.id!,
              partyDetails: selectedParty!,
              items: lineItems,
              subtotal,
              totalGst,
              roundOff,
              grandTotal,
              amountPaid,
              status: amountPaid >= grandTotal ? 'paid' : amountPaid > 0 ? 'partial' : 'pending',
              isInclusive,
              isDeleted: false,
              createdAt: new Date().toISOString(),
              payments: []
            }} 
            settings={settings!}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">New Invoice</h2>
          <p className="text-xs text-gray-500">Create a tax invoice for your customer</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            disabled={!selectedParty || lineItems.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-xs font-bold"
          >
            <FileDown className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedParty || lineItems.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 disabled:bg-blue-400 transition-all shadow-lg shadow-blue-100 text-xs font-bold"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Party Selection */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-3 h-3 text-blue-600" />
              Bill To
            </h3>
            <button 
              onClick={() => setIsQuickPartyModalOpen(true)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-lg"
            >
              <UserPlus className="w-3 h-3" />
              Quick Add
            </button>
          </div>
          <Select
            options={partyOptions}
            placeholder="Select customer..."
            className="react-select-container text-xs"
            classNamePrefix="react-select"
            menuPortalTarget={document.body}
            menuPlacement="auto"
            styles={{
              menuPortal: (base) => ({ ...base, zIndex: 9999 })
            }}
            onChange={(opt: any) => setSelectedParty(opt?.data || null)}
            value={selectedParty ? { value: selectedParty.id, label: selectedParty.name } : null}
          />
          {selectedParty && (
            <div className="p-3 bg-gray-50 rounded-xl text-[11px] space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 border border-gray-100">
              <p className="font-bold text-gray-900">{selectedParty.name}</p>
              <p className="text-gray-500 truncate">{selectedParty.address}</p>
              <div className="flex gap-4">
                <p className="text-gray-500 font-medium">GST: <span className="text-gray-700">{selectedParty.gstin || 'N/A'}</span></p>
                <p className="text-gray-500 font-medium">State: <span className="text-gray-700">{STATE_CODES[selectedParty.stateCode]}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Details</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Number</label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/30">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Line Items</h3>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer">
              <input 
                type="checkbox" 
                checked={isInclusive} 
                onChange={(e) => setIsInclusive(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Inclusive GST
            </label>
            <button
              onClick={() => addLineItem()}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm shadow-blue-100"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[9px] uppercase tracking-widest border-b border-gray-100">
                <th className="px-3 py-2 font-black sticky left-0 bg-gray-50/50 z-20">Item / Service</th>
                <th className="px-1 py-2 font-black w-20">HSN</th>
                <th className="px-1 py-2 font-black w-16 text-center">Qty</th>
                <th className="px-1 py-2 font-black w-24">Price</th>
                <th className="px-1 py-2 font-black w-20">GST %</th>
                <th className="px-3 py-2 font-black text-right w-24">Total</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineItems.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-3 py-1.5 sticky left-0 bg-white group-hover:bg-gray-50/30 z-10 border-r border-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <Select
                      options={itemOptions}
                      placeholder="Select..."
                      className="text-[11px] font-medium"
                      classNamePrefix="react-select"
                      menuPortalTarget={document.body}
                      menuPlacement="auto"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          minHeight: '28px',
                          height: '28px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          borderColor: '#f3f4f6',
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '0 8px',
                        }),
                        indicatorsContainer: (base) => ({
                          ...base,
                          height: '28px',
                        }),
                      }}
                      onChange={(opt: any) => {
                        const i = opt?.data;
                        if (i) {
                          updateLineItem(index, {
                            itemId: i.id,
                            name: i.name,
                            hsn: i.hsn,
                            price: i.price,
                            gstRate: i.gstRate
                          });
                        }
                      }}
                      value={item.itemId ? { value: item.itemId, label: item.name } : null}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      value={item.hsn}
                      onChange={(e) => updateLineItem(index, { hsn: e.target.value })}
                      className="w-full px-1.5 py-1 border border-gray-100 rounded-md outline-none text-[11px] font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-1 py-1 border border-gray-100 rounded-md outline-none text-[11px] font-medium focus:ring-1 focus:ring-blue-500 text-center"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="relative">
                      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400 text-[9px]">₹</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateLineItem(index, { price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-3.5 pr-1 py-1 border border-gray-100 rounded-md outline-none text-[11px] font-medium focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </td>
                  <td className="px-1 py-1.5">
                    <select
                      value={item.gstRate}
                      onChange={(e) => updateLineItem(index, { gstRate: parseFloat(e.target.value) })}
                      className="w-full px-1 py-1 border border-gray-100 rounded-md outline-none text-[11px] font-medium focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-gray-900 text-[11px]">
                    {formatCurrency(item.total)}
                  </td>
                  <td className="px-2 py-1.5">
                    <button 
                      onClick={() => removeLineItem(index)}
                      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <PackagePlus className="w-8 h-8 text-gray-200" />
                      <p>No items added yet. Click "Add Row" to begin.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="p-4 sm:p-6 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-6 border-t border-gray-100">
          <div className="w-full sm:w-64 space-y-3">
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Subtotal</span>
              <span className="text-gray-700">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Total GST</span>
              <span className="text-gray-700">{formatCurrency(totalGst)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Round Off</span>
              <input
                type="number"
                step="0.01"
                value={roundOff}
                onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-right outline-none focus:ring-2 focus:ring-blue-500 bg-white text-[11px] font-bold"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Amount Paid</span>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-right outline-none focus:ring-2 focus:ring-blue-500 bg-white text-[11px] font-bold"
              />
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Grand Total</span>
              <span className="text-xl font-black text-blue-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <QuickPartyModal 
        isOpen={isQuickPartyModalOpen}
        onClose={() => setIsQuickPartyModalOpen(false)}
        onSuccess={(party) => {
          setSelectedParty(party);
        }}
        type="customer"
      />
    </div>
  );
}
