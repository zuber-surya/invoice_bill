import React, { useState, useMemo } from 'react';
import { Invoice, Expense, Estimation, EmployeePayment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Receipt,
  Wallet,
  FileText,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  subDays, 
  subWeeks, 
  subMonths, 
  subYears,
  isWithinInterval,
  format
} from 'date-fns';

interface DashboardProps {
  invoices: Invoice[];
  estimations: Estimation[];
  expenses: Expense[];
  employeePayments: EmployeePayment[];
  setActiveTab: (tab: any) => void;
}

type DateRangeType = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time';

export function Dashboard({ invoices, estimations, expenses, employeePayments, setActiveTab }: DashboardProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('this_month');
  const now = new Date();

  const ranges: Record<DateRangeType, { start: Date, end: Date, label: string }> = {
    today: { start: startOfDay(now), end: endOfDay(now), label: 'Today' },
    yesterday: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)), label: 'Yesterday' },
    this_week: { start: startOfWeek(now), end: endOfWeek(now), label: 'This Week' },
    last_week: { start: startOfWeek(subWeeks(now, 1)), end: endOfWeek(subWeeks(now, 1)), label: 'Last Week' },
    this_month: { start: startOfMonth(now), end: endOfMonth(now), label: 'This Month' },
    last_month: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)), label: 'Last Month' },
    this_year: { start: startOfYear(now), end: endOfYear(now), label: 'This Year' },
    last_year: { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)), label: 'Last Year' },
    all_time: { start: new Date(0), end: new Date(8640000000000000), label: 'All Time' }
  };

  const currentRange = ranges[dateRange];

  const metrics = useMemo(() => {
    const filterBy = (items: any[], dateField: string, amountField: string, interval: { start: Date, end: Date }) => 
      items.filter(item => {
        const d = new Date(item[dateField]);
        return isWithinInterval(d, interval);
      }).reduce((sum, item) => sum + (item[amountField] || 0), 0);

    const revenue = filterBy(invoices, 'date', 'grandTotal', currentRange);
    const estimationTotal = filterBy(estimations, 'date', 'grandTotal', currentRange);
    const received = filterBy(invoices.flatMap(inv => inv.payments || []), 'date', 'amount', currentRange);
    const expenseTotal = filterBy(expenses, 'date', 'amount', currentRange);
    const advanceTotal = filterBy(employeePayments.filter(p => p.type === 'advance'), 'date', 'amount', currentRange);

    const rangeInvoices = invoices.filter(inv => {
      const d = new Date(inv.date);
      return isWithinInterval(d, currentRange);
    });
    const pending = rangeInvoices.reduce((sum, inv) => sum + (inv.grandTotal - (inv.amountPaid || 0)), 0);

    const rangeEstimations = estimations.filter(est => {
      const d = new Date(est.date);
      return isWithinInterval(d, currentRange);
    });
    const convertedEst = rangeEstimations.filter(est => est.status === 'converted').length;
    const totalEst = rangeEstimations.length;
    const conversionRate = totalEst > 0 ? (convertedEst / totalEst) * 100 : 0;

    // For comparison/sub-metrics, let's keep today as a reference
    const todayInterval = ranges.today;
    const revenueToday = filterBy(invoices, 'date', 'grandTotal', todayInterval);
    const receivedToday = filterBy(invoices.flatMap(inv => inv.payments || []), 'date', 'amount', todayInterval);
    const expenseToday = filterBy(expenses, 'date', 'amount', todayInterval);

    return {
      revenue,
      estimationTotal,
      received,
      expenseTotal,
      advanceTotal,
      pending,
      conversionRate,
      revenueToday,
      receivedToday,
      expenseToday
    };
  }, [invoices, estimations, expenses, employeePayments, currentRange]);

  const stats = [
    { 
      label: 'Revenue', 
      value: metrics.revenue, 
      icon: TrendingUp, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      sub: `Today: ${formatCurrency(metrics.revenueToday)}`
    },
    { 
      label: 'Estimations', 
      value: metrics.estimationTotal, 
      icon: FileText, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50',
      sub: `Conv. Rate: ${metrics.conversionRate.toFixed(1)}%`
    },
    { 
      label: 'Received', 
      value: metrics.received, 
      icon: CheckCircle2, 
      color: 'text-green-600', 
      bg: 'bg-green-50',
      sub: `Today: ${formatCurrency(metrics.receivedToday)}`
    },
    { 
      label: 'Expenses', 
      value: metrics.expenseTotal, 
      icon: TrendingDown, 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      sub: `Today: ${formatCurrency(metrics.expenseToday)}`
    },
    { 
      label: 'Advances', 
      value: metrics.advanceTotal, 
      icon: Wallet, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50',
      sub: 'Employee Advances'
    },
    { 
      label: 'Pending', 
      value: metrics.pending, 
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      sub: 'In Selected Range'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-xs text-gray-500 font-medium">Tracking your business performance</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <div className="relative group">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeType)}
              className="appearance-none pl-9 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer transition-all hover:bg-gray-50"
            >
              {Object.entries(ranges).map(([key, range]) => (
                <option key={key} value={key}>{range.label}</option>
              ))}
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
            {format(currentRange.start, 'dd MMM')} - {format(currentRange.end, 'dd MMM yyyy')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={cn(
            "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3 transition-all hover:shadow-md hover:border-gray-200",
            i >= 4 ? "col-span-1" : ""
          )}>
            <div className="flex items-center justify-between">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-black text-gray-900">{formatCurrency(stat.value)}</p>
              <p className="text-[10px] text-gray-500 font-medium mt-1">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              Recent Invoices
            </h3>
            <button 
              onClick={() => setActiveTab('invoices')}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 flex-1">
            {invoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {inv.invoiceNumber.split('-').pop()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{inv.partyDetails.name}</p>
                    <p className="text-[10px] text-gray-500">{format(new Date(inv.date), 'dd MMM')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900">{formatCurrency(inv.grandTotal)}</p>
                  <span className={cn(
                    "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                    inv.status === 'paid' ? "bg-green-100 text-green-700" : 
                    inv.status === 'partial' ? "bg-orange-100 text-orange-700" : 
                    "bg-red-100 text-red-700"
                  )}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="p-8 text-center text-xs text-gray-400 font-medium italic">No invoices found</p>}
          </div>

          <div className="p-4 border-t border-gray-50 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Recent Estimations
            </h3>
            <button 
              onClick={() => setActiveTab('estimations')}
              className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 flex-1">
            {estimations.slice(0, 3).map((est) => (
              <div key={est.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {est.estimationNumber.split('-').pop()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{est.partyDetails.name}</p>
                    <p className="text-[10px] text-gray-500">{format(new Date(est.date), 'dd MMM')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900">{formatCurrency(est.grandTotal)}</p>
                  <span className={cn(
                    "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full",
                    est.status === 'converted' ? "bg-green-100 text-green-700" : 
                    est.status === 'sent' ? "bg-blue-100 text-blue-700" : 
                    "bg-red-100 text-red-700"
                  )}>
                    {est.status}
                  </span>
                </div>
              </div>
            ))}
            {estimations.length === 0 && <p className="p-8 text-center text-xs text-gray-400 font-medium italic">No estimations found</p>}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Performance Summary
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {ranges[dateRange].label}
            </span>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase tracking-wider">Revenue</span>
                <span className="text-gray-900">{formatCurrency(metrics.revenue)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase tracking-wider">Received</span>
                <span className="text-gray-900">{formatCurrency(metrics.received)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(metrics.received / metrics.revenue) * 100 || 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-400 text-right font-bold uppercase">
                Collection Rate: {((metrics.received / metrics.revenue) * 100 || 0).toFixed(1)}%
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase tracking-wider">Expenses</span>
                <span className="text-gray-900">{formatCurrency(metrics.expenseTotal)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(metrics.expenseTotal / metrics.revenue) * 100 || 0}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-400 text-right font-bold uppercase">
                Expense Ratio: {((metrics.expenseTotal / metrics.revenue) * 100 || 0).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50">
            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Net Profit</p>
                  <p className="text-xs font-bold text-blue-900">For {ranges[dateRange].label}</p>
                </div>
              </div>
              <span className="text-lg font-black text-blue-600">
                {formatCurrency(metrics.revenue - metrics.expenseTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
