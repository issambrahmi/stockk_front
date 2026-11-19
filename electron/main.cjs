const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

// Allow the renderer to load local images through localimg://img/<encoded-path>
protocol.registerSchemesAsPrivileged([
  {
    scheme: "localimg",
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

// Only a single instance may run.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    frame: true, // keep the native title bar (minimize / maximize / close)
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
    autoHideMenuBar: true, // hide the app menu but keep the title bar
    backgroundColor: "#eef7f8",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Hide the menu bar (File/Edit/…) but keep the window frame.
  mainWindow.setMenuBarVisibility(false);

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    // Fill the screen but keep the taskbar and title bar (work-area maximize).
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  // Serve local images: localimg://img/<uriEncodedAbsolutePath>
  protocol.handle("localimg", async (request) => {
    try {
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.pathname.replace(/^\//, ""));
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : ext === ".bmp"
                ? "image/bmp"
                : "image/jpeg";
      return new Response(data, { headers: { "Content-Type": type } });
    } catch {
      return new Response("", { status: 404 });
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// The custom close button in the UI sends this to quit the app.
ipcMain.on("app:quit", () => {
  app.quit();
});

app.on("window-all-closed", () => {
  app.quit();
});
