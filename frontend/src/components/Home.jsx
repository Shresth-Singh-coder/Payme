import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import QRScannerModal from './QRScannerModal';

const API_BASE = `${API_BASE_URL}/api`;

export default function Home({ currentUser, onLogout }) {
  const navigate = useNavigate();
  
  // App states
  const [mode, setMode] = useState('sandbox');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Account State
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);

  // Transaction Form State
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [externalAccount, setExternalAccount] = useState('');
  const [isExternal, setIsExternal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Transfer');
  const [description, setDescription] = useState('');

  // QR Scanner Modal State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Handle QR scanner auto-fill callback
  const handleQRAutoFill = ({ toAccount: scannedVpa, amount: scannedAmount, description: scannedDesc }) => {
    setIsExternal(true);
    setExternalAccount(scannedVpa);
    setAmount(scannedAmount || '');
    setCategory('Transfer');
    setDescription(scannedDesc || '');
    
    // Attempt to pre-select a source account if none selected
    if (!fromAccount && accounts.length > 0) {
      setFromAccount(accounts[0]._id);
    }
    
    setSuccess(`Auto-filled details for payment to ${scannedVpa}.`);
  };

  // Transaction List State
  const [transactions, setTransactions] = useState([]);
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState('ALL');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('ALL');

  // Account Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('Checking');

  // Check backend server availability
  useEffect(() => {
    const checkServer = async () => {
      try {
        await axios.get(API_BASE_URL);
        setIsBackendOnline(true);
        setMode('backend');
      } catch (err) {
        setIsBackendOnline(false);
        setMode('sandbox');
      }
    };
    checkServer();
  }, []);

  // Configure axios authorization token
  useEffect(() => {
    const token = localStorage.getItem('payme_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [mode]);

  // Load account data and transactions
  useEffect(() => {
    if (mode === 'sandbox') {
      loadSandboxData();
    } else {
      loadBackendData(selectedAccountFilter);
    }
  }, [mode, selectedAccountFilter]);

  // Load local sandbox simulated data
  const loadSandboxData = () => {
    const sandboxUser = currentUser || { name: 'Retro User', email: 'retro@payme.sys' };
    const userKey = `payme_sb_accs_${sandboxUser.email}`;
    const txKey = `payme_sb_txs_${sandboxUser.email}`;

    let sbAccounts = JSON.parse(localStorage.getItem(userKey));
    if (!sbAccounts || sbAccounts.length === 0) {
      sbAccounts = [
        { _id: 'acc_ch_7402', name: 'Main Checking', type: 'Checking', currency: 'INR', balance: 50000, accountNumber: '5820491047', status: 'ACTIVE' },
        { _id: 'acc_sa_9104', name: 'Retro Savings', type: 'Savings', currency: 'INR', balance: 120000, accountNumber: '9104829471', status: 'ACTIVE' },
        { _id: 'acc_wa_1120', name: 'Pocket Wallet', type: 'Wallet', currency: 'INR', balance: 8500, accountNumber: '1120485910', status: 'ACTIVE' }
      ];
      localStorage.setItem(userKey, JSON.stringify(sbAccounts));
    }

    let sbTxs = JSON.parse(localStorage.getItem(txKey));
    if (!sbTxs || sbTxs.length === 0) {
      sbTxs = [
        {
          _id: 'tx_sb_001',
          fromAccount: 'acc_sa_9104',
          fromName: 'Retro Savings',
          fromAccountNumber: '9104829471',
          toAccount: 'acc_ch_7402',
          toName: 'Main Checking',
          toAccountNumber: '5820491047',
          amount: 15000,
          category: 'Transfer',
          description: 'Transfer to Checking wallet',
          status: 'COMPLETED',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      localStorage.setItem(txKey, JSON.stringify(sbTxs));
    }

    setAccounts(sbAccounts);
    setTransactions(sbTxs);
    setTotalBalance(sbAccounts.reduce((sum, acc) => sum + acc.balance, 0));
  };

  // Load server database data
  const loadBackendData = async (accFilter = 'ALL') => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/accounts`);
      const backendAccounts = res.data.accounts || [];

      const accountsWithBalances = await Promise.all(
        backendAccounts.map(async (acc) => {
          try {
            const balRes = await axios.get(`${API_BASE}/accounts/balance/${acc._id}`);
            return {
              ...acc,
              name: acc.name || `Account (${acc.currency})`,
              balance: balRes.data.balance || 0
            };
          } catch (e) {
            return {
              ...acc,
              name: `Account (${acc.currency})`,
              balance: 0
            };
          }
        })
      );

      setAccounts(accountsWithBalances);
      setTotalBalance(accountsWithBalances.reduce((sum, acc) => sum + acc.balance, 0));

      let txUrl = `${API_BASE}/transactions`;
      if (accFilter !== 'ALL') {
        txUrl += `?accountId=${accFilter}`;
      }
      const txRes = await axios.get(txUrl);
      setTransactions(txRes.data.transactions || []);

    } catch (err) {
      setError('Sync failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Handle Account Creation
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'sandbox') {
      if (!newAccName) {
        setError('ERROR: Account Name is required!');
        return;
      }
      
      const newAcc = {
        _id: 'acc_' + Math.random().toString(36).substr(2, 9),
        name: newAccName,
        type: newAccType,
        currency: 'INR',
        balance: 0, 
        accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        status: 'ACTIVE'
      };

      const userKey = `payme_sb_accs_${(currentUser?.email || 'retro@payme.sys')}`;
      const updated = [...accounts, newAcc];
      localStorage.setItem(userKey, JSON.stringify(updated));
      setAccounts(updated);
      setTotalBalance(updated.reduce((sum, acc) => sum + acc.balance, 0));

      setSuccess(`Account initialized! Account Number: ${newAcc.accountNumber}`);
      setNewAccName('');
      setShowCreateForm(false);
    } else {
      setLoading(true);
      try {
        const res = await axios.post(`${API_BASE}/accounts`, {});
        const newAcc = res.data.account;
        
        setSuccess(`Account initialized! Account Number: ${newAcc.accountNumber || newAcc._id.slice(-10)}`);
        setShowCreateForm(false);
        loadBackendData();
      } catch (err) {
        setError('Create account failed: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle transaction processing with Neo-Brutalist loading overlay
  const handleMakeTransaction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fromAccount) {
      setError('Select a source account.');
      return;
    }

    const sourceAcc = accounts.find(a => a._id === fromAccount);
    if (!sourceAcc) {
      setError('Invalid source account.');
      return;
    }

    const txAmount = parseFloat(amount);
    if (isNaN(txAmount) || txAmount <= 0) {
      setError('Amount must be positive.');
      return;
    }

    if (sourceAcc.balance < txAmount) {
      setError(`Insufficient funds in source account! (Available: ₹${sourceAcc.balance.toFixed(2)})`);
      return;
    }

    const destAccId = isExternal ? externalAccount.trim() : toAccount;
    if (!destAccId) {
      setError('Specify a destination account.');
      return;
    }

    if (!isExternal && destAccId === fromAccount) {
      setError('Cannot transfer to the same account.');
      return;
    }

    setIsTransacting(true);

    const idKey = 'idempotency_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

    if (mode === 'sandbox') {
      setTimeout(() => {
        const destAcc = accounts.find(a => a._id === destAccId);
        const userKey = `payme_sb_accs_${(currentUser?.email || 'retro@payme.sys')}`;
        const txKey = `payme_sb_txs_${(currentUser?.email || 'retro@payme.sys')}`;

        const updatedAccounts = accounts.map(acc => {
          if (acc._id === fromAccount) return { ...acc, balance: acc.balance - txAmount };
          if (!isExternal && acc._id === destAccId) return { ...acc, balance: acc.balance + txAmount };
          return acc;
        });

        localStorage.setItem(userKey, JSON.stringify(updatedAccounts));
        setAccounts(updatedAccounts);
        setTotalBalance(updatedAccounts.reduce((sum, acc) => sum + acc.balance, 0));

        const newTx = {
          _id: 'tx_sb_' + Math.random().toString(36).substr(2, 9),
          fromAccount: fromAccount,
          fromName: sourceAcc.name,
          fromAccountNumber: sourceAcc.accountNumber,
          toAccount: destAccId,
          toName: isExternal ? `${destAccId} (External)` : (destAcc ? destAcc.name : 'Unknown Account'),
          toAccountNumber: isExternal ? destAccId : (destAcc ? destAcc.accountNumber : destAccId.slice(-10)),
          amount: txAmount,
          category: category,
          description: description || `Transfer to ${isExternal ? destAccId : (destAcc ? destAcc.name : destAccId.slice(-6))}`,
          status: 'COMPLETED',
          createdAt: new Date().toISOString()
        };

        const updatedTxs = [newTx, ...transactions];
        localStorage.setItem(txKey, JSON.stringify(updatedTxs));
        setTransactions(updatedTxs);

        setIsTransacting(false);
        setSuccess('Transaction posted successfully.');
        setAmount('');
        setDescription('');
        setToAccount('');
        setExternalAccount('');
      }, 3000);
    } else {
      try {
        const payload = {
          fromAccount,
          toAccount: destAccId,
          amount: txAmount,
          idempotencyKey: idKey
        };

        await axios.post(`${API_BASE}/transactions`, payload);
        setSuccess('Transaction posted successfully.');
        loadBackendData(selectedAccountFilter);
        setAmount('');
        setDescription('');
        setToAccount('');
        setExternalAccount('');
      } catch (err) {
        setError('Transaction failed: ' + (err.response?.data?.message || err.message));
      } finally {
        setIsTransacting(false);
      }
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (selectedAccountFilter !== 'ALL') {
      const filteredAcc = accounts.find(a => a._id === selectedAccountFilter);
      const filterAccNum = filteredAcc ? filteredAcc.accountNumber : selectedAccountFilter;
      if (
        tx.fromAccount !== selectedAccountFilter &&
        tx.toAccount !== selectedAccountFilter &&
        tx.fromAccountNumber !== filterAccNum &&
        tx.toAccountNumber !== filterAccNum
      ) {
        return false;
      }
    }
    if (txFilter !== 'ALL' && tx.category.toUpperCase() !== txFilter) return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      return tx.fromName?.toLowerCase().includes(q) ||
             tx.toName?.toLowerCase().includes(q) ||
             tx.fromAccountNumber?.includes(q) ||
             tx.toAccountNumber?.includes(q) ||
             tx.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const getAccountColor = (index) => {
    const colors = ['bg-yellow-300', 'bg-[#94FFD8]', 'bg-[#FF76CE]', 'bg-cyan-300'];
    return colors[index % colors.length];
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 font-sans text-black">
      
      {/* SIMPLE LOADER OVERLAY */}
      {isTransacting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 pointer-events-auto">
          <div className="bg-[#FAF8F5] border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
              PROCESSING.EXE
            </span>
          </div>
        </div>
      )}

      {/* FLOATING STATUS TOASTS */}
      <div className="fixed top-6 right-6 z-50 space-y-3 max-w-sm w-full pointer-events-none">
        {error && (
          <div className="bg-rose-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3 pointer-events-auto">
            <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 font-sans font-bold">!</span>
            <div className="flex-1 font-mono text-xs font-bold text-black">{error}</div>
            <button onClick={() => setError('')} className="font-extrabold cursor-pointer hover:text-white text-xs">✕</button>
          </div>
        )}

        {success && (
          <div className="bg-emerald-300 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3 pointer-events-auto">
            <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 font-sans font-bold">✓</span>
            <div className="flex-1 font-mono text-xs font-bold text-black">{success}</div>
            <button onClick={() => setSuccess('')} className="font-extrabold cursor-pointer hover:text-white text-xs">✕</button>
          </div>
        )}
      </div>

      {/* CLEAN COMPACT HEADER */}
      <div className="bg-[#FF76CE] border-4 border-black p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight leading-none">
            PAYME // CONSOLE
          </h1>
          <p className="text-xs font-mono font-bold mt-1 text-black">
            OPERATOR: {currentUser?.name || 'USER'} ({currentUser?.email}) | MODE: <span className="bg-white px-1 border border-black uppercase">{mode === 'backend' ? 'Live DB' : 'Sandbox'}</span>
          </p>
        </div>
        <button
          onClick={onLogout}
          className="bg-black text-white hover:bg-red-500 hover:text-black border-2 border-black px-4 py-1.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
        >
          DISCONNECT.EXE
        </button>
      </div>

      {/* COMBINED BALANCE CARD */}
      <div className="bg-white border-4 border-black p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider block">COMBINED VALUE RESERVES</span>
        <div className="text-3xl font-black mt-1">
          {accounts.some(a => a.accountNumber === "0000000000") ? "₹ Unlimited" : `₹ ${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>
      </div>

      {/* TWO COLUMN GRID FOR ACCOUNTS & TRANSFER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ACCOUNTS AREA (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black uppercase">Wallets</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-black text-white hover:bg-yellow-300 hover:text-black border-2 border-black px-4 py-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                {showCreateForm ? 'CANCEL' : 'CREATE_ACCOUNT'}
              </button>
            </div>

            {/* Simpler Add Account Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateAccount} className="mt-4 p-4 border-2 border-dashed border-black bg-amber-50 space-y-3">
                <span className="bg-black text-pink-400 text-[9px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-wider block w-max">
                  NEW_ACCOUNT
                </span>

                {mode === 'sandbox' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-black uppercase">Account Name:</label>
                      <input
                        type="text"
                        required
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        placeholder="e.g. My Savings Vault"
                        className="w-full bg-white border-2 border-black p-1.5 font-bold font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-black uppercase">Type:</label>
                      <select
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value)}
                        className="w-full bg-white border-2 border-black p-1.5 font-bold font-mono text-xs focus:outline-none"
                      >
                        <option value="Checking">Checking</option>
                        <option value="Savings">Savings</option>
                        <option value="Wallet">Wallet</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-gray-800">
                    Create a new secure bank account linked to your profile.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="border-2 border-black bg-black text-[#94FFD8] hover:bg-cyan-400 hover:text-black px-4 py-1.5 font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    {loading ? 'POSTING...' : 'CONFIRM_INITIALIZE'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Accounts Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.length === 0 ? (
              <div className="col-span-full bg-white border-4 border-black border-dashed p-8 text-center">
                <p className="font-mono text-xs font-bold text-gray-500 uppercase">NO_WALLETS_FOUND</p>
              </div>
            ) : (
              accounts.map((acc, index) => (
                <div
                  key={acc._id}
                  className={`${getAccountColor(index)} border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between h-36`}
                >
                  <div className="flex justify-between items-start">
                    <span className="bg-black text-white text-[8px] font-mono px-1.5 py-0.5 border border-black uppercase font-bold">
                      {acc.type || 'Checking'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gray-800">
                      NO: {acc.accountNumber || acc._id.slice(-10)}
                    </span>
                  </div>
                  <h3 className="text-base font-black truncate text-black uppercase leading-none mt-2">
                    {acc.accountNumber === "0000000000" ? "System Core Vault" : (acc.name || `Wallet (${acc.currency})`)}
                  </h3>
                  <div className="mt-4">
                    <span className="text-[9px] font-mono font-bold text-gray-700 uppercase block">Available Balance:</span>
                    <div className="text-xl font-black text-black leading-none mt-0.5">
                      {acc.accountNumber === "0000000000" ? "₹ Unlimited" : `₹ ${acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TRANSACTION FORM (5 COLS) */}
        <div className="lg:col-span-5">
          <div className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <span className="bg-black text-yellow-300 text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-wider">
              LEDGER_POSTING
            </span>
            <div className="flex justify-between items-center mt-1.5 mb-2">
              <h2 className="text-2xl font-black uppercase leading-none">
                Transfer Funds
              </h2>
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className="bg-yellow-300 text-black hover:bg-black hover:text-[#94FFD8] border-2 border-black px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                SCAN QR
              </button>
            </div>

            <form onSubmit={handleMakeTransaction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">From Account:</label>
                <select
                  required
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                >
                  <option value="">-- SELECT WALLET --</option>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.accountNumber === "0000000000" ? "System Core Vault" : (acc.name || 'Wallet')} (No: {acc.accountNumber}) - {acc.accountNumber === "0000000000" ? "₹ Unlimited" : `₹${acc.balance.toFixed(2)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode switch */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsExternal(false)}
                  className={`flex-1 border-2 border-black py-1 font-mono text-[9px] font-bold uppercase cursor-pointer ${
                    !isExternal ? 'bg-black text-[#94FFD8]' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  INTERNAL
                </button>
                <button
                  type="button"
                  onClick={() => setIsExternal(true)}
                  className={`flex-1 border-2 border-black py-1 font-mono text-[9px] font-bold uppercase cursor-pointer ${
                    isExternal ? 'bg-black text-[#94FFD8]' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  EXTERNAL TO NO
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">To Account:</label>
                {isExternal ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter 10-digit account number"
                    value={externalAccount}
                    onChange={(e) => setExternalAccount(e.target.value)}
                    className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                  />
                ) : (
                  <select
                    required
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                  >
                    <option value="">-- SELECT TARGET WALLET --</option>
                    {accounts
                      .filter(acc => acc._id !== fromAccount)
                      .map(acc => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name || 'Wallet'} (No: {acc.accountNumber || acc._id.slice(-6)})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Amount (₹):</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                  >
                    <option value="Transfer">Transfer</option>
                    <option value="Food">Food</option>
                    <option value="Bills">Bills</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Salary">Salary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Memo:</label>
                <input
                  type="text"
                  placeholder="Memo / Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                />
              </div>

              {error && (
                <div className="bg-rose-100 border-2 border-black p-2 font-mono text-[10px] font-bold text-red-700">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isTransacting}
                className="w-full bg-black text-[#94FFD8] border-3 border-black py-2.5 font-extrabold uppercase tracking-widest text-sm shadow-[4px_4px_0px_0px_rgba(255,118,206,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(255,118,206,1)] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_rgba(255,118,206,1)] transition-all cursor-pointer"
              >
                {isTransacting ? 'TRANSACTING...' : 'POST_TRANSFER.EXE'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* TRANSACTION ACTIVITY LEDGER (FULL WIDTH) */}
      <div className="bg-white border-4 border-black p-5 mt-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-dashed border-black">
          <h2 className="text-2xl font-black uppercase">Recent Activity</h2>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search memo, accounts..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="bg-white border-2 border-black px-2 py-1 font-mono text-xs font-semibold focus:outline-none"
            />
            <select
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              className="bg-white border-2 border-black px-2 py-1 font-mono text-xs font-bold focus:outline-none"
            >
              <option value="ALL">ALL WALLETS</option>
              {accounts.map(acc => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountNumber === "0000000000" ? "System Core Vault" : (acc.name || 'Wallet')} ({acc.accountNumber || acc._id.slice(-10)})
                </option>
              ))}
            </select>
            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              className="bg-white border-2 border-black px-2 py-1 font-mono text-xs font-bold focus:outline-none"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="TRANSFER">TRANSFERS</option>
              <option value="FOOD">FOOD</option>
              <option value="BILLS">BILLS</option>
              <option value="ENTERTAINMENT">ENTERTAINMENT</option>
              <option value="SHOPPING">SHOPPING</option>
              <option value="SALARY">SALARY</option>
              <option value="OTHER">OTHERS</option>
            </select>
          </div>
        </div>

        {/* FEED TABLE */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-3 border-black font-mono text-xs text-left text-gray-500">
                <th className="pb-2 font-bold text-black uppercase">Timestamp</th>
                <th className="pb-2 font-bold text-black uppercase">Debit From</th>
                <th className="pb-2 font-bold text-black uppercase">Credit To</th>
                <th className="pb-2 font-bold text-black uppercase">Category</th>
                <th className="pb-2 font-bold text-black uppercase">Memo</th>
                <th className="pb-2 font-bold text-black uppercase text-right">Amount</th>
                <th className="pb-2 font-bold text-black uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-dashed divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center font-mono text-xs text-gray-500 font-bold uppercase">
                    NO_LEDGER_ENTRIES
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx._id} className="text-xs font-semibold text-black hover:bg-gray-50">
                    <td className="py-3 font-mono text-gray-500">
                      {new Date(tx.createdAt || Date.now()).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono">
                      {tx.fromName || 'UNKNOWN'}
                      <span className="block text-[10px] text-gray-400">NO: {tx.fromAccountNumber || 'SYSTEM'}</span>
                    </td>
                    <td className="py-3 font-mono">
                      {tx.toName || 'UNKNOWN'}
                      <span className="block text-[10px] text-gray-400">NO: {tx.toAccountNumber || 'SYSTEM'}</span>
                    </td>
                    <td className="py-3">
                      <span className="bg-black text-[#94FFD8] px-1.5 py-0.5 border border-black text-[9px] font-mono font-bold uppercase">
                        {tx.category || 'Transfer'}
                      </span>
                    </td>
                    <td className="py-3 italic text-gray-700">
                      {tx.description}
                    </td>
                    <td className="py-3 font-mono text-right text-sm font-extrabold">
                      ₹ {tx.amount.toFixed(2)}
                    </td>
                    <td className="py-3 text-center">
                      <span className="bg-emerald-200 text-emerald-800 border border-emerald-500 px-1 text-[8px] font-mono font-extrabold uppercase">
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onAutoFill={handleQRAutoFill}
      />
    </div>
  );
}
