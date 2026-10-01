// Trial criteria sets
export const sampleTrials = [
  {
    id: "CTRI/2024/05/067891",
    title: "Phase III Study of Pembrolizumab + Chemotherapy in Stage IV NSCLC",
    criteria: [
      "Confirmed Stage IV NSCLC (Non-Small Cell Lung Cancer)",
      "Age 18-75 years",
      "Baseline Renal Function eGFR >= 50 mL/min",
      "No Untreated Brain Metastases (requires cranial MRI within 28 days)",
      "Prior Platinum-Based Chemotherapy Received"
    ]
  },
  {
    id: "NCT05491823_Protocol.pdf",
    title: "A Study of Nivolumab in Previously Treated Advanced NSCLC",
    criteria: [
      "Prior chemotherapy line completed",
      "No active brain metastases",
      "ECOG Performance Status 0-1",
      "Adequate liver function (ALT/AST <= 3x ULN)"
    ]
  }
];

// ──── Patient Data ────────────────────────────────────────────────────
const PASSED_PATIENTS = [
  { id: 'PT-101', name: 'Sarah Jenkins', age: 52, sex: 'Female' },
  { id: 'PT-105', name: 'Anil Kumar', age: 48, sex: 'Male' },
  { id: 'PT-112', name: 'Maya Rao', age: 55, sex: 'Female' },
  { id: 'PT-116', name: 'Kevin Vance', age: 61, sex: 'Male' },
  { id: 'PT-120', name: 'Laura Lin', age: 45, sex: 'Female' },
  { id: 'PT-124', name: 'Siddharth Verma', age: 58, sex: 'Male' },
  { id: 'PT-128', name: 'Tanya Brooks', age: 50, sex: 'Female' },
  { id: 'PT-132', name: 'Marcus Reed', age: 63, sex: 'Male' },
  { id: 'PT-223', name: 'Peggy Carter', age: 47, sex: 'Female' },
  { id: 'PT-224', name: 'Gwen Stacy', age: 54, sex: 'Female' },
  { id: 'PT-225', name: 'Miles Morales', age: 42, sex: 'Male' },
  { id: 'PT-226', name: 'Norman Osborn', age: 67, sex: 'Male' },
];

const REVIEW_PATIENTS = [
  { id: 'PT-103', name: 'Elena Gomez', age: 49, sex: 'Female', issue: 'brainMRI' },
  { id: 'PT-104', name: 'David Ross', age: 58, sex: 'Male', issue: 'brainMRI' },
  { id: 'PT-108', name: 'Pooja Sharma', age: 53, sex: 'Female', issue: 'expiredLab' },
  { id: 'PT-119', name: 'David Ross', age: 60, sex: 'Male', issue: 'chemoLine' },
  { id: 'PT-122', name: 'Claire Redfield', age: 44, sex: 'Female', issue: 'brainMRI' },
  { id: 'PT-126', name: 'Vikram Seth', age: 56, sex: 'Male', issue: 'expiredLab' },
  { id: 'PT-130', name: 'Leon Kennedy', age: 51, sex: 'Male', issue: 'brainMRI' },
  { id: 'PT-134', name: 'Zoya Akhtar', age: 48, sex: 'Female', issue: 'brainMRI' },
  { id: 'PT-138', name: 'Arthur Dent', age: 62, sex: 'Male', issue: 'chemoLine' },
  { id: 'PT-142', name: 'Sunita Patel', age: 57, sex: 'Female', issue: 'expiredLab' },
  { id: 'PT-146', name: 'Rosa Diaz', age: 46, sex: 'Female', issue: 'brainMRI' },
  { id: 'PT-150', name: 'Karan Mehra', age: 59, sex: 'Male', issue: 'ecog' },
  { id: 'PT-154', name: 'Nina Simone', age: 64, sex: 'Female', issue: 'brainMRI' },
  { id: 'PT-158', name: 'Amit Trivedi', age: 50, sex: 'Male', issue: 'expiredLab' },
];

