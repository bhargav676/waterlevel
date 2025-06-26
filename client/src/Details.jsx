import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

// Connect to Socket.IO server
const socket = io('http://localhost:3000');

function Details() {
  const { mobileNumber } = useParams();
  const navigate = useNavigate();
  const [waterLevel, setWaterLevel] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Fetch data and set up Socket.IO
  useEffect(() => {
    if (mobileNumber) {
      // Fetch initial data
      fetchLatestData();
      fetchHistory();

      // Subscribe to real-time updates
      socket.on(`waterLevelUpdate:${mobileNumber}`, (data) => {
        console.log('Received real-time update:', data);
        setWaterLevel(data);
        setError('');
      });

      // Poll every 10 seconds
      const interval = setInterval(fetchLatestData, 10000);

      return () => {
        socket.off(`waterLevelUpdate:${mobileNumber}`);
        clearInterval(interval);
      };
    }
  }, [mobileNumber]);

  // Fetch latest water level data
  const fetchLatestData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/water-level/latest/${mobileNumber}`);
      setWaterLevel(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching latest data:', error);
      if (error.response && error.response.status === 404) {
        setError('Mobile number does not exist');
        setWaterLevel(null);
      } else {
        setError('Failed to fetch latest data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch historical water level data (limited to 5 records)
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/water-level/history/${mobileNumber}?limit=5`);
      setHistory(response.data);
      if (response.data.length === 0) {
        setError('Mobile number does not exist');
      } else {
        setError('');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      if (error.response && error.response.status === 404) {
        setError('Mobile number does not exist');
      } else {
        setError('Failed to fetch historical data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch latest alert
  const fetchLatestAlert = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/alert/latest/${mobileNumber}`);
      setAlert(response.data);
    } catch (error) {
      console.error('Error fetching latest alert:', error);
      if (error.response && error.response.status === 404) {
        setAlert({ message: 'No alerts', timestamp: null });
      } else {
        setAlert({ message: 'Failed to fetch alert', timestamp: null });
      }
    }
  };

  // Handle notification icon click
  const handleNotificationClick = () => {
    fetchLatestAlert();
    setShowAlertModal(true);
  };

  // Determine status based on level percentage
  const getStatus = (percentage) => {
    if (percentage < 20) return 'Low';
    if (percentage < 80) return 'Normal';
    return 'Full';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-500 text-white p-2 rounded-md hover:bg-gray-600 transition"
        >
          Back to Home
        </button>
        <button
          onClick={handleNotificationClick}
          className="text-gray-700 hover:text-blue-500 transition"
          title="View Latest Alert"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405ზ 5.5 2.5m-6.5-14H4m4 14v1.5c0 2.3 1.9 4.3 4.3 4.3s2.4 0 4.3-1.9v1.5a5.5 5.5 0 004-4.3c0-2.4-1.9-4.3-4.3-4.3zm-2.8 4.3h4.4a5.5 5.5 0 01-1.9 4.3zm-5.6-4.3c0-2.4 1.9-4.3 4.3-4.3h1.3m-1.3 6v6m-3-6h6"></path>
          </svg>
        </button>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Water Level for {mobileNumber}</h1>
      {isLoading && (
        <div className="flex justify-center items-center mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {!isLoading && !error && waterLevel && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Current Water Level</h2>
          <p>
            Status: <span className={`font-bold ${getStatus(waterLevel.levelPercentage) === 'Low' ? 'text-red-500' : getStatus(waterLevel.levelPercentage) === 'Normal' ? 'text-green-500' : 'text-blue-500'}`}>
              {getStatus(waterLevel.levelPercentage)}
            </span>
          </p>
          <p>Level: {waterLevel.levelPercentage.toFixed(2)}%</p>
          <p>Distance: {waterLevel.distance.toFixed(2)} cm</p>
          <p>Timestamp: {new Date(waterLevel.timestamp).toLocaleString()}</p>
          <div className="w-24 h-48 border-2 border-gray-700 rounded-lg overflow-hidden mx-auto mt-4 relative bg-gray-200">
            <div
              className="w-full bg-blue-500 absolute bottom-0 transition-all duration-500 ease-in-out"
              style={{ height: `${waterLevel.levelPercentage}%` }}
            ></div>
          </div>
        </div>
      )}
      {!isLoading && !error && history.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Historical Data (Latest 5)</h2>
          <ul className="max-h-64 overflow-y-auto">
            {history.map((data, index) => (
              <li key={index} className="py-2 border-b border-gray-200">
                {new Date(data.timestamp).toLocaleString()}: {data.levelPercentage.toFixed(2)}% 
                (<span className={`font-bold ${getStatus(data.levelPercentage) === 'Low' ? 'text-red-500' : getStatus(data.levelPercentage) === 'Normal' ? 'text-green-500' : 'text-blue-500'}`}>
                  {getStatus(data.levelPercentage)}
                </span>)
              </li>
            ))}
          </ul>
        </div>
      )}
      {showAlertModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-sm w-full">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Latest Alert</h2>
            <p className="text-gray-600">
              {alert && alert.message ? alert.message : 'No alerts'}
            </p>
            {alert && alert.timestamp && (
              <p className="text-sm text-gray-500 mt-2">
                Timestamp: {new Date(alert.timestamp).toLocaleString()}
              </p>
            )}
            <button
              onClick={() => setShowAlertModal(false)}
              className="mt-4 bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Details;