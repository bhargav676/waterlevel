import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

// --- Helper Components & Functions ---

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const NotificationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-10 bg-white rounded-lg shadow-md">
    <div className="w-12 h-12 rounded-full animate-spin border-4 border-dashed border-cyan-500 border-t-transparent"></div>
    <p className="mt-4 text-gray-600">Fetching Data...</p>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
    <p className="font-bold">Error</p>
    <p>{message}</p>
  </div>
);

// --- UPDATED: The 'Full' status now uses cyan-500 for consistency ---
const getStatusInfo = (percentage) => {
    if (percentage == null) return { text: 'N/A', color: 'bg-gray-400 text-white' };
    if (percentage < 20) return { text: 'Low', color: 'bg-red-500 text-white' };
    if (percentage < 80) return { text: 'Normal', color: 'bg-green-500 text-white' };
    return { text: 'Full', color: 'bg-cyan-500 text-white' };
};


// --- The Water Tank Component (defined inside Details.js) ---
const WaterTank = ({ levelPercentage }) => {
  const level = Math.max(0, Math.min(100, levelPercentage));

  const getTankStatusText = (percentage) => {
    if (percentage < 20) return { text: 'Level Low' };
    if (percentage < 80) return { text: 'Level Normal' };
    return { text: 'Level Full' };
  };

  return (
    <div className="relative w-52 h-80">
      {/* Tank Lid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110%] h-8 bg-gray-600 rounded-t-full z-20 shadow-lg">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-3 bg-gray-800 rounded-full"></div>
      </div>

      {/* Tank Body */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full h-[calc(100%-2rem)] rounded-b-xl overflow-hidden bg-gray-300 shadow-inner">
        {/* 3D Shading Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-transparent to-gray-400 opacity-70 z-10"></div>
        
        {/* Water inside the tank */}
        <div 
          className="absolute bottom-0 left-0 w-full bg-cyan-500 transition-all duration-700 ease-out"
          style={{ height: `${level}%` }}
        >
          {/* Water Surface (elliptical shape) */}
          <div 
            className="absolute -top-1 left-0 w-full h-8 bg-cyan-400 rounded-[100%] z-10"
            style={{ transform: 'scaleX(1.1)' }}
          ></div>
          
          {/* Animated Wave */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div 
              className="absolute w-[200%] h-5 bg-wave-mask animate-wave"
              style={{ bottom: '-1px' }}
            ></div>
            <div 
              className="absolute w-[200%] h-5 bg-wave-mask-reverse animate-wave-reverse opacity-60"
              style={{ bottom: '-1px' }}
            ></div>
          </div>
        </div>
        
        {/* Tank Ridges */}
        {[20, 45, 70].map(p => (
          <div key={p} className="absolute w-full h-1 bg-black/10 shadow-md" style={{ top: `${p}%`}}></div>
        ))}
      </div>

      {/* Tank Base */}
      <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-[110%] h-4 bg-gray-600 rounded-b-full shadow-lg"></div>

      {/* Percentage Text Label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
        <span className="text-4xl font-extrabold text-white text-shadow-strong">
          {level.toFixed(0)}%
        </span>
        <span className="block text-sm font-semibold text-white/80 text-shadow-strong">
          {getTankStatusText(level).text}
        </span>
      </div>
    </div>
  );
};


// Socket.IO connection
const socket = io('https://waterlevel-kjby.onrender.com');

// --- Main Details Page Component ---
function Details() {
  const { mobileNumber } = useParams();
  const navigate = useNavigate();
  const [waterLevel, setWaterLevel] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [isAlertsPopoverOpen, setIsAlertsPopoverOpen] = useState(false);
  const alertsRef = useRef(null);

  // Effect to handle clicks outside of the alerts popover to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setIsAlertsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [alertsRef]);


  useEffect(() => {
    if (mobileNumber) {
      const fetchData = async () => {
        setIsLoading(true);
        // Fetch both in parallel for faster initial load
        await Promise.all([fetchLatestData(), fetchHistory()]);
        setIsLoading(false);
      };
      fetchData();

      // Subscribe to real-time updates
      socket.on(`waterLevelUpdate:${mobileNumber}`, (data) => {
        console.log('Received real-time update:', data);
        setWaterLevel(data);
        // Add new data to history and keep it at 5 items
        setHistory(prevHistory => [data, ...prevHistory.slice(0, 4)]);
        setError('');
      });

      // Poll for data integrity
      const interval = setInterval(fetchLatestData, 30000); 

      return () => {
        socket.off(`waterLevelUpdate:${mobileNumber}`);
        clearInterval(interval);
      };
    }
  }, [mobileNumber]);

  const fetchLatestData = async () => {
    try {
      const response = await axios.get(`https://waterlevel-kjby.onrender.com/api/water-level/latest/${mobileNumber}`);
      setWaterLevel(response.data);
      setError('');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setError('No data found for this mobile number.');
        setWaterLevel(null);
        setHistory([]);
      } else {
        setError('Failed to fetch latest data. Please check your connection.');
      }
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`https://waterlevel-kjby.onrender.com/api/water-level/history/${mobileNumber}?limit=5`);
      setHistory(response.data);
    } catch (error) {
      if (!error) {
        setError('Failed to fetch historical data.');
      }
    }
  };

  const fetchLatestAlert = async () => {
    try {
      const response = await axios.get(`https://waterlevel-kjby.onrender.com/api/alert/latest/${mobileNumber}`);
      setAlert(response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setAlert({ message: 'No recent alerts found.', timestamp: null });
      } else {
        setAlert({ message: 'Failed to fetch the latest alert.', timestamp: null });
      }
    }
  };

  const handleNotificationClick = () => {
    if (!isAlertsPopoverOpen) {
      fetchLatestAlert(); // Fetch alert only when opening
    }
    setIsAlertsPopoverOpen(prev => !prev);
  };
  
  const levelPercentage = waterLevel?.levelPercentage || 0;
  const statusInfo = getStatusInfo(levelPercentage);

  return (
    <div className="min-h-screen bg-gray-200 text-gray-800 font-sans">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">

        <header className="flex justify-between items-center mb-6">
          <button onClick={() => navigate('/')} className="flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200">
            <BackIcon /> Back
          </button>
          <h1 className="hidden sm:block text-2xl font-bold text-gray-700">
            Tank Monitor: <span className="text-cyan-500">{mobileNumber}</span>
          </h1>
          {/* --- Notification Icon and Popover Container --- */}
          <div className="relative" ref={alertsRef}>
            <button 
              onClick={handleNotificationClick} 
              className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600 hover:text-cyan-600 transition-colors duration-200" 
              title="View Latest Alert"
            >
              <NotificationIcon />
            </button>

            {isAlertsPopoverOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl p-4 z-50 animate-fade-in-up border border-gray-200">
                {/* --- UPDATED: Alert heading is now red --- */}
                <h3 className="text-lg font-bold text-red-600 mb-2 border-b border-red-200 pb-2">Latest Alert</h3>
                <div className="text-gray-700">
                  <p>{alert?.message || 'Loading...'}</p>
                  {alert?.timestamp && (
                    <p className="text-xs text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <main className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-6 flex flex-col justify-center items-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Live Water Level</h2>
              <WaterTank levelPercentage={levelPercentage} />
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                 {/* --- UPDATED: Side heading is now cyan --- */}
                 <h2 className="text-xl font-semibold text-cyan-500 mb-4">Current Readings</h2>
                 <div className="space-y-3 text-lg text-gray-700">
                    <p><span className="font-semibold text-gray-600">Status:</span> 
                      <span className={`font-bold ml-2 ${statusInfo.color.replace('bg-', 'text-')}`}>
                        {statusInfo.text}
                      </span>
                    </p>
                    <p><span className="font-semibold text-gray-600">Distance:</span> {waterLevel.distance.toFixed(1)} cm</p>
                    <p><span className="font-semibold text-gray-600">Last updated:</span> {new Date(waterLevel.timestamp).toLocaleString()}</p>
                 </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                {/* --- UPDATED: Side heading is now cyan --- */}
                <h2 className="text-xl font-semibold text-cyan-500 mb-4 border-b pb-2">Recent Levels</h2>
                {history.length > 0 ? (
                  <ul className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {history.map((data, index) => {
                      const itemStatus = getStatusInfo(data.levelPercentage);
                      return (
                        <li key={index} className="flex justify-between items-center text-sm">
                          <div>
                            <p className="font-medium text-gray-800">{new Date(data.timestamp).toLocaleTimeString()}</p>
                            <p className="text-gray-500">{new Date(data.timestamp).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-800">{data.levelPercentage.toFixed(1)}%</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${itemStatus.color}`}>
                              {itemStatus.text}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center mt-8">No historical data available.</p>
                )}
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default Details;