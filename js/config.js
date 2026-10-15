/* ====== BEÁLLÍTÁSOK: telepítéskor csak ezt a fájlt kell szerkeszteni ====== */
window.LT_CONFIG = {
  // Az Apps Script webalkalmazás ".../exec" végű URL-je (lásd README.md).
  // Ha üresen hagyod, az oldal HELYI MÓDBAN fut: minden működik, de a szavazatok
  // és a ranglista csak az adott gépen (böngészőben) összesítődnek.
  API_URL: "https://script.google.com/macros/s/AKfycby-qBRMqN5rGA1jBepD5dByX_2X1-1pHls5yfyQa2I9nzB3edxavtpOMZgvdqZO6U0e/exec",

  // Alapértelmezett munkamenet-kód. Felülírható a linkben: index.html?s=LOG1016
  SESSION: "LOG1016",

  // Oktató és kurzus (a fejlécben és a láblécben jelenik meg)
  OKTATO: "dr. Csonka Arnold",
  KURZUS: "AI-támogatott logisztikai tervezés (AGELG157L)",
  INTEZMENY: "Magyar Agrár- és Élettudományi Egyetem · Kaposvári Campus",

  // A hivatalos MATE-logó (opcionális). A zöld fejlécre a fehér (negatív) változat illik.
  // Tedd a fájlt a repóba (például assets/mate-logo.png), és írd ide az útvonalát.
  LOGO_URL: "",

  // Az AI-kihívásoknál felkínált szolgáltatások (új lapon nyílnak meg)
  AI_LINKS: [
    { nev: "Copilot", url: "https://m365.cloud.microsoft/chat" },
    { nev: "Gemini", url: "https://gemini.google.com/app" },
    { nev: "Claude", url: "https://claude.ai/new" },
    { nev: "ChatGPT", url: "https://chatgpt.com/" }
  ],

  // Frissítési gyakoriság (ms): hallgatói nézet és tanári kivetítő nézet
  POLL_DIAK: 8000,
  POLL_TANAR: 4000
};
