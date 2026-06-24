import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function Signup({ onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('ERROR: All fields are required!');
      return;
    }
    if (password !== confirmPassword) {
      setError('ERROR: Passwords do not match!');
      return;
    }
    if (!agreeTerms) {
      setError('ERROR: You must agree to retro netiquette!');
      return;
    }
    setError('');
    
    const sendData = async () => {
      try {
        const data = { name, email, password };
        const res = await axios.post(`${API_BASE_URL}/api/auth/register`, data);
        if (res.data && res.data.token) {
          localStorage.setItem('payme_token', res.data.token);
          localStorage.setItem('payme_user', JSON.stringify(res.data.user));
          onSubmit?.(res.data.user);
        } else {
          const mockUser = { name, email };
          localStorage.setItem('payme_user', JSON.stringify(mockUser));
          onSubmit?.(mockUser);
        }
      } catch (err) {
        console.error("Signup error:", err);
        if (err.code === "ERR_NETWORK" || err.response?.status === 404) {
          const mockUser = { name, email };
          localStorage.setItem('payme_user', JSON.stringify(mockUser));
          onSubmit?.(mockUser);
        } else {
          setError(err.response?.data?.message || 'ERROR: Account registration failed!');
        }
      }
    };
    sendData();
  };

  return (
    <div className="w-full max-w-md bg-[#94FFD8] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 relative overflow-hidden transition-all duration-300">
      {/* Decorative tape effect */}
      <div className="absolute top-0 right-12 transform translate-y-[-50%] rotate-3 bg-black text-yellow-300 font-mono text-[10px] uppercase font-bold py-0.5 px-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        NEW_USER.SYS
      </div>

      {/* Header Info */}
      <div className="mb-3 mt-1">
        <span className="bg-black text-pink-400 text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-wider">
          REGISTRATION_PORTAL
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-black mt-1.5 leading-none uppercase tracking-tight">
          Create <span className="bg-yellow-300 px-1 border border-black">Account</span>
        </h2>
      </div>

      {error && (
        <div className="bg-rose-300 border-2 border-black p-2 mb-3.5 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
          <span className="bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-sans">!</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1 font-mono">
            FULL NAME:
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border-3 border-black p-2 font-semibold text-black placeholder-gray-500 focus:outline-none focus:bg-yellow-55 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-1 focus:-translate-y-1 transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1 font-mono">
            EMAIL ADDRESS:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border-3 border-black p-2 font-semibold text-black placeholder-gray-500 focus:outline-none focus:bg-yellow-55 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-1 focus:-translate-y-1 transition-all"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1 font-mono">
            CHOOSE PASSWORD:
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border-3 border-black p-2 font-semibold text-black placeholder-gray-500 focus:outline-none focus:bg-yellow-55 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-1 focus:-translate-y-1 transition-all"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1 font-mono">
            CONFIRM PASSWORD:
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-white border-3 border-black p-2 font-semibold text-black placeholder-gray-500 focus:outline-none focus:bg-yellow-55 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-x-1 focus:-translate-y-1 transition-all"
            placeholder="••••••••"
          />
        </div>

        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="sr-only peer"
            />
            <span className="w-5 h-5 shrink-0 border-3 border-black bg-white flex items-center justify-center font-bold text-black peer-checked:bg-pink-400 transition-colors mt-0.5">
              {agreeTerms && '✓'}
            </span>
            <span className="text-[10px] font-bold uppercase font-mono group-hover:underline text-gray-800 leading-tight">
              I agree to retro netiquette.
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-yellow-300 border-3 border-black py-2.5 px-4 font-extrabold uppercase tracking-widest text-base shadow-[4px_4px_0px_0px_rgba(255,118,206,1)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(255,118,206,1)] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0px_0px_rgba(255,118,206,1)] transition-all cursor-pointer mt-2"
        >
          INITIALIZE_SIGNUP.EXE
        </button>
      </form>

      <div className="mt-4 pt-3 border-t-2 border-dashed border-black text-center">
        <p className="text-xs font-bold text-gray-700">
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link
            to="/login"
            className="text-pink-600 hover:text-pink-700 underline font-mono font-extrabold focus:outline-none uppercase tracking-wide cursor-pointer"
          >
            Access Console [LOGIN]
          </Link>
        </p>
      </div>
    </div>
  );
}
