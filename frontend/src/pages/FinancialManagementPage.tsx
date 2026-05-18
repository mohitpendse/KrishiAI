import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { DollarSign, TrendingUp, TrendingDown, Wheat, Bot, AlertTriangle, Check, X } from 'lucide-react';
import { getUserStorageKey } from '../utils/storage';

type Transaction = {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  crop?: string;
  field?: string;
  notes?: string;
};

type Budget = { id: string; name: string; allocated: number; spent: number };
type Sale = { id: string; date: string; crop: string; quantity: number; unit: string; unit_price: number; total: number; buyer?: string; status?: string };
type Loan = { id: string; lender: string; purpose: string; balance: number; emi: number; interestRate: number; dueDay: number; status: 'current' | 'due-soon' | 'overdue' };

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const FINANCE_STORAGE_KEY = 'krishiai-financial-transactions';

const readStoredTransactions = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getUserStorageKey(FINANCE_STORAGE_KEY));
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
};

type FinanceSnapshot = {
  income: number;
  expenses: number;
  cash: number;
  profit: number;
  topExpenseCategory: string;
  topExpenseAmount: number;
  pendingSales: number;
  budgetUsage: number;
  monthlyLoanPayments: number;
  totalLoanBalance: number;
  debtPressure: number;
  survivalCashThisMonth: number;
  projectedYearEndCash: number;
};

const formatCurrency = (v: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
};

const today = () => new Date().toISOString().slice(0, 10);

const getFinanceSnapshot = (transactions: Transaction[], budgets: Budget[], sales: Sale[], loans: Loan[]): FinanceSnapshot => {
  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const cash = income - expenses + 5000;
  const profit = income - expenses;
  const pendingSales = sales.filter((sale) => sale.status === 'pending').reduce((sum, sale) => sum + sale.total, 0);
  const monthlyLoanPayments = loans.reduce((sum, loan) => sum + loan.emi, 0);
  const totalLoanBalance = loans.reduce((sum, loan) => sum + loan.balance, 0);
  const monthlyOperatingRunRate = Math.max(Math.round(expenses * 0.6), 1);
  const survivalCashThisMonth = cash + pendingSales - monthlyOperatingRunRate - monthlyLoanPayments;
  const projectedYearEndCash = cash + pendingSales + income * 2 - expenses * 2 - monthlyLoanPayments * 12;
  const debtPressure = income ? Math.round((monthlyLoanPayments / Math.max(income / 3, 1)) * 100) : 0;
  const allocated = budgets.reduce((sum, budget) => sum + budget.allocated, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const byCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  const topExpense = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || ['None', 0];

  return {
    income,
    expenses,
    cash,
    profit,
    topExpenseCategory: topExpense[0],
    topExpenseAmount: topExpense[1],
    pendingSales,
    budgetUsage: allocated ? Math.round((spent / allocated) * 100) : 0,
    monthlyLoanPayments,
    totalLoanBalance,
    debtPressure,
    survivalCashThisMonth,
    projectedYearEndCash,
  };
};

const parseTransactionRequest = (query: string): Omit<Transaction, 'id'> | null => {
  const amountMatch = query.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[1].replace(/,/g, ''));
  if (!amount || amount <= 0) return null;

  const lower = query.toLowerCase();
  const isIncome = /\b(earned|received|sold|sale|income|got|paid by)\b/.test(lower);
  const isExpense = /\b(spent|paid|bought|purchase|expense|cost|fertilizer|seed|labor|labour|transport)\b/.test(lower);
  if (!isIncome && !isExpense) return null;

  let category = isIncome ? 'Sales' : 'Miscellaneous';
  if (lower.includes('fertilizer')) category = 'Fertilizer';
  else if (lower.includes('seed')) category = 'Seeds';
  else if (lower.includes('labor') || lower.includes('labour')) category = 'Labor';
  else if (lower.includes('transport')) category = 'Transport';
  else if (lower.includes('loan') || lower.includes('emi')) category = 'Loan Payment';
  else if (lower.includes('subsidy')) category = 'Subsidy';
  else if (lower.includes('sale') || lower.includes('sold')) category = 'Sales';

  const cropMatch = lower.match(/\b(tomato|wheat|rice|cotton|onion|potato|maize|corn|sugarcane)\b/);

  return {
    date: today(),
    type: isIncome ? 'income' : 'expense',
    category,
    amount,
    crop: cropMatch ? cropMatch[1].charAt(0).toUpperCase() + cropMatch[1].slice(1) : undefined,
    notes: query.trim(),
  };
};

