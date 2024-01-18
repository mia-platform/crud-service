import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { executeGetTests } from './utils';

// 
// Test on collection "customers"
// Type of test: smoke test
// 
// 5 concurrent users for 1 minutes
// 

export const options = {
    vus: 5,
    duration: '1m',
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(90)<150', 'p(95)<300'],
    }
}

export function setup() {
    // Here it goes any code we want to execute before running our tests
}
    
export default function () {
    executeGetTests('customers')
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
}

export function teardown(data) {
    // Here it goes any code we want to execute after running our tests
}
