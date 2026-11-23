const fs = require('fs');
const path = require('path');

const page1 = [
  { permitNumber: 'B17-00536', parentProject: 'P1999-0182', address: '4575 BALLYMENA DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1702090320231513', page: '1' },
  { permitNumber: 'B17-01545', parentProject: 'P1999-0096', address: '4398 SHAMROCK DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704060426481776', page: '1' },
  { permitNumber: 'B17-01869', parentProject: 'FP02-0013', address: '11731 SNYDER DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704181037003120', page: '1' },
  { permitNumber: 'B17-01870', parentProject: 'FP05-0021', address: '665 GULF SHORES DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704181040153183', page: '1' },
  { permitNumber: 'B17-01872', parentProject: 'P1999-0169', address: '1212 OLD OAK CT', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704181043353251', page: '1' },
  { permitNumber: 'B17-01873', parentProject: 'FP14-0035', address: '5678 HIGHFLYER HILLS TRL', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704181048313359', page: '1' },
  { permitNumber: 'B17-01875', parentProject: 'P2000-0258', address: '4652 CHILDRESS TRL', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704181055463695', page: '1' },
  { permitNumber: 'B17-01876', parentProject: 'P2000-0056', address: '4402 DUVAL DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1704181100283953', page: '1' },
  { permitNumber: 'B17-02169', parentProject: 'FP06-0050', address: '262 BOXWOOD LN', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'KE:1704250940346015', page: '1' },
  { permitNumber: 'B17-02683', parentProject: 'FP04-0016', address: '5080 HAVASU DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'KE:1705041046083860', page: '1' },
  { permitNumber: 'B17-03286', parentProject: 'P1999-0018', address: '5849 SHETLAND CIR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'MJM:1705150217165578', page: '1' },
  { permitNumber: 'B17-03288', parentProject: 'FP01-0026', address: '5978 CORAL RIDGE CT', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'MJM:1705150224226294', page: '1' },
  { permitNumber: 'B17-03646', parentProject: 'P1999-0155', address: '5579 BLAZING STAR RD', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'MJM:1705220457573576', page: '1' },
  { permitNumber: 'B17-03647', parentProject: 'P1999-0155', address: '6010 BLAZING STAR RD', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'MJM:1705220502213690', page: '1' },
  { permitNumber: 'B17-04221', parentProject: '', address: '11113 AMBER VALLEY DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'MJM:1706011116497415', page: '1' },
  { permitNumber: 'B17-04222', parentProject: 'P2000-0353', address: '3154 YOSEMITE LN', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'MJM:1706011120177464', page: '1' },
  { permitNumber: 'B17-04359', parentProject: 'FP02-0025', address: '12215 ASHAWAY LN', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'KE:1706051204410920', page: '1' },
  { permitNumber: 'B17-04360', parentProject: 'FP06-0025', address: '4909 MANOR LN', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'KE:1706051206270965', page: '1' },
  { permitNumber: 'B17-04361', parentProject: 'FP05-0017', address: '13842 SALMON DR', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'KE:1706051208280977', page: '1' },
  { permitNumber: 'B17-05449', parentProject: 'FP04-0020', address: '13605 BLACKWOLF RUN TRL', contractor: 'MOB HOME SOLUTIONS DBA NEW VIEW RO', recordId: 'DMO:1706231101516003', page: '1' }
];

const files = [
  'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/.system_generated/steps/1068/output.txt',
  'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/.system_generated/steps/1076/output.txt',
  'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/.system_generated/steps/1080/output.txt',
  'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/.system_generated/steps/1082/output.txt',
  'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/.system_generated/steps/1084/output.txt'
];

const allPermitsMap = new Map();
page1.forEach(p => allPermitsMap.set(p.permitNumber, p));

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.indexOf('\n### Ran Playwright code');
  const slice = jsonEnd !== -1 ? raw.slice(jsonStart, jsonEnd) : raw.slice(jsonStart);
  const parsed = JSON.parse(slice.trim());
  if (parsed.pagesData) {
    parsed.pagesData.forEach(p => allPermitsMap.set(p.permitNumber, p));
  }
}

const list = Array.from(allPermitsMap.values());
console.log('Grand Total Frisco Unique Permits:', list.length);

const outJson = 'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/frisco_permits_new_view_roofing.json';
const outCsv = 'C:/Users/alimi/.gemini/antigravity/brain/de45e03d-f382-4e06-9a77-0835546d462f/frisco_permits_new_view_roofing.csv';

fs.writeFileSync(outJson, JSON.stringify(list, null, 2), 'utf8');

const csvHeader = 'Permit Number,Parent Project,Address,City,State,Contractor,Record ID,Source\n';
const csvRows = list.map(p => `"${p.permitNumber}","${p.parentProject || ''}","${p.address}","Frisco","TX","${p.contractor}","${p.recordId}","Frisco eTRAKiT"`).join('\n');
fs.writeFileSync(outCsv, csvHeader + csvRows, 'utf8');
console.log('Saved JSON and CSV files successfully!');