const generateAssistantReply = (
  query: string,
  snapshot: FinanceSnapshot,
  transactions: Transaction[],
  budgets: Budget[],
  loans: Loan[],
  parsedTransaction: Omit<Transaction, 'id'> | null
) => {
  const lower = query.toLowerCase();

  if (parsedTransaction) {
    const debtNote = parsedTransaction.category === 'Loan Payment'
      ? ` I will treat this as debt servicing while planning cash. Monthly loan obligations are currently ${formatCurrency(snapshot.monthlyLoanPayments)}.`
      : '';
    return `I added this as an ${parsedTransaction.type}: ${parsedTransaction.category} for ${formatCurrency(parsedTransaction.amount)}. Your updated cash balance will reflect it in the dashboard.${debtNote}`;
  }

  if (lower.includes('loan') || lower.includes('emi') || lower.includes('debt')) {
    const urgentLoans = loans.filter((loan) => loan.status !== 'current');
    return [
      `Loan check: outstanding balance is ${formatCurrency(snapshot.totalLoanBalance)} and monthly EMI pressure is ${formatCurrency(snapshot.monthlyLoanPayments)}.`,
      `Debt pressure is about ${snapshot.debtPressure}% of recent monthly income. Keep it below 30% before taking new credit.`,
      urgentLoans.length ? `Priority: ${urgentLoans.map((loan) => `${loan.lender} (${loan.status})`).join(', ')}.` : 'All listed loans are current, so keep paying EMIs before discretionary farm purchases.',
    ].join('\n');
  }

  if (lower.includes('forecast') || lower.includes('future') || lower.includes('next month') || lower.includes('30 days') || lower.includes('survive this month')) {
    const reserveTarget = Math.max(snapshot.expenses * 0.35, 5000);
    return [
      `This month: survival cash after expected operating costs and EMIs is around ${formatCurrency(snapshot.survivalCashThisMonth)}.`,
      `Pay EMIs first (${formatCurrency(snapshot.monthlyLoanPayments)}), then protect at least ${formatCurrency(reserveTarget)} as reserve.`,
      snapshot.pendingSales > 0 ? `Follow up on ${formatCurrency(snapshot.pendingSales)} in pending sales first.` : 'No pending sales are currently marked in this page.',
      snapshot.survivalCashThisMonth < reserveTarget ? 'Delay non-critical input purchases and negotiate payment dates with suppliers.' : 'You can survive the month if spending stays close to plan.',
    ].join('\n');
  }

  if (lower.includes('year') || lower.includes('annual') || lower.includes('survive this year')) {
    return [
      `This year: projected year-end cash is ${formatCurrency(snapshot.projectedYearEndCash)} after estimated operating costs and 12 months of EMIs.`,
      `Loan balance still to manage: ${formatCurrency(snapshot.totalLoanBalance)}.`,
      snapshot.projectedYearEndCash < 0
        ? 'Year plan: collect pending sales, pause expansion spending, split large purchases, and avoid new loans unless they directly increase harvest revenue.'
        : 'Year plan: keep EMIs current, reserve one month of operating cost, then use surplus for high-return inputs only.',
    ].join('\n');
  }

  if (lower.includes('expense') || lower.includes('cost') || lower.includes('reduce')) {
    return [
      `Your largest expense category is ${snapshot.topExpenseCategory} at ${formatCurrency(snapshot.topExpenseAmount)}.`,
      `Total expenses are ${formatCurrency(snapshot.expenses)}, which is ${snapshot.income ? Math.round((snapshot.expenses / snapshot.income) * 100) : 0}% of recorded income.`,
      'For the next cycle, separate input costs, labor, and transport before harvest so the profit estimate stays accurate.',
    ].join('\n');
  }

  if (lower.includes('budget')) {
    const tightBudgets = budgets.filter((budget) => budget.spent / budget.allocated > 0.7);
    return tightBudgets.length
      ? `Budget watch: ${tightBudgets.map((budget) => budget.name).join(', ')} is above 70% usage. Avoid extra spending there unless it directly protects yield.`
      : `Budget usage is controlled at ${snapshot.budgetUsage}%. You can plan new spending, but keep cash reserve intact.`;
  }

  if (lower.includes('profit') || lower.includes('income')) {
    return [
      `Income is ${formatCurrency(snapshot.income)} and profit is ${formatCurrency(snapshot.profit)}.`,
      snapshot.profit >= 0 ? 'The farm is profitable in the current records.' : 'The farm is currently negative in the current records; delay non-critical purchases.',
      `There are ${transactions.length} transactions in the ledger, so better forecasting will improve as you keep adding entries.`,
    ].join('\n');
  }

  return [
    `Current cash balance is ${formatCurrency(snapshot.cash)} with profit of ${formatCurrency(snapshot.profit)}.`,
    `Main risk: ${snapshot.topExpenseCategory} spending is the biggest cost at ${formatCurrency(snapshot.topExpenseAmount)}. Loan EMIs add ${formatCurrency(snapshot.monthlyLoanPayments)} this month.`,
    'Tell me things like "I paid 3000 loan EMI", or ask for a monthly survival plan, yearly plan, loan check, budget check, or expense review.',
  ].join('\n');
};

