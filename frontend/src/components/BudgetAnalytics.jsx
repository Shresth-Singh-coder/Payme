import React from 'react';

const CATEGORY_COLORS = {
  'Food & Dining': '#FF76CE',      // Neo Pink
  'Groceries': '#FFDE47',          // Neo Yellow
  'Bills & Utilities': '#94FFD8',   // Neo Green/Mint
  'Shopping': '#38BDF8',            // Neo Blue
  'Entertainment': '#A855F7',       // Neo Purple
  'Travel & Transport': '#FB923C',  // Neo Orange
  'Other': '#94A3B8'                // Slate
};

const getCategoryColor = (category) => {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  
  // Stable color hash function matching neobrutalism aesthetics
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 85%, 60%)`;
};

export default function BudgetAnalytics({ transactions, accounts }) {
  // Identify user's account IDs/numbers for debit tracking
  const userAccountIds = accounts.map(a => a._id);
  const userAccountNums = accounts.map(a => a.accountNumber);

  // Calculate expenses by category
  const categoryExpenses = {
    'Food & Dining': 0,
    'Groceries': 0,
    'Bills & Utilities': 0,
    'Shopping': 0,
    'Entertainment': 0,
    'Travel & Transport': 0,
    'Other': 0
  };

  let totalExpenses = 0;

  transactions.forEach(tx => {
    // If the source of funds is one of the user's accounts, count it as a debit/expense
    const isUserDebit = userAccountIds.includes(tx.fromAccount) || userAccountNums.includes(tx.fromAccountNumber);
    
    if (isUserDebit && tx.status === 'COMPLETED') {
      const cat = tx.category || 'Other';
      if (cat !== 'Transfer' && cat !== 'Salary') {
        if (categoryExpenses[cat] === undefined) {
          categoryExpenses[cat] = 0;
        }
        categoryExpenses[cat] += tx.amount;
        totalExpenses += tx.amount;
      }
    }
  });

  // Calculate SVG Donut Chart parameters
  // Circle radius r = 50, circumference C = 314.159
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;
  const chartSegments = Object.entries(categoryExpenses)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => {
      const percent = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
      const strokeLength = (percent / 100) * circumference;
      const strokeOffset = -(accumulatedPercent / 100) * circumference;
      accumulatedPercent += percent;
      
      return {
        category,
        value,
        percent,
        strokeLength,
        strokeOffset,
        color: getCategoryColor(category)
      };
    });

  return (
    <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      
      {/* LEFT: DONUT EXPENSE CHART (5 COLS) */}
      <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-black font-mono uppercase tracking-wider mb-2">EXPENSE OUTFLOW</h3>
        
        {totalExpenses > 0 ? (
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Donut */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="#FAF8F5"
                strokeWidth="14"
              />
              {chartSegments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={`${seg.strokeLength} ${circumference}`}
                  strokeDashoffset={seg.strokeOffset}
                  className="transition-all duration-500 hover:stroke-[16] cursor-pointer"
                  style={{ transformOrigin: '60px 60px' }}
                />
              ))}
            </svg>
            
            {/* Donut Center Cutout */}
            <div className="absolute bg-[#FAF8F5] border-3 border-black w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">Total Spent</span>
              <span className="text-base font-black truncate max-w-[100px] text-black">
                ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        ) : (
          <div className="border-4 border-dashed border-black w-40 h-40 rounded-full flex flex-col items-center justify-center p-4 bg-amber-50">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">NO DEBITS</span>
            <span className="text-[9px] text-gray-400 font-mono mt-1">Transactions will plot here</span>
          </div>
        )}

        {/* Legend */}
        {totalExpenses > 0 && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4 max-w-sm">
            {chartSegments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase">
                <span className="w-2.5 h-2.5 border border-black" style={{ backgroundColor: seg.color }} />
                <span>{seg.category.split(' ')[0]} ({seg.percent.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: EXPENSES BY CATEGORY (7 COLS) */}
      <div className="md:col-span-7 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b-2 border-dashed border-black mb-3">
          <h3 className="text-sm font-black font-mono uppercase tracking-wider">CATEGORY EXPENSES</h3>
          <span className="bg-black text-[#94FFD8] text-[9px] font-mono px-1.5 py-0.5 border border-black uppercase font-bold">
            STATS.EXE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
          {Object.entries(categoryExpenses).map(([category, spent]) => {
            return (
              <div key={category} className="bg-amber-50/30 border-2 border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center hover:bg-amber-50/60 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-black shrink-0" style={{ backgroundColor: getCategoryColor(category) }} />
                  <span className="text-[10px] font-mono font-black uppercase text-black">{category}</span>
                </div>
                <span className="text-xs font-black text-black">
                  ₹{spent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
