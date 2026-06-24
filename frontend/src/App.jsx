import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Home from './components/Home';
import axios from 'axios';
import { API_BASE_URL } from './config';
import './App.css';

// Retro Money Logo SVG Component
const MoneyLogo = ({ sizeClass = "w-12 h-12 md:w-14 md:h-14" }) => (
  <div className="inline-block transform hover:rotate-12 transition-transform cursor-pointer duration-300">
    <svg className={`${sizeClass} text-black filter drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer black ring */}
      <circle cx="50" cy="50" r="45" fill="black" />
      {/* Main coin face */}
      <circle cx="50" cy="50" r="40" fill="#FFDE47" stroke="black" strokeWidth="4" />
      {/* Dotted inner ring */}
      <circle cx="50" cy="50" r="32" stroke="black" strokeWidth="2.5" strokeDasharray="6 4" fill="none" />
      {/* Dollar sign shadow */}
      <text x="52" y="65" className="font-mono text-5xl font-black fill-black select-none" textAnchor="middle">$</text>
      {/* Dollar sign main */}
      <text x="49" y="63" className="font-mono text-5xl font-black fill-[#94FFD8] stroke-black stroke-[2] select-none" textAnchor="middle">$</text>
    </svg>
  </div>
);

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('payme_user')) || null;
    } catch (e) {
      return null;
    }
  });

  // Set Authorization Header from localStorage token on load
  useEffect(() => {
    const token = localStorage.getItem('payme_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const handleLoginSubmit = (user) => {
    setCurrentUser(user);
    navigate('/');
  };

  const handleSignupSubmit = (user) => {
    setCurrentUser(user);
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('payme_token');
      if (token) {
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.warn("Logout request skipped", e);
    }
    localStorage.removeItem('payme_token');
    localStorage.removeItem('payme_user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    navigate('/login');
  };

  const isDashboard = currentUser && location.pathname === '/';

  return (
    <div className={`w-full min-h-screen flex flex-col bg-[#FAF8F5] relative p-6 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px] font-sans ${
      isDashboard ? 'justify-start overflow-y-auto' : 'h-screen overflow-hidden items-center justify-center'
    }`}>
      
      {/* TOP HEADER - LOGO & BRAND NAME */}
      <div className="absolute top-6 left-6 flex items-center gap-3 select-none z-20">
        <MoneyLogo sizeClass="w-10 h-10 md:w-12 md:h-12" />
        <span className="text-xl md:text-2xl font-black text-black tracking-tight uppercase">
          PAY<span className="bg-yellow-300 px-2 py-0.5 border-2 border-black inline-block transform rotate-1 ml-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-base md:text-xl">ME</span>
        </span>
      </div>

      {/* TOP RIGHT NAVIGATION LINK CORNER */}
      <div className="absolute top-6 right-6 flex gap-2 z-20">
        {currentUser ? (
          <>
            <Link
              to="/"
              className={`px-4 py-1.5 font-mono text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${
                location.pathname === '/' ? 'bg-black text-[#94FFD8]' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              CONSOLE
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 font-mono text-xs font-black border-2 border-black bg-white text-black hover:bg-red-500 hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            >
              DISCONNECT
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className={`px-4 py-1.5 font-mono text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${
                location.pathname === '/login' ? 'bg-black text-[#94FFD8]' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              LOGIN
            </Link>
            <Link
              to="/signup"
              className={`px-4 py-1.5 font-mono text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${
                location.pathname === '/signup' ? 'bg-black text-yellow-300' : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              SIGNUP
            </Link>
          </>
        )}
      </div>

      {/* CENTRAL CONTAINMENT PORTAL */}
      <div className={`w-full z-10 ${
        isDashboard ? 'mt-16' : 'flex justify-center py-4 mt-12 md:mt-4 overflow-y-auto max-h-[calc(100vh-90px)]'
      }`}>
        <Routes>
          <Route path="/" element={currentUser ? <Home currentUser={currentUser} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={!currentUser ? <Login onSubmit={handleLoginSubmit} /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!currentUser ? <Signup onSubmit={handleSignupSubmit} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

    </div>
  );
}

export default App;