const REJECTED_PATIENTS = [
  { id: 'PT-102', name: 'Robert Chen', age: 55, sex: 'Male', issue: 'lowEGFR', egfr: 38 },
  { id: 'PT-107', name: 'Rita Sen', age: 52, sex: 'Female', issue: 'brainMets' },
  { id: 'PT-110', name: 'James Wright', age: 60, sex: 'Male', issue: 'lowEGFR', egfr: 42 },
  { id: 'PT-115', name: 'John Doe', age: 48, sex: 'Male', issue: 'wrongStage', stage: 'II' },
  { id: 'PT-210', name: 'Scott Lang', age: 54, sex: 'Male', issue: 'brainMets' },
  { id: 'PT-211', name: 'Peter Parker', age: 44, sex: 'Male', issue: 'lowEGFR', egfr: 32 },
  { id: 'PT-212', name: 'Wanda Maximoff', age: 50, sex: 'Female', issue: 'wrongStage', stage: 'IIIA' },
  { id: 'PT-213', name: 'Tony Stark', age: 58, sex: 'Male', issue: 'lowEGFR', egfr: 44 },
  { id: 'PT-214', name: 'Natasha Romanoff', age: 47, sex: 'Female', issue: 'brainMets' },
  { id: 'PT-215', name: 'Bruce Banner', age: 53, sex: 'Male', issue: 'wrongHistology' },
  { id: 'PT-216', name: 'Clint Barton', age: 56, sex: 'Male', issue: 'lowEGFR', egfr: 29 },
  { id: 'PT-217', name: 'Hope van Dyne', age: 45, sex: 'Female', issue: 'brainMets' },
  { id: 'PT-218', name: 'Matt Murdock', age: 49, sex: 'Male', issue: 'brainMets' },
  { id: 'PT-219', name: 'Jessica Jones', age: 51, sex: 'Female', issue: 'brainMets' },
  { id: 'PT-220', name: 'Luke Cage', age: 57, sex: 'Male', issue: 'brainMets' },
  { id: 'PT-221', name: 'Danny Rand', age: 43, sex: 'Male', issue: 'brainMets' },
  { id: 'PT-222', name: 'Frank Castle', age: 61, sex: 'Male', issue: 'brainMets' },
  { id: 'PT-227', name: 'Sam Wilson', age: 46, sex: 'Male', issue: 'lowEGFR', egfr: 36 },
  { id: 'PT-228', name: 'Bucky Barnes', age: 55, sex: 'Male', issue: 'wrongStage', stage: 'IIB' },
  { id: 'PT-229', name: 'Carol Danvers', age: 52, sex: 'Female', issue: 'wrongHistology' },
  { id: 'PT-230', name: 'Stephen Strange', age: 59, sex: 'Male', issue: 'lowEGFR', egfr: 41 },
  { id: 'PT-231', name: 'Shuri Udaku', age: 38, sex: 'Female', issue: 'lowEGFR', egfr: 33 },
  { id: 'PT-232', name: 'Vision Stark', age: 40, sex: 'Male', issue: 'wrongHistology' },
];

function buildRawText(p, extracted) {
  const dobYear = 2026 - extracted.age;
  const chemoLine = extracted.priorChemo === 'Not Documented'
    ? 'Prior systemic therapy history not documented in clinic records.'
    : `First-line ${extracted.priorChemo}\nProgression noted on routine scan 2026-09-05`;
  const ecogLine = extracted.ecog !== null && extracted.ecog !== undefined
    ? `\nECOG Performance Status: ${extracted.ecog}`
    : '';

  return `[DEMOGRAPHICS & ADMISSION]
Patient: ${p.name} | MRN: ${90280000 + parseInt(p.id.replace('PT-', ''))}
DOB: ${dobYear}-${String(1 + (parseInt(p.id.replace('PT-', '')) % 12)).padStart(2, '0')}-${String(5 + (parseInt(p.id.replace('PT-', '')) % 23)).padStart(2, '0')} (Age: ${extracted.age}) | Sex: ${extracted.sex}
Oncology Clinic Note: 2026-09-10

[PATHOLOGY & DIAGNOSIS]
Primary: ${extracted.histology === 'Small Cell Lung Cancer' ? 'Small Cell Lung Cancer (SCLC)' : 'Non-Small Cell Lung Cancer (NSCLC)'}
Subtype: Invasive ${extracted.histology} (Right Lower Lobe)
Stage: Stage ${extracted.stage} (T3 N2 M1b - pleural & bone involvement)
Biopsy Proven: Yes (Thoracentesis + Core Needle)

[BASELINE LABS - SAMPLED ${extracted.labDate}]
Serum Creatinine: ${(140 - extracted.egfr * 1.1).toFixed(2)} mg/dL
eGFR: ${extracted.egfr} mL/min/1.73m² ${extracted.egfr >= 50 ? '(Cutoff >= 50 mL/min: MET)' : '(Cutoff >= 50 mL/min: BELOW THRESHOLD)'}
ALT: ${extracted.alt} U/L | AST: ${extracted.ast} U/L | Total Bilirubin: 0.8 mg/dL

[IMAGING & SCAN STATUS]
Chest/Abdomen/Pelvis CT: Done (2026-09-05)
Brain MRI: ${extracted.brainMRI}${extracted.brainMRI.includes('Pending') ? '\n(Last recorded Head CT was 9 months ago - Outdated)' : ''}

[PRIOR ONCOLOGY TREATMENT]
${chemoLine}${ecogLine}`;
}