type ChatBubbleProps = {
  snapshot: FinanceSnapshot;
  transactions: Transaction[];
  budgets: Budget[];
  sales: Sale[];
  loans: Loan[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onInsight: (insight: string) => void;
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ snapshot, transactions, budgets, sales, loans, onAddTransaction, onInsight }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Tell me about income, expenses, loans, or EMIs. I will update the survival plan from your current records.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function sendQuery(q: string) {
    const query = q.trim();
    if (!query) return;

    setInput('');
    setLoading(true);

    const parsedTransaction = parseTransactionRequest(query);
    if (parsedTransaction) onAddTransaction(parsedTransaction);

    const reply = generateAssistantReply(query, snapshot, transactions, budgets, loans, parsedTransaction);
    const nextMessages = [
      ...messages,
      { id: String(Date.now()) + '-u', role: 'user' as const, text: query },
      { id: String(Date.now()) + '-a', role: 'assistant' as const, text: reply },
    ];

    setMessages(nextMessages);
    onInsight(reply);
    setLoading(false);
  }

  const quickActions = [
    { id: 'summary', label: 'Summary', query: 'Give me a summary of my farm finances.' },
    { id: 'expenses', label: 'Expense review', query: 'Review my expenses and tell me where to reduce cost.' },
    { id: 'forecast', label: 'This month', query: 'Make a plan to survive this month.' },
    { id: 'year', label: 'This year', query: 'Make a plan to survive this year with my loans.' },
    { id: 'loans', label: 'Loan check', query: 'Check my loans and EMI pressure.' },
    { id: 'budget', label: 'Budget check', query: 'Check my budgets and warn me about overspending.' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button
          aria-label="Open finance assistant"
          onClick={() => setOpen(true)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-2xl shadow-primary/35 transition-transform hover:scale-105"
        >
          <Bot className="h-7 w-7" />
        </button>
      )}

      {open && (
        <div className="flex max-h-[82vh] w-[480px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-emerald-500/15 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <strong>Finance AI</strong>
              <span className="text-xs text-muted-foreground">local advisor</span>
            </div>
            <button aria-label="Close assistant" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 border-b border-border/60 px-3 py-3 text-xs">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <div className="text-muted-foreground">Cash</div>
              <div className="font-semibold">{formatCurrency(snapshot.cash)}</div>
            </div>
            <div className="rounded-lg bg-sky-500/10 p-2">
              <div className="text-muted-foreground">Profit</div>
              <div className="font-semibold">{formatCurrency(snapshot.profit)}</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2">
              <div className="text-muted-foreground">EMI</div>
              <div className="font-semibold">{formatCurrency(snapshot.monthlyLoanPayments)}</div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-auto bg-emerald-500/5 p-3 dark:bg-slate-900">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={"inline-block max-w-[88%] rounded-lg px-3 py-2 shadow-sm " + (message.role === 'user' ? 'bg-primary text-white' : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100')}>
                  <div className="whitespace-pre-wrap text-sm">{message.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 px-3 py-3">
            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
              {quickActions.map((action) => (
                <button key={action.id} onClick={() => sendQuery(action.query)} className="app-chip whitespace-nowrap px-2 py-1 text-xs">
                  {action.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendQuery(input); }}
                placeholder="Ask or say: I paid 3000 loan EMI"
                className="input flex-1"
              />
              <button onClick={() => sendQuery(input)} disabled={loading} className="btn btn-primary btn-md disabled:opacity-60">
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FinancialManagementPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Financial Management - KrishiAI</title>
      </Helmet>
      <div className="app-page">
        <div className="app-page-header">
          <div className="app-page-eyebrow">
            <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
            Farm finance
          </div>
          <h1 className="app-page-title">Financial Management</h1>
          <p className="app-page-subtitle">Track income, expenses, budgets, sales, and cash flow with AI-assisted planning.</p>
        </div>

        <DemoFinancialContent />
      </div>
    </>
  );
};

export default FinancialManagementPage;

const DemoFinancialContent: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => readStoredTransactions());

  const [budgets] = useState<Budget[]>([]);
  const [sales] = useState<Sale[]>([]);
  const [loans] = useState<Loan[]>([]);

  const [form, setForm] = useState<Partial<Transaction>>({ date: today(), type: 'expense', category: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction> | null>(null);
  const [assistantInsight, setAssistantInsight] = useState('Ask the finance AI for a monthly survival plan, yearly plan, loan check, expense review, or budget check. It can also add entries from messages like "I paid 3000 loan EMI".');

  const snapshot = getFinanceSnapshot(transactions, budgets, sales, loans);

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  useEffect(() => {
    try {
      window.localStorage.setItem(getUserStorageKey(FINANCE_STORAGE_KEY), JSON.stringify(transactions));
      window.dispatchEvent(new CustomEvent('krishiai:data-updated', { detail: { source: 'financial' } }));
    } catch {}
  }, [transactions]);

  function addTransaction(transaction: Omit<Transaction, 'id'>) {
    const id = 't' + Math.random().toString(36).slice(2, 9);
    setTransactions([{ ...transaction, id }, ...transactions]);
  }

  function handleAddTransaction(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.date || !form.type || !form.category || !form.amount) {
      alert('Please provide date, type, category and amount (>0)');
      return;
    }
    if ((form.amount || 0) <= 0) {
      alert('Amount must be greater than 0');
      return;
    }
    addTransaction(form as Omit<Transaction, 'id'>);
    setForm({ date: today(), type: 'expense', category: '', amount: 0 });
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id);
    setEditForm({ ...t });
  }

  function saveEdit(id: string) {
    if (!editForm) return;
    if (!editForm.date || !editForm.type || !editForm.category || !(editForm.amount && editForm.amount > 0)) {
      alert('Invalid values');
      return;
    }
    setTransactions(transactions.map((t) => t.id === id ? ({ ...(editForm as Transaction), id }) : t));
    setEditingId(null);
    setEditForm(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return;
    setTransactions(transactions.filter((t) => t.id !== id));
  }

  const sparkVals = [3000, 4200, 5000, 3600, 6200, 5400, 7200];
  const sparkMax = Math.max(...sparkVals);
  const sparkPath = sparkVals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (sparkVals.length - 1)) * 100} ${100 - (v / sparkMax) * 100}`).join(' ');
  const reserveTarget = Math.max(snapshot.expenses * 0.35, 5000);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="app-stat-card bg-gradient-to-br from-emerald-600 to-teal-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-90">Cash Balance</div>
              <div className="mt-1 text-2xl font-bold">{formatCurrency(snapshot.cash)}</div>
            </div>
            <DollarSign className="h-7 w-7 opacity-90" />
          </div>
          <div className="mt-3 text-xs opacity-80">Projected next 30 days</div>
        </div>

        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Income (YTD)</div>
              <div className="mt-1 text-xl font-semibold">{formatCurrency(snapshot.income)}</div>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-500" />
          </div>
        </div>

        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Expenses (YTD)</div>
              <div className="mt-1 text-xl font-semibold">{formatCurrency(snapshot.expenses)}</div>
            </div>
            <TrendingDown className="h-6 w-6 text-rose-500" />
          </div>
        </div>

        <div className="app-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Profit</div>
              <div className="mt-1 text-xl font-semibold">{formatCurrency(snapshot.profit)}</div>
            </div>
            <Wheat className="h-6 w-6 text-amber-500" />
          </div>
          <svg className="mt-2 h-8 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={sparkPath} fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="app-panel lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Financial Plan</h3>
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{assistantInsight}</p>
        </div>

        <div className="app-panel">
          <div className="mb-3 flex items-center gap-2">
            {snapshot.survivalCashThisMonth >= reserveTarget ? <Check className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
            <h3 className="text-lg font-semibold">Next 30 Days</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Survival cash</span><span className="font-semibold">{formatCurrency(snapshot.survivalCashThisMonth)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monthly EMI</span><span className="font-semibold">{formatCurrency(snapshot.monthlyLoanPayments)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reserve target</span><span className="font-semibold">{formatCurrency(reserveTarget)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Budget usage</span><span className="font-semibold">{snapshot.budgetUsage}%</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="app-panel lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Transactions</h3>
            <div className="flex items-center gap-2">
              <input placeholder="Search" className="input h-9 max-w-40" />
              <button className="btn btn-primary btn-sm">Export</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md">
            <table className="app-table table-fixed">
              <thead>
                <tr>
                  <th className="w-[120px] pb-3">Date</th>
                  <th className="w-[90px] pb-3">Type</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Crop / Field</th>
                  <th className="w-[140px] pb-3">Amount</th>
                  <th className="w-[110px] pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-emerald-500/5">
                    <td>{formatDate(t.date)}</td>
                    <td>{t.type === 'income' ? <span className="font-medium text-green-700 dark:text-green-300">Income</span> : <span className="font-medium text-rose-600 dark:text-rose-300">Expense</span>}</td>
                    <td>{t.category}</td>
                    <td>{t.crop ? `${t.crop} / ${t.field || '-'}` : (t.field || '-')}</td>
                    <td className="text-right font-semibold">{formatCurrency(t.amount)}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => startEdit(t)} className="btn btn-outline btn-sm h-8 px-2 text-xs">Edit</button>
                        <button onClick={() => deleteTransaction(t.id)} className="btn btn-outline btn-sm h-8 px-2 text-xs text-rose-600 dark:text-rose-300">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingId && editForm && (
            <div className="app-panel-compact mt-4">
              <h4 className="mb-2 font-medium text-slate-800 dark:text-slate-100">Edit transaction</h4>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="input h-9 w-auto" />
                <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'income' | 'expense' })} className="input h-9 w-auto">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <input placeholder="Category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="input h-9 w-auto" />
                <input type="number" placeholder="Amount" value={String(editForm.amount || '')} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} className="input h-9 w-28" />
                <div className="ml-auto flex gap-2">
                  <button onClick={() => saveEdit(editingId)} className="btn btn-primary btn-sm">Save</button>
                  <button onClick={cancelEdit} className="btn btn-outline btn-sm">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="app-panel">
          <h4 className="mb-3 font-semibold">Add Transaction</h4>
          <form onSubmit={handleAddTransaction} className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })} className="input">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <input placeholder="Category (e.g., Fertilizer)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
              <input type="number" placeholder="Amount" value={String(form.amount || '')} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input" />
              <input placeholder="Notes (optional)" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-md flex-1">Add Transaction</button>
              <button type="button" onClick={() => setForm({ date: today(), type: 'expense', category: '', amount: 0 })} className="btn btn-outline btn-md">Reset</button>
            </div>
          </form>

          <div className="mt-6">
            <h5 className="mb-2 text-sm font-medium">Budgets</h5>
            {budgets.map((budget) => {
              const pct = Math.round((budget.spent / budget.allocated) * 100);
              return (
                <div key={budget.id} className="mb-3">
                  <div className="flex justify-between text-sm"><div>{budget.name}</div><div className="font-medium">{formatCurrency(budget.allocated)}</div></div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-200">
                    <div style={{ width: `${Math.min(pct, 100)}%` }} className="h-2 bg-primary" />
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{pct}% used ({formatCurrency(budget.spent)})</div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <h5 className="mb-2 text-sm font-medium">Loans & EMIs</h5>
            <ul className="space-y-2 text-sm">
              {loans.map((loan) => (
                <li key={loan.id} className="rounded-md border border-border/60 p-2">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-medium">{loan.lender}</div>
                      <div className="text-xs text-slate-400">{loan.purpose} - due day {loan.dueDay}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(loan.emi)}</div>
                      <div className={loan.status === 'overdue' ? 'text-xs text-rose-500' : loan.status === 'due-soon' ? 'text-xs text-amber-500' : 'text-xs text-emerald-500'}>
                        {loan.status.replace('-', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Balance</span>
                    <span>{formatCurrency(loan.balance)} at {loan.interestRate}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h5 className="mb-2 text-sm font-medium">Recent Sales</h5>
            <ul className="space-y-2 text-sm">
              {sales.map((sale) => (
                <li key={sale.id} className="flex justify-between">
                  <div>
                    <div className="font-medium">{sale.crop}</div>
                    <div className="text-xs text-slate-400">{formatDate(sale.date)} - {sale.quantity}{sale.unit}</div>
                  </div>
                  <div className="font-medium">{formatCurrency(sale.total)}</div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <ChatBubble
        snapshot={snapshot}
        transactions={transactions}
        budgets={budgets}
        sales={sales}
        loans={loans}
        onAddTransaction={addTransaction}
        onInsight={setAssistantInsight}
      />
    </div>
  );
};
