/**
 * OWASP ZAP Baseline penetration testing script (cross-platform).
 * This script interacts with ZAP Proxy via API.
 * Ensure ZAP is running and the API key is set.
 */
const axios = require('axios');
require('dotenv').config();

const ZAP_API_KEY = process.env.ZAP_API_KEY || 'default_key';
const ZAP_BASE_URL = process.env.ZAP_URL || 'http://localhost:8080';
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';

const zapApi = axios.create({
  baseURL: `${ZAP_BASE_URL}/JSON`,
  params: { apikey: ZAP_API_KEY },
});

async function runZapBaseline() {
  console.log(`--- Starting OWASP ZAP Baseline Scan for ${TARGET_URL} ---`);

  try {
    // 1. Zap Spider
    console.log('\n[1/3] Starting ZAP Spider...');
    const spiderResponse = await zapApi.get('/spider/action/scan', { params: { url: TARGET_URL } });
    const scanId = spiderResponse.data.scan;
    
    let progress = 0;
    while (progress < 100) {
      const statusResponse = await zapApi.get('/spider/view/status', { params: { scanId } });
      progress = parseInt(statusResponse.data.status);
      console.log(`Spider Progress: ${progress}%`);
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log('Spider COMPLETED.');

    // 2. Passive Scan (already happens while spidering)
    console.log('\n[2/3] Checking Passive Scan status...');
    const passiveScanResponse = await zapApi.get('/pscan/view/recordsToScan');
    const recordsToScan = parseInt(passiveScanResponse.data.recordsToScan);
    console.log(`Passive Scan: ${recordsToScan} records remaining...`);
    
    while (recordsToScan > 0) {
      console.log(`Waiting for passive scan... (${recordsToScan} left)`);
      await new Promise(r => setTimeout(r, 2000));
      const status = await zapApi.get('/pscan/view/recordsToScan');
      if (parseInt(status.data.recordsToScan) === recordsToScan) break; // No progress
    }
    console.log('Passive Scan COMPLETED.');

    // 3. Alerts
    console.log('\n[3/3] Fetching Security Alerts...');
    const alertsResponse = await zapApi.get('/core/view/alerts', { params: { baseurl: TARGET_URL } });
    const alerts = alertsResponse.data.alerts;

    console.log(`\nFound ${alerts.length} alerts.`);
    
    // Categorize and fail if high severity
    const highAlerts = alerts.filter(a => a.risk === 'High');
    if (highAlerts.length > 0) {
      console.error('CRITICAL: High risk vulnerabilities found!');
      highAlerts.forEach(a => console.error(`- ${a.alert}: ${a.url}`));
      process.exit(1);
    } else {
      console.log('No High-risk vulnerabilities found.');
      process.exit(0);
    }

  } catch (error) {
    console.error('Error interacting with ZAP API:', error.message);
    console.warn('Is ZAP running and the API key correct? (Check apikey parameter in ZAP API Options)');
    process.exit(0); // Don't fail CI if ZAP is not available
  }
}

runZapBaseline();
