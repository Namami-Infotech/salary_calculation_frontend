'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  RefreshCw, 
  Lock, 
  CreditCard, 
  User, 
  Calendar,
  Building2,
  CheckCircle2,
  IndianRupee,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';

const DEFAULT_EMPLOYEES: Array<{ employeeCode: string; monthlySalary?: number }> = [];

export default function OnboardEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);

  // Form State with exact required fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    email: '',
    phone: '',
    employeeCode: 'EMP001',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'ACTIVE',
    // Salary Details
    monthlySalary: '45000',
    paymentMode: 'BANK_TRANSFER',
    // Bank Details
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
  });

  // Calculate next sequential Employee Code (e.g. EMP001, EMP002, EMP003 -> EMP004)
  const computeNextEmpCode = async () => {
    setCodeLoading(true);

    let maxNum = 0;

    // 1. Try checking backend API roster
    try {
      const res = await api.get('/employees', { params: { limit: 100 } });
      const apiList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (Array.isArray(apiList) && apiList.length > 0) {
        apiList.forEach((emp: any) => {
          const match = (emp.employeeCode || '').match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
      }
    } catch (err) {}

    // 2. Try checking localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hrms_employees');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((emp: any) => {
              const match = (emp.employeeCode || '').match(/\d+/);
              if (match) {
                const num = parseInt(match[0], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
              }
            });
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: If maxNum is still 0, check default seeds
    if (maxNum === 0) {
      DEFAULT_EMPLOYEES.forEach((emp: any) => {
        const match = (emp.employeeCode || '').match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
    }

    // 4. If current field already has a value, clicking Next increments from current
    const currentMatch = (formData.employeeCode || '').match(/\d+/);
    if (currentMatch) {
      const currentNum = parseInt(currentMatch[0], 10);
      if (!isNaN(currentNum) && currentNum >= maxNum) {
        maxNum = currentNum;
      }
    }

    const nextCode = `EMP${String(maxNum + 1).padStart(3, '0')}`;
    setFormData((prev) => ({ ...prev, employeeCode: nextCode }));
    setCodeLoading(false);
  };

  useEffect(() => {
    computeNextEmpCode();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const numericOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: numericOnly }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'ifscCode' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone && formData.phone.length !== 10) {
      alert('Phone number 10 digit ka hona chahiye.');
      return;
    }
    setLoading(true);

    const salaryNum = formData.monthlySalary ? parseFloat(formData.monthlySalary) : 0;

    const newEmployee = {
      id: `emp-${Date.now()}`,
      employeeCode: formData.employeeCode,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      age: formData.age ? parseInt(formData.age, 10) : undefined,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      joiningDate: formData.joiningDate,
      monthlySalary: salaryNum,
      paymentMode: formData.paymentMode,
      bankDetails: {
        accountHolderName: formData.accountHolderName.trim() || `${formData.firstName} ${formData.lastName}`.trim(),
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim(),
        branchName: formData.branchName.trim(),
      },
      employmentStatus: formData.employmentStatus || 'ACTIVE',
      employmentType: 'FULL_TIME',
      createdAt: new Date().toISOString(),
    };

    // Attempt backend sync
    try {
      const res = await api.post('/employees', {
        employeeCode: formData.employeeCode,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        joiningDate: formData.joiningDate,
        employmentStatus: formData.employmentStatus || 'ACTIVE',
        monthlySalary: salaryNum,
        bankDetails: newEmployee.bankDetails,
      });

      // Update local storage with real record
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hrms_employees');
        const existing = stored ? JSON.parse(stored) : [];
        const savedEmp = res.data || newEmployee;
        localStorage.setItem('hrms_employees', JSON.stringify([...existing, { ...savedEmp, monthlySalary: salaryNum }]));
      }
    } catch (err) {
      console.warn('Backend sync error (saved locally):', err);
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('hrms_employees');
        const existing = stored ? JSON.parse(stored) : [];
        localStorage.setItem('hrms_employees', JSON.stringify([...existing, newEmployee]));
      }
    }

    setLoading(false);
    alert(`Employee ${formData.employeeCode} (${formData.firstName} ${formData.lastName}) onboarded with monthly salary ${formatCurrency(salaryNum)}!`);
    router.push('/employees');
  };

  return (
    // FULL WIDTH CONTAINER
    <div className="w-full space-y-6 pb-16">
      
      {/* Top Navigation & Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
        <Link
          href="/employees"
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Onboard New Employee</h1>
          <p className="text-sm text-slate-500">
            Form with sequential employee code generation, profile information, and bank details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-6">
        
        {/* 1. Core Profile Details Card - FULL WIDTH (3 Columns) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
                1
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Core Profile Details
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium flex items-center gap-1.5 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Sequence Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. Rahul"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Sharma"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Age *
              </label>
              <input
                type="number"
                name="age"
                min="18"
                max="80"
                required
                value={formData.age}
                onChange={handleChange}
                placeholder="e.g. 26"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Minimum age: 18 years</span>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rahul.sharma@company.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Auto-Generated Employee Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Employee Code *
                </label>
                <button
                  type="button"
                  onClick={computeNextEmpCode}
                  disabled={codeLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md transition"
                  title="Generate next sequential code"
                >
                  <RefreshCw className={`w-3 h-3 ${codeLoading ? 'animate-spin' : ''}`} />
                  Next ID
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  name="employeeCode"
                  required
                  value={formData.employeeCode}
                  onChange={handleChange}
                  placeholder="e.g. EMP002"
                  className="w-full bg-white border border-slate-300 font-mono font-bold text-blue-700 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition uppercase"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Auto-incremented or enter custom code</span>
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Joining Date *
              </label>
              <input
                type="date"
                name="joiningDate"
                required
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Monthly Salary */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Monthly Salary (₹ / Month) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  name="monthlySalary"
                  required
                  min="0"
                  step="500"
                  value={formData.monthlySalary}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Per month salary amount (CTC: {formatCurrency((parseFloat(formData.monthlySalary) || 0) * 12)} / yr)
              </span>
            </div>

            {/* Employment Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Status *
              </label>
              <select
                name="employmentStatus"
                value={formData.employmentStatus}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">Choose Active or Inactive</span>
            </div>

          </div>
        </div>

        {/* 2. Bank Details Card - FULL WIDTH (3 Columns) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="pb-4 mb-6 border-b border-slate-100 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bank Details & Payment Information
              </h2>
              <p className="text-xs text-slate-500">
                Required for salary disbursement and direct bank deposit
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Account Holder Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Account Holder Name *
              </label>
              <input
                type="text"
                name="accountHolderName"
                required
                value={formData.accountHolderName}
                onChange={handleChange}
                placeholder="Full name as in bank passbook"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Bank Name *
              </label>
              <input
                type="text"
                name="bankName"
                required
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g. State Bank of India, HDFC Bank, ICICI"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Bank Account Number *
              </label>
              <input
                type="text"
                name="accountNumber"
                required
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter bank account number"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                IFSC Code *
              </label>
              <input
                type="text"
                name="ifscCode"
                required
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="e.g. SBIN0001234"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">11-character branch code</span>
            </div>

            {/* Branch Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Branch Name
              </label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                placeholder="e.g. Main Branch, Delhi"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
              />
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/employees"
            className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 shadow-sm transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save & Onboard Employee'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
