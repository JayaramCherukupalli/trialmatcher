import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

let apiKey = process.env.GEMINI_API_KEY || null;
let ai = apiKey && apiKey !== 'your_api_key_here' ? new GoogleGenAI({ apiKey }) : null;

export function setApiKey(key) {
  apiKey = key;
  ai = new GoogleGenAI({ apiKey: key });
}

export function hasApiKey() {
  return !!ai;
}

export async function extractPatientsWithAI(rawText) {
  if (!ai) throw new Error('API key not configured');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a clinical data extraction specialist. Parse the following clinical text into structured patient records. 

CRITICAL HACKATHON INSTRUCTION: The input data might be highly structured EHR data, OR it might be very messy, unstructured, typo-ridden text typed by a human judge testing the system. 
- Extract whatever you can. 
- If a piece of information (like eGFR, MRI, Age, ECOG, etc.) is completely missing or not mentioned, DO NOT make it up. Set it to null or "Not Documented".
- Be robust. If the judge just types "John is 45 with stage 4 lung cancer and egfr is 40", you should output a valid JSON with John, 45, Stage IV, egfr 40, and the rest as null/"Not Documented".

For EACH patient found, return a JSON object with these exact fields:
{
  "id": "PT-XXX" (generate sequential IDs like PT-901 if not present),
  "name": "Patient Name" (or "Unknown Patient" if missing),
  "rawText": "the original text snippet for this patient",
  "extracted": {
    "age": number (or null),
    "sex": "Male" or "Female" (or "Unknown"),
    "diagnosis": "full diagnosis string" (or "Not Documented"),
    "egfr": number (mL/min) or null,
    "brainMRI": "status string" (e.g. "Negative", "Pending", "Positive", or "Not Documented"),
    "histology": "histology type" (e.g. "Adenocarcinoma", "Squamous", etc., or "Not Documented"),
    "priorChemo": "chemo regimen string" or "Not Documented",
    "ecog": number or null,
    "alt": number or null,
    "ast": number or null,
    "labDate": "YYYY-MM-DD" or null,
    "stage": "IV", "III", "II", "I" (or null)
  }
}

Return ONLY a valid JSON array of patient objects. No markdown formatting, no code blocks.

RAW CLINICAL TEXT:
${rawText}`,
  });

  const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function extractCriteriaWithAI(protocolText) {
  if (!ai) throw new Error('API key not configured');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are a clinical trial protocol parser. Extract the eligibility criteria from this text (which may be a trial protocol document, or raw text pasted from a website like clinicaltrials.gov).

Return a JSON object with:
{
  "id": "trial ID or NCT number if found (e.g., NCT01234567). If none found, use 'Custom-Protocol'",
  "title": "trial title if found, otherwise 'Extracted Clinical Trial'",
  "criteria": [
    { "id": 0, "description": "criterion text" },
    { "id": 1, "description": "criterion text" }
  ]
}

- Separate complex paragraphs into clear, single bullet points.
- Include both inclusion and exclusion criteria.
- Be specific and precise (include numbers, lab thresholds, timeframes).
- Return ONLY valid JSON, no markdown formatting.

PROTOCOL TEXT:
${protocolText}`,
  });

  const text = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse AI response as JSON');
  }
}
