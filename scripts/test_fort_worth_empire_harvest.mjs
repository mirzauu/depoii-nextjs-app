import https from 'https';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Test 1: Query Fort Worth ArcGIS Open Data FeatureServer for Empire Roofing
const fwUrl = "https://data.fortworthtexas.gov/resource/k6ic-7kp7.json?$where=contractor_name%20like%20'%25EMPIRE%20ROOFING%25'&$limit=50";

console.log('Testing Fort Worth Open Data Socrata endpoint...');
https.get(fwUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(`Fort Worth Socrata permits found: ${Array.isArray(parsed) ? parsed.length : JSON.stringify(parsed)}`);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('Sample FW permit:', parsed[0]);
      }
    } catch (e) {
      console.log('FW raw response:', data.slice(0, 300));
    }
  });
}).on('error', err => console.error('FW error:', err));

