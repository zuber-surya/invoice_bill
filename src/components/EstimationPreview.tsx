import { Estimation, BusinessSettings } from '../types';
import { formatCurrency, STATE_CODES } from '../lib/utils';
import { format } from 'date-fns';

interface EstimationPreviewProps {
  estimation: Omit<Estimation, 'id'>;
  settings: BusinessSettings;
}

export function EstimationPreview({ estimation, settings }: EstimationPreviewProps) {
  const isInterState = estimation.partyDetails.stateCode !== settings.stateCode;

  return (
    <div className="p-12 text-gray-900 bg-white min-h-[297mm] w-full font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-8 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight text-blue-600">{settings.businessName}</h1>
          <div className="text-sm text-gray-600 max-w-xs leading-relaxed">
            {settings.address}
          </div>
          <p className="text-sm font-bold">GSTIN: <span className="font-normal">{settings.gstin}</span></p>
          <p className="text-sm font-bold">State: <span className="font-normal">{STATE_CODES[settings.stateCode]} ({settings.stateCode})</span></p>
        </div>
        <div className="text-right space-y-1">
          <h2 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-4">Estimation / Quote</h2>
          <p className="text-sm font-bold">Estimation #: <span className="font-normal">{estimation.estimationNumber}</span></p>
          <p className="text-sm font-bold">Date: <span className="font-normal">{format(new Date(estimation.date), 'dd-MM-yyyy')}</span></p>
          {estimation.expiryDate && (
            <p className="text-sm font-bold text-red-600">Valid Until: <span className="font-normal">{format(new Date(estimation.expiryDate), 'dd-MM-yyyy')}</span></p>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Bill To</h3>
          <div className="space-y-1">
            <p className="font-bold text-lg">{estimation.partyDetails.name}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{estimation.partyDetails.address}</p>
            <p className="text-sm font-bold mt-2">GSTIN: <span className="font-normal">{estimation.partyDetails.gstin || 'N/A'}</span></p>
            <p className="text-sm font-bold">State: <span className="font-normal">{STATE_CODES[estimation.partyDetails.stateCode]} ({estimation.partyDetails.stateCode})</span></p>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-1">Ship To</h3>
          <div className="space-y-1 italic text-gray-400 text-sm">
            Same as Billing Address
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-12">
        <thead>
          <tr className="border-y-2 border-gray-900 text-xs font-black uppercase tracking-wider text-left">
            <th className="py-4 px-2 w-12">#</th>
            <th className="py-4 px-2">Description</th>
            <th className="py-4 px-2 text-center">HSN</th>
            <th className="py-4 px-2 text-center">Qty</th>
            <th className="py-4 px-2 text-right">Rate</th>
            <th className="py-4 px-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {estimation.items.map((item, index) => (
            <tr key={index} className="text-sm">
              <td className="py-4 px-2 text-gray-400">{index + 1}</td>
              <td className="py-4 px-2 font-bold">{item.name}</td>
              <td className="py-4 px-2 text-center text-gray-600">{item.hsn}</td>
              <td className="py-4 px-2 text-center">{item.quantity}</td>
              <td className="py-4 px-2 text-right">{item.price.toFixed(2)}</td>
              <td className="py-4 px-2 text-right font-bold">{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="flex justify-between items-start gap-12">
        {/* Tax Breakdown */}
        <div className="flex-1">
          <table className="w-full text-xs border border-gray-100">
            <thead>
              <tr className="bg-gray-50 font-bold uppercase">
                <th className="p-2 border border-gray-100">Tax Type</th>
                <th className="p-2 border border-gray-100 text-right">Taxable Amt</th>
                <th className="p-2 border border-gray-100 text-right">Rate</th>
                <th className="p-2 border border-gray-100 text-right">Tax Amt</th>
              </tr>
            </thead>
            <tbody>
              {isInterState ? (
                <tr className="border-b border-gray-100">
                  <td className="p-2 border border-gray-100">IGST</td>
                  <td className="p-2 border border-gray-100 text-right">{estimation.subtotal.toFixed(2)}</td>
                  <td className="p-2 border border-gray-100 text-right">Multiple</td>
                  <td className="p-2 border border-gray-100 text-right font-bold">{estimation.totalGst.toFixed(2)}</td>
                </tr>
              ) : (
                <>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 border border-gray-100">CGST</td>
                    <td className="p-2 border border-gray-100 text-right">{(estimation.subtotal).toFixed(2)}</td>
                    <td className="p-2 border border-gray-100 text-right">Multiple</td>
                    <td className="p-2 border border-gray-100 text-right font-bold">{(estimation.totalGst / 2).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-2 border border-gray-100">SGST</td>
                    <td className="p-2 border border-gray-100 text-right">{(estimation.subtotal).toFixed(2)}</td>
                    <td className="p-2 border border-gray-100 text-right">Multiple</td>
                    <td className="p-2 border border-gray-100 text-right font-bold">{(estimation.totalGst / 2).toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          <div className="mt-8 space-y-1">
            <p className="text-[10px] font-black uppercase text-gray-400">Total in Words</p>
            <p className="text-xs font-bold italic">Rupees {estimation.grandTotal.toLocaleString('en-IN')} Only</p>
          </div>
        </div>

        {/* Totals */}
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-bold">{formatCurrency(estimation.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total GST</span>
            <span className="font-bold">{formatCurrency(estimation.totalGst)}</span>
          </div>
          {estimation.roundOff !== 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Round Off</span>
              <span className="font-bold">{formatCurrency(estimation.roundOff)}</span>
            </div>
          )}
          <div className="pt-4 border-t-2 border-gray-900 flex justify-between items-center">
            <span className="text-lg font-black uppercase tracking-tighter">Grand Total</span>
            <span className="text-2xl font-black text-blue-600">{formatCurrency(estimation.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-24 pt-12 border-t border-gray-100 flex justify-between items-end">
        <div className="text-[10px] text-gray-400 max-w-sm">
          <p className="font-bold uppercase mb-1">Terms & Conditions</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>This is not a Tax Invoice.</li>
            <li>Prices are valid for 15 days from the date of estimation.</li>
            <li>Subject to local jurisdiction.</li>
          </ol>
        </div>
        <div className="text-center space-y-12">
          <p className="text-xs font-bold uppercase">For {settings.businessName}</p>
          <div className="border-t border-gray-900 pt-2 w-48">
            <p className="text-[10px] font-bold uppercase">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
