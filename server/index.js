// type: module — requires "type": "module" in package.json
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
dotenv.config();

import { samplePatients, sampleTrials } from './sampleData.js';
import { runTriage, evaluatePatient } from './matchingEngine.js';
import * as geminiService from './geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Sample data endpoint
app.get('/api/sample-data', (req, res) => {
  const formattedTrials = sampleTrials.map(t => ({
    ...t,
    criteria: t.criteria.map((c, i) => (typeof c === 'string' ? { id: i, description: c } : c))
  }));
  res.json({ patients: samplePatients, trials: formattedTrials });
});

// Extract patients from uploaded raw text, CSV, or pasted clinical charts
app.post('/api/extract-patients', async (req, res) => {
  try {
    const { rawText, fileName } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    const isCsv = fileName?.endsWith('.csv') && !rawText.includes('[RECORD:');

    // 1. If it's a tabular CSV file with comma headers, parse rows directly
    if (isCsv) {
      const parsedCsvPatients = parseCsvPatients(rawText, fileName);
      if (parsedCsvPatients.length > 0) {
        return res.json({ patients: parsedCsvPatients });
      }
    }

    // 2. High-speed, robust deterministic clinical parser (handles multi-records, dates, notes)
    const fastParsed = parseMultiRecordText(rawText, fileName);
    if (fastParsed.length > 0) {
      return res.json({ patients: fastParsed });
    }

    // 3. Fallback to AI extraction if available
    if (geminiService.hasApiKey()) {
      try {
        const result = await geminiService.extractPatientsWithAI(rawText);
        if (Array.isArray(result) && result.length > 0) {
          return res.json({ patients: result });
        }
      } catch (aiError) {
        console.error('AI extraction failed, falling back:', aiError.message);
      }
    }

    // 4. Single-record fallback
    res.json({ patients: [parseOnePatient(rawText, 'PT-' + Math.floor(100 + Math.random() * 900), fileName)] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extract criteria from uploaded protocol text or URL
app.post('/api/extract-criteria', async (req, res) => {
  try {
    let { rawText, fileName } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    const trimmedText = rawText.trim();
    if (trimmedText.startsWith('http://') || trimmedText.startsWith('https://')) {
      try {
        const urlResponse = await fetch(trimmedText);
        const html = await urlResponse.text();
        rawText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .substring(0, 30000);
      } catch (fetchErr) {
        return res.status(400).json({ error: 'Failed to fetch the provided URL.' });
      }
    }

    if (geminiService.hasApiKey()) {
      try {
        const result = await geminiService.extractCriteriaWithAI(rawText);
        return res.json({ trial: result });
      } catch (aiError) {
        console.error('AI criteria extraction failed, falling back:', aiError.message);
      }
    }

    const trial = fallbackParseCriteria(rawText, fileName);
    res.json({ trial });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Matching endpoint — run batch checking
app.post('/api/triage', (req, res) => {
  try {
    const { patients, trials } = req.body;
    if (!patients || !trials || patients.length === 0 || trials.length === 0) {
      return res.status(400).json({ error: 'Patients and trials are required' });
    }
    const results = runTriage(patients, trials);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patient detail report endpoint
app.post('/api/dossier/:patientId', (req, res) => {
  const { patientId } = req.params;
  const patients = req.body.patients || samplePatients;
  const patient = patients.find(p => p.id === patientId);

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const criteriaResults = evaluatePatient(patient, sampleTrials[0]);
  const hasFailed = criteriaResults.some(c => c.status === 'FAILED');
  const hasMissing = criteriaResults.some(c => c.status === 'MISSING');
  const status = hasFailed ? 'REJECTED' : hasMissing ? 'REVIEW' : 'PASSED';

  res.json({ patient, criteriaResults, status });
});

// API key management
app.post('/api/configure-api-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid API Key format' });
  }
  geminiService.setApiKey(apiKey);
  res.json({ success: true, status: 'API Key configured' });
});

app.get('/api/status', (req, res) => {
  res.json({ apiKeySet: geminiService.hasApiKey() });
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback (Express v5 syntax)
app.get('/{*path}', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html');
  res.sendFile(indexPath, err => {
    if (err) res.status(404).send('Not found');
  });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`✓ Clinical Trial Matcher backend running on http://localhost:${port}`);
  });
}

export default app;

// ── Multi-Record Text & Clinical Note Parser ──────────────────────────
function parseMultiRecordText(rawText, fileName) {
  const text = rawText.replace(/\r\n/g, '\n').trim();

  let sections = [];

  if (/\[RECORD:/i.test(text)) {
    const regex = /(?:\[DATE:[^\]]*\]\s*)?\[RECORD:\s*[^\]]+\]/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match.index);
    }
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i];
      const end = (i + 1 < matches.length) ? matches[i + 1] : text.length;
      const chunk = text.substring(start, end).trim();
      if (chunk.length > 15) sections.push(chunk);
    }
  } else if (/\[DEMOGRAPHICS/i.test(text)) {
    const regex = /\[DEMOGRAPHICS/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match.index);
    }
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i];
      const end = (i + 1 < matches.length) ? matches[i + 1] : text.length;
      const chunk = text.substring(start, end).trim();
      if (chunk.length > 15) sections.push(chunk);
    }
  } else {
    sections = text.split(/\n\s*\n\s*/).map(s => s.trim()).filter(s => s.length > 15);
  }

  if (sections.length === 0) return [];

  return sections.map((section, idx) => {
    const idMatch = section.match(/\[RECORD:\s*([^\]]+)\]/i) ||
                    section.match(/(?:Patient ID|Record|MRN|ID)[:\s#]*([A-Za-z0-9-_]+)/i) ||
                    section.match(/\b(PT-\d+)\b/i);

    const id = idMatch ? idMatch[1].trim() : `PT-${101 + idx}`;
    return parseOnePatient(section, id, fileName);
  });
}

