'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Receipt,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Building,
  IndianRupee,
  RotateCw,
  Loader2,
  Plus,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/axios';
import { DashboardStats } from '@/types';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // First attempt: Dedicated Backend Dashboard API
      const res = await api.get('/dashboard/stats');
      if (res.data) {
        setStats(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hrms_dashboard_stats', JSON.stringify(res.data));
        }
        return;
      }
    } catch (apiErr: any) {
      console.warn('Backend /dashboard/stats route unreachable, attempting fallback aggregation:', apiErr);

      // Fallback: Query individual endpoints in parallel from MySQL backend
      try {
        const [empRes, batchRes, leaveRes] = await Promise.allSettled([
          api.get('/employees', { params: { limit: 100 } }),
          api.get('/salary/batches'),
          api.get('/leave/requests'),
        ]);

        const employeesList: any[] = 
          empRes.status === 'fulfilled'
            ? Array.isArray(empRes.value.data)
              ? empRes.value.data
              : empRes.value.data?.data || []
            : [];

        const batchesList: any[] =
          batchRes.status === 'fulfilled' && Array.isArray(batchRes.value.data)
            ? batchRes.value.data
            : [];

        const leavesList: any[] =
          leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value.data)
            ? leaveRes.value.data
            : [];

        // Compute Fallback KPIs
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let activeCount = 0;
        let inactiveCount = 0;
        let totalMonthlyLiability = 0;
        let newThisMonth = 0;
        const deptMap: Record<string, number> = {};

        employeesList.forEach((emp) => {
          const isInactive = emp.employmentStatus === 'INACTIVE';
          if (isInactive) inactiveCount++;
          else activeCount++;

          if (emp.monthlySalary) {
            totalMonthlyLiability += Number(emp.monthlySalary) || 0;
          }

          if (emp.joiningDate) {
            const jDate = new Date(emp.joiningDate);
            if (jDate.getFullYear() === currentYear && jDate.getMonth() === currentMonth) {
              newThisMonth++;
            }
          }

          const dept = emp.department && emp.department.trim() ? emp.department.trim() : 'General / Operations';
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        });

        const deptColors = ['bg-indigo-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-500', 'bg-purple-600', 'bg-rose-500'];
        let colorIdx = 0;
        const departmentBreakdown = Object.entries(deptMap).map(([name, count]) => {
          const percentage = employeesList.length > 0 ? Math.round((count / employeesList.length) * 100) : 0;
          const color = deptColors[colorIdx % deptColors.length];
          colorIdx++;
          return { name, count, percentage, color };
        }).sort((a, b) => b.count - a.count);

        let pendingLeaves = 0;
        let approvedLeaves = 0;
        leavesList.forEach((lv) => {
          const st = (lv.status || '').toUpperCase();
          if (st === 'PENDING' || st === 'SUBMITTED') pendingLeaves++;
          else if (st === 'APPROVED') approvedLeaves++;
        });

        // Sorted batches
        const sortedBatches = [...batchesList].sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });

        const chartData = sortedBatches.map((b) => {
          const mIdx = b.month >= 1 && b.month <= 12 ? b.month - 1 : 0;
          return {
            month: MONTH_NAMES[mIdx],
            fullMonth: `${MONTH_NAMES[mIdx]} ${b.year}`,
            year: b.year,
            monthNum: b.month,
            amount: Math.round(Number(b.totalGrossPay || b.totalNetPay || 0)),
            employees: Array.isArray(b.records) ? b.records.length : employeesList.length,
            status: b.status,
          };
        });

        let avgPayroll = 0;
        let growthRate = 0;
        if (sortedBatches.length > 0) {
          const totalDisbursed = sortedBatches.reduce((acc, b) => acc + Number(b.totalGrossPay || 0), 0);
          avgPayroll = Math.round(totalDisbursed / sortedBatches.length);

          if (sortedBatches.length >= 2) {
            const last = Number(sortedBatches[sortedBatches.length - 1].totalGrossPay || 0);
            const prev = Number(sortedBatches[sortedBatches.length - 2].totalGrossPay || 0);
            if (prev > 0) {
              growthRate = Math.round(((last - prev) / prev) * 1000) / 10;
            }
          }
        }

        const descBatches = [...sortedBatches].reverse();
        const latestBatch = descBatches[0] || null;

        const recentBatches = descBatches.slice(0, 5).map((b) => {
          const mIdx = b.month >= 1 && b.month <= 12 ? b.month - 1 : 0;
          const dt = b.processedAt || b.approvedAt || b.updatedAt || b.createdAt;
          return {
            id: b.id,
            period: `${FULL_MONTH_NAMES[mIdx]} ${b.year}`,
            disbursed: Number(b.totalNetPay || b.totalGrossPay || 0),
            totalGross: Number(b.totalGrossPay || 0),
            totalDeductions: Number(b.totalDeductions || 0),
            headcount: Array.isArray(b.records) ? b.records.length : employeesList.length,
            status: b.status,
            date: dt ? new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending',
          };
        });

        const fallbackStats: DashboardStats = {
          activeCyclePeriod: latestBatch 
            ? `${FULL_MONTH_NAMES[(latestBatch.month - 1) % 12]} ${latestBatch.year} Cycle`
            : `${FULL_MONTH_NAMES[currentMonth]} ${currentYear} Cycle`,
          kpis: {
            totalHeadcount: employeesList.length,
            activeCount,
            inactiveCount,
            newThisMonth,
            totalMonthlyLiability,
            pendingLeaves,
            approvedLeaves,
            totalLeaves: leavesList.length,
            processedPayrollAmount: latestBatch ? Number(latestBatch.totalGrossPay || latestBatch.totalNetPay || 0) : totalMonthlyLiability,
            latestBatchStatus: latestBatch ? latestBatch.status : 'NO_RUN',
            latestBatchPeriod: latestBatch ? `${FULL_MONTH_NAMES[(latestBatch.month - 1) % 12]} ${latestBatch.year}` : 'Not Generated',
          },
          payrollStats: {
            avgMonthlyExpenditure: avgPayroll,
            growthPercentage: growthRate,
            chartData,
          },
          departmentBreakdown,
          recentBatches,
          recentLeaves: leavesList.slice(0, 5).map((l) => ({
            id: l.id,
            employeeName: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee',
            employeeCode: l.employee?.employeeCode || '',
            leaveType: l.leaveType,
            totalDays: l.totalDays,
            startDate: l.startDate,
            endDate: l.endDate,
            status: l.status,
            createdAt: l.createdAt,
          })),
        };

        setStats(fallbackStats);
        return;
      } catch (fallbackErr: any) {
        console.error('All data sources failed:', fallbackErr);
        
        // Final offline check
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('hrms_dashboard_stats');
          if (cached) {
            try {
              setStats(JSON.parse(cached));
              return;
            } catch (e) {}
          }
        }
        setError('Unable to load live dashboard metrics from database. Please check backend connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Loading Database Analytics...</p>
          <p className="text-xs text-slate-400 mt-1">Connecting to MySQL workforce and payroll tables</p>
        </div>
      </div>
    );
  }

  const kpis = stats?.kpis || {
    totalHeadcount: 0,
    activeCount: 0,
    inactiveCount: 0,
    newThisMonth: 0,
    totalMonthlyLiability: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    totalLeaves: 0,
    processedPayrollAmount: 0,
    latestBatchStatus: 'NO_RUN',
    latestBatchPeriod: 'None',
  };

  const chartData = stats?.payrollStats.chartData || [];
  const recentBatches = stats?.recentBatches || [];

  return (
    <div className="space-y-7">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="rounded-lg bg-amber-100 px-3 py-1 font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Executive Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time workforce headcount, payroll disbursements, and leave approvals from database.
          </p>
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>{stats?.activeCyclePeriod || 'Current Operating Cycle'}</span>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh from MySQL DB"
          >
            <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <Link
            href="/salary"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Manage Payroll</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Headcount */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Headcount
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 border border-blue-100/80 text-blue-600">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {kpis.totalHeadcount}
            </span>
            {kpis.newThisMonth > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <ArrowUpRight className="h-3 w-3" />
                +{kpis.newThisMonth} this month
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                Active Roster
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
            {kpis.activeCount} Active • {kpis.inactiveCount} Inactive
          </div>
        </div>

        {/* Processed Payroll */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Processed Payroll
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100/80 text-emerald-600">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(kpis.processedPayrollAmount)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium truncate max-w-[120px]">
              {kpis.latestBatchPeriod}
            </span>
            {kpis.latestBatchStatus === 'PAID' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                100% Disbursed
              </span>
            ) : kpis.latestBatchStatus === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60">
                Approved
              </span>
            ) : kpis.latestBatchStatus === 'DRAFT' || kpis.latestBatchStatus === 'PREVIEW' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                Draft Preview
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Monthly Estimate</span>
            )}
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Leaves
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 border border-amber-100/80 text-amber-600">
              <CalendarCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {kpis.pendingLeaves}
            </span>
            {kpis.pendingLeaves > 0 ? (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                Needs action
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                All clear
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-amber-600 font-medium flex items-center justify-between">
            <span>
              {kpis.pendingLeaves > 0 ? 'Awaiting approval' : `${kpis.approvedLeaves} Approved requests`}
            </span>
            <Link href="/leave/requests" className="underline hover:text-amber-800 text-[11px] font-semibold">
              Review
            </Link>
          </div>
        </div>

        {/* Active Workforce */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Workforce Status
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {kpis.activeCount}
            </span>
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              Active
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-400 font-medium">
            {kpis.inactiveCount > 0
              ? `${kpis.inactiveCount} Inactive Staff`
              : '100% Operational Retention'}
          </div>
        </div>
      </div>

      {/* Monthly Payroll Expenditure Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Monthly Payroll Expenditure
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Gross employee disbursements calculated from database payroll batches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Avg: {formatCurrency(stats?.payrollStats.avgMonthlyExpenditure || kpis.processedPayrollAmount)} / mo
            </div>
            {stats?.payrollStats.growthPercentage !== undefined && stats.payrollStats.growthPercentage !== 0 && (
              <div
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                  stats.payrollStats.growthPercentage >= 0
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {stats.payrollStats.growthPercentage >= 0 ? '+' : ''}
                {stats.payrollStats.growthPercentage}% vs prev
              </div>
            )}
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="payrollBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  dy={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                  width={65}
                  dx={-4}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc', radius: 8 }}
                  formatter={(value: number) => [formatCurrency(value), 'Gross Expenditure']}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullMonth ? `${item.fullMonth} Cycle` : `${label} Cycle`;
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="url(#payrollBarGradient)"
                  barSize={36}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Payroll Batches Generated Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Run a monthly payroll cycle in the Salary & Payroll module to start visualizing expenditure trends.
              </p>
              <Link
                href="/salary"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Generate First Batch
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payroll Runs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Payroll Runs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Audit history of recent employee disbursement cycles
            </p>
          </div>
          <Link
            href="/salary"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            All Batches
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentBatches.length > 0 ? (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider rounded-lg">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Cycle Period</th>
                  <th className="px-4 py-3">Headcount</th>
                  <th className="px-4 py-3">Disbursed Amount</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {batch.period}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {batch.headcount} employees
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {formatCurrency(batch.disbursed)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {batch.date}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                          batch.status === 'PAID'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : batch.status === 'APPROVED'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {batch.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Payroll Batches Recorded</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate your first monthly payroll batch in the Salary module.
              </p>
              <Link
                href="/salary"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Go to Salary & Payroll &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
