const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer-core");

const app = express();
const port = 3000;

// Puppeteer WebSocket-Endpunkt
const browserWSEndpoint = "ws://127.0.0.1:8848/connect";

// Browser-Instanz (wird beim Start des Servers verbunden)
let browser;

// Verbindung zu Puppeteer herstellen
(async () => {
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: browserWSEndpoint,
      defaultViewport: null,
    });
    console.log("Puppeteer erfolgreich mit dem Browser verbunden.");
  } catch (err) {
    console.error("Fehler beim Verbinden von Puppeteer mit dem Browser:", err);
    process.exit(1);
  }
})();

// Funktion zum Abrufen des Tokens
async function getToken(username, password) {
  const page = await browser.newPage();

  try {
    // Navigiere zur Trainer Club Login-Seite
    await page.goto("https://club.pokemon.com/us/pokemon-trainer-club/login", {
      waitUntil: "networkidle2",
    });

    // Fülle die Login-Felder aus
    await page.type("#username", username, { delay: 100 });
    await page.type("#password", password, { delay: 100 });

    // Klicke auf "Login" und warte auf die Navigation
    await Promise.all([
      page.click("#sign-in"),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    // Überprüfe, ob der Login erfolgreich war
    const currentURL = page.url();
    if (currentURL.includes("login")) {
      throw new Error("Ungültige Anmeldedaten oder Login fehlgeschlagen.");
    }

    // Suche nach dem Token im Local Storage
    const token = await page.evaluate(() => {
      return localStorage.getItem("ory_rt"); // Passe den Schlüssel an, falls erforderlich
    });

    if (!token) {
      throw new Error("Token nicht im Local Storage gefunden.");
    }

    await page.close();
    return token;
  } catch (err) {
    await page.close();
    throw err;
  }
}

// API-Endpunkt für Token-Abruf
app.post("/getToken", async (req, res) => {
  const { username, password } = req.body;

  // Überprüfe Eingabedaten
  if (!username || !password) {
    return res.status(400).json({
      error: "Benutzername und Passwort sind erforderlich.",
    });
  }

  try {
    // Rufe den Token ab
    const token = await getToken(username, password);
    res.json({ token });
  } catch (err) {
    console.error("Fehler beim Abrufen des Tokens:", err.message);
    res.status(401).json({ error: err.message });
  }
});

// Server starten
app.listen(port, () => {
  console.log(`API-Server läuft unter http://localhost:${port}`);
});