function createPassedPatient(p) {
  const egfr = 55 + (parseInt(p.id.replace('PT-', '')) % 35);
  const extracted = {
    age: p.age, sex: p.sex,
    diagnosis: `Stage IV NSCLC (Adenocarcinoma)`,
    egfr, brainMRI: `Negative for metastases (2026-09-${10 + (parseInt(p.id.replace('PT-', '')) % 15)})`,
    histology: 'Adenocarcinoma', priorChemo: 'Carboplatin + Pemetrexed (Completed 2026-04)',
    ecog: parseInt(p.id.replace('PT-', '')) % 2, alt: 20 + (parseInt(p.id.replace('PT-', '')) % 20),
    ast: 18 + (parseInt(p.id.replace('PT-', '')) % 15), labDate: '2026-09-01', stage: 'IV'
  };
  return { id: p.id, name: p.name, rawText: buildRawText(p, extracted), extracted };
}

function createReviewPatient(p) {
  let brainMRI = `Negative for metastases (2026-09-12)`;
  let labDate = '2026-09-01';
  let priorChemo = 'Carboplatin + Pemetrexed (Completed 2026-04)';
  let ecog = 1;

  if (p.issue === 'brainMRI') brainMRI = 'Pending baseline scan. None in protocol window.';
  if (p.issue === 'expiredLab') labDate = '2026-07-01';
  if (p.issue === 'chemoLine') priorChemo = 'Not Documented';
  if (p.issue === 'ecog') ecog = null;

  const egfr = 55 + (parseInt(p.id.replace('PT-', '')) % 30);
  const extracted = {
    age: p.age, sex: p.sex,
    diagnosis: 'Stage IV NSCLC (Adenocarcinoma)',
    egfr, brainMRI, histology: 'Adenocarcinoma', priorChemo, ecog,
    alt: 22 + (parseInt(p.id.replace('PT-', '')) % 18),
    ast: 20 + (parseInt(p.id.replace('PT-', '')) % 14),
    labDate, stage: 'IV'
  };
  return { id: p.id, name: p.name, rawText: buildRawText(p, extracted), extracted };
}

function createRejectedPatient(p) {
  let egfr = 62 + (parseInt(p.id.replace('PT-', '')) % 20);
  let brainMRI = `Negative for metastases (2026-09-14)`;
  let stage = 'IV';
  let histology = 'Adenocarcinoma';

  if (p.issue === 'lowEGFR') egfr = p.egfr;
  if (p.issue === 'brainMets') brainMRI = 'Positive - 3 enhancing lesions in frontal and parietal lobes (2026-09-12)';
  if (p.issue === 'wrongStage') stage = p.stage;
  if (p.issue === 'wrongHistology') histology = 'Small Cell Lung Cancer';

  const diagnosis = `Stage ${stage} ${histology === 'Small Cell Lung Cancer' ? 'SCLC' : 'NSCLC'} (${histology})`;
  const extracted = {
    age: p.age, sex: p.sex, diagnosis, egfr, brainMRI, histology,
    priorChemo: 'Carboplatin + Pemetrexed (Completed 2026-04)', ecog: 1,
    alt: 25 + (parseInt(p.id.replace('PT-', '')) % 15),
    ast: 22 + (parseInt(p.id.replace('PT-', '')) % 12),
    labDate: '2026-09-01', stage
  };
  return { id: p.id, name: p.name, rawText: buildRawText(p, extracted), extracted };
}

export const samplePatients = [
  ...PASSED_PATIENTS.map(createPassedPatient),
  ...REVIEW_PATIENTS.map(createReviewPatient),
  ...REJECTED_PATIENTS.map(createRejectedPatient),
];
