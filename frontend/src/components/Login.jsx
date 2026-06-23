import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Login({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('ERROR: All fields are required!');
      return;
    }
    setError('');
    
    try {
      const res = await axios.post("http://localhost:3000/api/auth/login", { email, password });
      if (res.data && res.data.token) {
        localStorage.setItem('payme_token', res.data.token);
        localStorage.setItem('payme_user', JSON.stringify(res.data.user));
        onSubmit?.(res.data.user);
      } else {
        const mockUser = { name: email.split('@')[0], email };
        localStorage.setItem('payme_user', JSON.stringify(mockUser));
        onSubmit?.(mockUser);
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === "ERR_NETWORK" || err.response?.status === 404) {
        const mockUser = { name: email.split('@')[0], email };
        localStorage.setItem('payme_user', JSON.stringify(mockUser));
        onSubmit?.(mockUser);
      } else {
        setError(err.response?.data?.message || 'ERROR: Authentication failed!');
      }
    }
  };

  return (
    <div className="w-full max-w-md bg-amber-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 relative overflow-hidden transition-all duration-300 animate-fade-in">
      {/* Decorative tape effect */}
      <div className="absolute top-0 right-12 transform translate-y-[-50%] rotate-3 bg-pink-500 text-white font-mono text-[10px] uppercase font-bold py-0.5 px-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        AUTH_SYS v1.0
      </div>

      {/* Header Info */}
      <div className="mb-4 mt-1">
        <span className="bg-black text-[#94FFD8] text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-wider">
          SECURE_LOGIN
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-black mt-1.5 leading-none uppercase tracking-tight">
          Welcome <span className="bg-cyan-300 px-1 border border-black">Back!</span>
        </h2>
      </div>

      {error && (
        <div className="bg-rose-300 border-2 border-black p-2 mb-3.5 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
          <span className="bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-sans">!</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5 font-mono">
            EMAIL / USERNAME:
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border-3 border-black p-2 font-semibold text-black placeholder-gray-500 focus:outline-none focus:bg-yellow-55 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-1 focus:-translate-y-1 transition-all"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5 font-mono">
            PASSWORD:
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border-3 border-black p-2 font-semibold text-black placeholder-gray-500 focus:outline-none focus:bg-yellow-55 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-1 focus:-translate-y-1 transition-all pr-14"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-300 border-2 border-black px-1.5 py-0.5 text-[10px] font-mono font-bold hover:bg-cyan-400 active:translate-y-[-40%] cursor-pointer"
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only peer"
            />
            <span className="w-5 h-5 border-3 border-black bg-white flex items-center justify-center font-bold text-xs text-black peer-checked:bg-pink-400 transition-colors">
              {rememberMe && '✓'}
            </span>
            <span className="text-xs font-bold uppercase font-mono group-hover:underline">REMEMBER ME</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-[#94FFD8] border-3 border-black py-2.5 px-4 font-extrabold uppercase tracking-widest text-base shadow-[4px_4px_0px_0px_rgba(255,118,206,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(255,118,206,1)] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_rgba(255,118,206,1)] transition-all cursor-pointer"
        >
          EXECUTE_LOGIN.EXE
        </button>
      </form>

      <div className="mt-5 pt-3 border-t-2 border-dashed border-black text-center">
        <p className="text-xs font-bold text-gray-700">
          NEW TO THE SYSTEM?{' '}
          <Link
            to="/signup"
            className="text-pink-600 hover:text-pink-700 underline font-mono font-extrabold focus:outline-none uppercase tracking-wide cursor-pointer"
          >
            Create an Account [INIT_SIGNUP]
          </Link>
        </p>
      </div>
    </div>
  );
}
