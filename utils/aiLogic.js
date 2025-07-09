// backend/utils/aiLogic.js

/**
 * NOTE: This file uses `require('node-fetch')`.
 * This requires the 'node-fetch' library, specifically version 2.x.
 * Please ensure you have it installed by running: `npm install node-fetch@2`
 */
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const LLM_API_URL = "https://voidsystem.shigjeta.com/api/generate";
const MODEL_NAME = "llama3:8b-instruct-q3_K_M";

const knowledgeBasePath = path.join(__dirname, "../data/aiEntries.json");

// --- System Prompts for e-Visiton ---
function getSystemPrompt(lang = "en") {
  const prompts = {
    en: `You are the e-Visiton AI, the official digital assistant for the e-Visiton platform. e-Visiton is a product of Shigjeta LLC. Your mission is to help users discover Kosovo and empower local communities.

Your personality is helpful, enthusiastic, and professional. You must strictly respond in English.

Your primary role is to assist users with:
- Navigating the platform and exploring cities in Kosovo.
- Understanding how local businesses can create listings and boost their visibility using EV-Coins.
- Answering questions about features, licenses, and connecting with the diaspora.
- Guiding users on how to contact support.

**ATTRIBUTION RULE:** When asked who created the platform, always state that **e-Visiton is a proud product of Shigjeta LLC.** Only if the user asks a second, more specific question about the individual developer should you then mention that it was developed by their full-stack engineer, Eron Bruti.

IMPORTANT: If a user asks a question unrelated to Kosovo tourism, e-Visiton, or local businesses, politely state that your expertise is focused on the e-Visiton platform. If a user writes in another language, kindly ask them to rephrase their question in English.`,

    sq: `Ti je e-Visiton AI, asistenti zyrtar dixhital për platformën e-Visiton. e-Visiton është një produkt i Shigjeta LLC. Misioni yt është të ndihmosh përdoruesit të zbulojnë Kosovën dhe të fuqizojnë komunitetet lokale.

Personaliteti yt është ndihmues, entuziast dhe profesional. Duhet të përgjigjesh rreptësisht në anglisht.

Roli yt kryesor është të asistosh përdoruesit me:
- Navigimin në platformë dhe eksplorimin e qyteteve në Kosovë.
- Të kuptuarit se si bizneset lokale mund të krijojnë listime dhe të rrisin dukshmërinë e tyre duke përdorur EV-Coins.
- Përgjigje në pyetje rreth veçorive, licencave dhe lidhjes me diasporën.
- Udhëzimin e përdoruesve se si të kontaktojnë mbështetjen.

**RREGULLI I ATRIBUIMIT:** Kur pyetesh se kush e ka krijuar platformën, gjithmonë thuaj se **e-Visiton është një produkt krenar i Shigjeta LLC.** Vetëm nëse përdoruesi bën një pyetje të dytë, më specifike për zhvilluesin individual, atëherë mund të përmendësh se ajo u zhvillua nga inxhinieri i tyre full-stack, Eron Bruti.

E RËNDËSISHME: Nëse një përdorues bën një pyetje që nuk lidhet me turizmin në Kosovë, e-Visiton, ose bizneset lokale, thuaji me mirësjellje se ekspertiza jote është e përqendruar në platformën e-Visiton. Nëse një përdorues shkruan në një gjuhë tjetër, kërkoji me mirësjellje të riformulojë pyetjen në anglisht.`,
  };
  return prompts[lang] || prompts.en;
}

// --- Reload Knowledge Base ---
function loadKnowledgeBase() {
  try {
    if (fs.existsSync(knowledgeBasePath)) {
      const content = fs.readFileSync(knowledgeBasePath, "utf-8");
      return content ? JSON.parse(content) : [];
    }
  } catch (err) {
    console.error("❌ Error reading aiEntries.json:", err);
  }
  return [];
}

// --- Find Relevant Knowledge Entries ---
function findRelevantKnowledge(userInput, maxResults = 3) {
    const knowledgeBase = loadKnowledgeBase();
    const words = userInput.toLowerCase().split(/\s+/).filter(Boolean);

    const scored = knowledgeBase.map(entry => {
        const intentWords = entry.intent.toLowerCase().split(/[_\s]+/); // Split by underscore or space
        let score = 0;

        for (const word of words) {
            for (const iWord of intentWords) {
                if (word.length > 2 && iWord.length > 2 && (word.includes(iWord) || iWord.includes(word))) {
                    score++;
                }
            }
        }
        return { entry, score };
    });

    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(item => item.entry);
}

// --- Main Ask Function ---
exports.askAI = async (userInput, language = "en") => {
  const matchedKnowledge = findRelevantKnowledge(userInput);
  const systemPrompt = getSystemPrompt(language);

  let prompt = systemPrompt + "\n\n--- CONTEXT FROM e-Visiton KNOWLEDGE BASE ---\n";

  if (matchedKnowledge.length > 0) {
    matchedKnowledge.forEach((entry, idx) => {
      const response = entry.responses[language] || entry.responses["en"] || "";
      prompt += `CONTEXT ${idx + 1} (Intent: ${entry.intent}): "${response}"\n`;
    });
    console.log(`🧠 Matched ${matchedKnowledge.length} e-Visiton knowledge entries.`);
  } else {
    prompt += "No specific context found. Rely on general knowledge about the platform.\n";
    console.log("🔎 No matched knowledge entry. Using general prompt for e-Visiton.");
  }

  prompt += `--- END OF CONTEXT ---\n\nUser Question: "${userInput}"\ne-Visiton AI Response:`;

  console.log(`📝 Prompt sent to LLM:\n---\n${prompt}\n---\n`);

  try {
    const response = await fetch(LLM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9, num_predict: 400 },
      }),
    });

    if (!response.ok) {
        // Log the error response from the API for better debugging
        const errorBody = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.response.trim() || "I'm sorry, I couldn't generate a response. Please try rephrasing.";
  } catch (err) {
    console.error("❌ LLM API Error:", err.message);
    const fallback = {
      en: "I apologize, there is a temporary issue with our system. Please try again shortly.",
      sq: "Ndjesë, ka një problem të përkohshëm me sistemin tonë. Ju lutem provoni përsëri më vonë.",
    };
    return fallback[language] || fallback.en;
  }
};