const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Global variables
let mainWindow;
let loginWindow;
let pythonProcess;

// Utility function to check development mode
const isDev = () => process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// Dynamic backend URL
const backendBaseUrl = 'http://127.0.0.1:5000'; // Localhost used for both dev and production

// Utility function to load stored credentials
const loadStoredCredentials = () => {
  const authDataPath = path.join(__dirname, 'auth.json');
  try {
    const authData = JSON.parse(fs.readFileSync(authDataPath, 'utf8'));
    return { username: authData.username, password: authData.password };
  } catch (error) {
    console.error('Error reading auth.json:', error);
    return null;
  }
};

// Stored credentials
const storedCredentials = loadStoredCredentials();

// Create the main application window
const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev()
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '..', 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (pythonProcess) pythonProcess.kill();
  });
};

// Create the login window
const createLoginWindow = () => {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loginUrl = isDev()
    ? 'http://localhost:3000/login'
    : `file://${path.join(__dirname, 'login.html')}`;

  loginWindow.loadURL(loginUrl);

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
};

// Start the Python backend
const startPythonBackend = () => {
  try {
    const pythonScriptPath = path.join(__dirname, '..', 'python-backend', 'app.py');
    console.log('Starting Python backend:', pythonScriptPath);
    pythonProcess = spawn('python3', [pythonScriptPath]);

    pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data.toString()}`));
    pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data.toString()}`));
    pythonProcess.on('close', (code) => console.log(`Python process exited with code ${code}`));
  } catch (error) {
    console.error('Failed to start Python backend:', error);
  }
};

// Handle app ready event
app.whenReady().then(() => {
  createLoginWindow();

  // Listen for login success
  ipcMain.handle('login-success', () => {
    if (loginWindow) loginWindow.close();
    createMainWindow();
    startPythonBackend();
  });

  // Verify credentials
  ipcMain.handle('verify-credentials', (_, username, password) => {
    if (!storedCredentials) {
      console.error('No stored credentials available.');
      return false;
    }
    const { username: storedUsername, password: storedPassword } = storedCredentials;
    return username === storedUsername && password === storedPassword;
  });

  // Start Python backend immediately
  startPythonBackend();
});

// Fetch data from Python backend
ipcMain.handle('fetch-data', async (_, endpoint) => {
  try {
    const response = await fetch(`${backendBaseUrl}/${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data from Python backend:', error);
    throw error;
  }
});

// Handle app lifecycle events
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  if (pythonProcess) pythonProcess.kill(); // Kill Python backend when all windows are closed
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
});
