import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Make sure the path to your image is correct
import bg from './assets/bg.png';

function Home() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError('');
    setIsLoading(true);

    // Simulate a network delay for a better UX, then navigate
    setTimeout(() => {
      navigate(`/details/${mobileNumber}`);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-black/10 bg-cover bg-center font-sans p-4"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3">
          <h1
            className="text-5xl md:text-6xl font-extrabold text-white"
            style={{ textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)' }}
          >
            {/* --- CHANGE IS HERE --- */}
            {/* "Water Level" is white, and "Monitoring" is cyan */}
            Water Level <span className="text-cyan-500">Monitoring</span>
          </h1>
        </div>
        <p className="mt-4 text-lg text-gray-300">
          Enter your mobile number to get real-time data.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-black/60 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20"
      >
        <div className="mb-6">
          <label htmlFor="mobileNumber" className="block text-gray-300 font-medium mb-2 text-base">
            Mobile Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              
            </div>
            <input
              type="tel"
              id="mobileNumber"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className={`w-full p-2 pl-12 text-lg bg-white/10 text-white border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300 placeholder-gray-400 ${
                error ? 'border-red-500' : 'border-white/20 focus:border-cyan-400'
              }`}
              maxLength="10"
              disabled={isLoading}
            />
          </div>
        </div>

        {error && <p className="text-red-400 mb-6 text-center text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-cyan-500 text-white font-semibold text-lg p-3 rounded-md"
        >
          {isLoading ? 'Loading...' : 'View Water Level'}
        </button>
      </form>

      <footer className="absolute bottom-5 text-center">
        <p className="text-gray-400 text-sm">
          © {new Date().getFullYear()} Water Monitoring Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default Home;