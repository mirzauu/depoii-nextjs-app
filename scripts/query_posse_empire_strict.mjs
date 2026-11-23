import https from 'https';

// Query for Empire Roofing specifically in description or comments
const baseUrl = "https://services2.arcgis.com/rwnOSbfKSwyTBcwN/arcgis/rest/services/NewPermit_2008_2024/FeatureServer/0/query";
const queryParams = "?where=WORK_DESCRIPTION+LIKE+'%25Empire+Roofing%25'+OR+COMMENTS+LIKE+'%25Empire+Roofing%25'&outFields=PERMIT_No,ADDRESS,ISSUE_DATE,VALUE,WORK_DESCRIPTION,PERMIT_TYPE,COMMENTS&f=json&resultRecordCount=50";

console.log('Querying Dallas POSSE FeatureServer specifically for Empire Roofing...');
https.get(baseUrl + queryParams, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.features) {
        console.log(`Found ${json.features.length} records matching 'Empire Roofing'.`);
        for (const f of json.features.slice(0, 10)) {
          const a = f.attributes;
          const dateStr = a.ISSUE_DATE ? new Date(a.ISSUE_DATE).toISOString().split('T')[0] : 'N/A';
          console.log(`- [${a.PERMIT_No}] ${a.ADDRESS} (${dateStr}) - Val: $${a.VALUE} - Desc: ${a.WORK_DESCRIPTION?.slice(0, 80)}...`);
        }
      } else {
        console.log('Response:', json);
      }
    } catch (e) {
      console.log('Error:', data.slice(0, 200));
    }
  });
}).on('error', console.error);

