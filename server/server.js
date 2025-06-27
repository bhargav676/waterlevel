const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const twilio = require('twilio');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

require('dotenv').config();


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// In-memory cache for tracking last alert time per mobile number
const alertTimestamps = {};
const ALERT_COOLDOWN = 1000; // 5 minutes in milliseconds

app.use(cors());
app.use(express.json());

// MongoDB Schemas
const waterLevelSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true },
  distance: { type: Number, required: true },
  levelPercentage: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Schema for storing alert messages
const alertSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create compound indexes for faster queries
waterLevelSchema.index({ mobileNumber: 1, timestamp: -1 });
alertSchema.index({ mobileNumber: 1, timestamp: -1 });

const WaterLevel = mongoose.model('WaterLevel', waterLevelSchema);
const Alert = mongoose.model('Alert', alertSchema);

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://bhargavk1290:951509290@cluster0.bnrcsa2.mongodb.net/flask')
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// POST endpoint to receive water level data from ESP32
app.post('/api/water-level', async (req, res) => {
  try {
    const { mobileNumber, distance, levelPercentage } = req.body;
    
    if (!mobileNumber || distance === undefined || levelPercentage === undefined) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log incoming data for debugging
    console.log('Received data:', req.body);

    const waterLevelData = new WaterLevel({
      mobileNumber,
      distance,
      levelPercentage,
      timestamp: new Date()
    });

    // Check if levelPercentage is below 30% and send SMS/save alert if needed
    if (levelPercentage < 30) {
      const now = Date.now();
      const lastAlertTime = alertTimestamps[mobileNumber] || 0;
      
      if (now - lastAlertTime > ALERT_COOLDOWN) {
        const alertMessage = `Alert: Water level is critically low at ${levelPercentage.toFixed(2)}%. Please check the tank.`;
        
        // Save alert to MongoDB
        const alertData = new Alert({
          mobileNumber,
          message: alertMessage,
          timestamp: new Date()
        });
        await alertData.save();
        console.log(`Alert saved for ${mobileNumber}: ${alertMessage}`);

        // Send SMS
        try {
          const formattedMobileNumber = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
          await twilioClient.messages.create({
            body: alertMessage,
            from: twilioPhoneNumber,
            to: formattedMobileNumber
          });
          console.log(`SMS sent to ${formattedMobileNumber}`);
          alertTimestamps[mobileNumber] = now; // Update last alert time
        } catch (twilioError) {
          console.error(`Failed to send SMS to ${mobileNumber}:`, twilioError);
        }
      } else {
        console.log(`Skipped SMS for ${mobileNumber}: Within cooldown period`);
      }
    }

    await waterLevelData.save();
    
    // Emit real-time update
    io.emit(`waterLevelUpdate:${mobileNumber}`, {
      mobileNumber,
      distance,
      levelPercentage,
      timestamp: waterLevelData.timestamp
    });
    
    res.status(201).json({ message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET endpoint for latest water level data by mobile number
app.get('/api/water-level/latest/:mobileNumber', async (req, res) => {
  try {
    const mobileNumber = req.params.mobileNumber;
    const data = await WaterLevel
      .findOne({ mobileNumber })
      .sort({ timestamp: -1 })
      .select('mobileNumber distance levelPercentage timestamp')
      .lean();
    
    if (!data) {
      console.log(`No data found for mobileNumber: ${mobileNumber}`);
      return res.status(404).json({ error: 'No data found for this mobile number' });
    }
    
    console.log('Latest data retrieved:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET endpoint for historical water level data by mobile number
app.get('/api/water-level/history/:mobileNumber', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const mobileNumber = req.params.mobileNumber;
    const data = await WaterLevel
      .find({ mobileNumber })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('mobileNumber distance levelPercentage timestamp')
      .lean();
    
    console.log(`Historical data retrieved for ${mobileNumber}: ${data.length} records`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET endpoint for latest alert by mobile number
app.get('/api/alert/latest/:mobileNumber', async (req, res) => {
  try {
    const mobileNumber = req.params.mobileNumber;
    const alert = await Alert
      .findOne({ mobileNumber })
      .sort({ timestamp: -1 })
      .select('message timestamp')
      .lean();
    
    if (!alert) {
      console.log(`No alert found for mobileNumber: ${mobileNumber}`);
      return res.status(404).json({ error: 'No alert found for this mobile number' });
    }
    
    console.log('Latest alert retrieved:', alert);
    res.json(alert);
  } catch (error) {
    console.error('Error fetching latest alert:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});