import { useState } from 'react';
import { BusinessSettings } from '../types';
import { STATE_CODES } from '../lib/utils';
import { Save, Building2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SettingsProps {
  settings: BusinessSettings | null;
}

export function Settings({ settings }: SettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const data: BusinessSettings = {
      businessName: formData.get('businessName') as string,
      gstin: formData.get('gstin') as string,
      address: formData.get('address') as string,
      stateCode: formData.get('stateCode') as string,
      nextInvoiceNumber: parseInt(formData.get('nextInvoiceNumber') as string) || 1,
    };

    try {
      await setDoc(doc(db, 'settings', 'global'), data);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Business Settings</h2>
        <p className="text-gray-500">Configure your business details for the invoice header.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Your Business Profile</h3>
              <p className="text-sm text-blue-700">This information will appear as the "From" section on your invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Business Name *</label>
              <input
                name="businessName"
                required
                defaultValue={settings?.businessName}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Your GSTIN</label>
              <input
                name="gstin"
                defaultValue={settings?.gstin}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">State Code *</label>
              <select
                name="stateCode"
                required
                defaultValue={settings?.stateCode || "27"}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.entries(STATE_CODES).map(([code, name]) => (
                  <option key={code} value={code}>{code} - {name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Next Invoice Number</label>
              <input
                name="nextInvoiceNumber"
                type="number"
                required
                defaultValue={settings?.nextInvoiceNumber || 1}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Business Address</label>
            <textarea
              name="address"
              rows={4}
              defaultValue={settings?.address}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-200"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