function parseOnePatient(text, id, fileName) {
  // 1. Extract Name
  let name = null;
  const patientColonMatch = text.match(/Patient:\s*([^|\n;,]+)/i);
  const patientNamedMatch = text.match(/Patient\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  const chartUpdateMatch = text.match(/Chart Update:\s*([A-Z]\.?\s+[A-Za-z]+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  const lastFirstMatch = text.match(/\b([A-Z][a-z]+),\s*([A-Z][a-z]+)\b/);

  if (patientColonMatch) {
    name = patientColonMatch[1].trim();
  } else if (patientNamedMatch) {
    name = patientNamedMatch[1].trim();
  } else if (chartUpdateMatch) {
    name = chartUpdateMatch[1].trim();
  } else if (lastFirstMatch && !/female|male|age|dob|chart|stage|grade|status/i.test(lastFirstMatch[1]) && !/female|male|age|dob|chart|stage|grade|status/i.test(lastFirstMatch[2])) {
    name = `${lastFirstMatch[2]} ${lastFirstMatch[1]}`;
  } else {
    name = `Patient ${id}`;
  }

  // 2. Extract Age
  let age = null;
  const ageColonMatch = text.match(/Age[:\s]+(\d{1,3})/i);
  const ageYMatch = text.match(/(\d{1,3})\s*y(?:o|ear|ears|rs)?\b/i);
  const dobMatch = text.match(/DOB:\s*(\d{4})-\d{2}-\d{2}/i);

  if (ageColonMatch) {
    age = parseInt(ageColonMatch[1]);
  } else if (ageYMatch) {
    age = parseInt(ageYMatch[1]);
  } else if (dobMatch) {
    age = 2026 - parseInt(dobMatch[1]);
  } else {
    age = 55;
  }

  // 3. Extract Sex
  let sex = 'Unknown';
  if (/\b(?:female|woman|f)\b/i.test(text) || /\(F,/i.test(text)) {
    sex = 'Female';
  } else if (/\b(?:male|man|m)\b/i.test(text) || /\(M,/i.test(text)) {
    sex = 'Male';
  }

  // 4. Extract Diagnosis & Stage & Histology
  let stage = 'IV';
  const stageMatch = text.match(/Stage\s+(IV|III[AB]?|II[AB]?|I[AB]?)/i);
  if (stageMatch) stage = stageMatch[1].toUpperCase();

  let histology = 'Adenocarcinoma';
  if (/squamous/i.test(text)) {
    histology = 'Squamous Cell Carcinoma';
  } else if (/small cell/i.test(text) && !/non-small/i.test(text)) {
    histology = 'Small Cell Lung Cancer';
  } else if (/adenocarcinoma/i.test(text)) {
    histology = 'Adenocarcinoma';
  } else if (/large cell/i.test(text)) {
    histology = 'Large Cell Carcinoma';
  }

  const diagnosis = `Stage ${stage} NSCLC (${histology})`;

  // 5. Extract eGFR
  let egfr = null;
  const egfrMatch = text.match(/eGFR\s+(?:of|verified high at|lab drawn today resulted significantly low at|is|:)?\s*([\d.]+)/i) ||
                    text.match(/eGFR[:\s]+([\d.]+)/i);
  if (egfrMatch) {
    egfr = parseFloat(egfrMatch[1]);
  } else {
    egfr = 60.0;
  }

  // 6. Extract Brain MRI / Cranial Status
  let brainMRI = 'Not on file';
  if (/pending\s+contrast|pending.*?order|pending\s+baseline|MRI brain is pending|pending execution/i.test(text)) {
    brainMRI = 'Pending contrast MRI (Order CPT 70553 required)';
  } else if (/no evidence of (?:intracranial|active|brain)?\s*metastases|negative for (?:metastases|mets)|cranial.*?negative|MRI.*?negative|head ct.*?no evidence/i.test(text)) {
    const mriDateMatch = text.match(/(?:conducted on|done|sampled|dated)\s*(\d{4}-\d{2}-\d{2})/i) || text.match(/(\d{4}-\d{2}-\d{2})/);
    brainMRI = `Negative for metastases${mriDateMatch ? ` (${mriDateMatch[1]})` : ''}`;
  } else if (/positive for (?:metastases|mets)|active brain|enhancing lesions/i.test(text)) {
    brainMRI = 'Positive - Active brain metastases identified';
  } else {
    brainMRI = 'Pending / None on file';
  }

  // 7. Extract Prior Chemo / Platinum Status
  let priorChemo = 'Not Documented';
  if (/treatment-naive|no previous lines|no prior/i.test(text)) {
    priorChemo = 'Treatment-naive (No prior systemic lines)';
  } else if (/carboplatin|cisplatin|oxaliplatin|pemetrexed|gemcitabine|platinum/i.test(text)) {
    if (/carboplatin/i.test(text) && /pemetrexed/i.test(text)) {
      priorChemo = 'Carboplatin + Pemetrexed doublet completed (Platinum-based)';
    } else if (/cisplatin/i.test(text)) {
      priorChemo = 'Cisplatin + Gemcitabine completed (Platinum-based)';
    } else if (/carboplatin/i.test(text)) {
      priorChemo = 'Carboplatin doublet completed (Platinum-based)';
    } else {
      priorChemo = 'Platinum-based chemotherapy doublet received';
    }
  }

  // 8. Extract Lab Date
  const dateMatch = text.match(/\[DATE:\s*(\d{4}-\d{2}-\d{2})\]/i) ||
                    text.match(/sampled\s*(\d{4}-\d{2}-\d{2})/i) ||
                    text.match(/blood draw\s*(\d{4}-\d{2}-\d{2})/i) ||
                    text.match(/drawn\s+(\d{4}-\d{2}-\d{2})/i);
  const labDate = dateMatch ? dateMatch[1] : '2026-08-20';

  // 9. Extract ECOG
  const ecogMatch = text.match(/ECOG\s*(?:Performance Status)?[:\s]+(\d)/i);
  const ecog = ecogMatch ? parseInt(ecogMatch[1]) : 1;

  return {
    id,
    name,
    rawText: text.trim(),
    extracted: {
      age,
      sex,
      diagnosis,
      egfr,
      brainMRI,
      histology,
      priorChemo,
      ecog,
      alt: 24,
      ast: 22,
      labDate,
      stage
    }
  };
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function parseCsvPatients(csvText, fileName) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const patients = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const id = row.id || row.patientid || row.mrn || `PT-${100 + i}`;
    const name = row.name || row.patientname || `Patient ${id}`;
    const age = parseInt(row.age) || 50;
    const sex = row.sex || row.gender || 'Female';
    const diagnosis = row.diagnosis || row.condition || row.primary || 'Stage IV NSCLC (Adenocarcinoma)';
    const egfr = parseFloat(row.egfr) || 60;
    const brainMRI = row.brainmri || row.mri || row.cranialscan || 'Negative (Recent)';
    const histology = row.histology || row.subtype || 'Adenocarcinoma';
    const priorChemo = row.priorchemo || row.chemotherapy || row.priortherapy || 'Carboplatin + Pemetrexed';
    const stage = row.stage || (diagnosis.includes('IV') ? 'IV' : diagnosis.includes('III') ? 'III' : 'IV');
    const ecog = row.ecog !== undefined && row.ecog !== '' ? parseInt(row.ecog) : 1;
    const labDate = row.labdate || row.sampledate || '2026-08-20';

    patients.push({
      id,
      name,
      rawText: `Patient: ${name} | ID: ${id}\nAge: ${age} | Sex: ${sex}\nDiagnosis: ${diagnosis}\neGFR: ${egfr}\nBrain MRI: ${brainMRI}\nPrior Chemo: ${priorChemo}`,
      extracted: {
        age,
        sex,
        diagnosis,
        egfr,
        brainMRI,
        histology,
        priorChemo,
        ecog,
        alt: 25,
        ast: 22,
        labDate,
        stage
      }
    });
  }

  return patients;
}

function fallbackParseCriteria(rawText, fileName) {
  const lines = rawText.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (/^(?:Inclusion\s*(?:&|and)?\s*Exclusion\s*Criteria|Inclusion\s*Criteria|Exclusion\s*Criteria)[:\s]*$/i.test(l)) {
        return false;
      }
      return l.match(/^[-•*\d.]\s*/) || l.match(/^(?:inclusion|exclusion|criterion)\s*[:\d]/i);
    });

  const criteria = lines.map((line, i) => ({
    id: i,
    description: line.replace(/^[-•*\d.)\s]+/, '').trim()
  })).filter(c => c.description.length > 5);

  const idMatch = rawText.match(/(NCT\d+|CTRI\/\d+\/\d+\/\d+)/i);

  return {
    id: idMatch ? idMatch[1] : (fileName || 'Custom Protocol'),
    title: fileName || 'Uploaded Trial Protocol',
    criteria: criteria.length > 0 ? criteria : [{ id: 0, description: 'No criteria extracted — please edit manually' }]
  };
}
