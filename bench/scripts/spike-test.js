import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { executeGetTests } from './utils';

// 
// Test on collection "customers"
// Type of test: spike test
// 
// 5 concurrent users for the first 5 seconds
// Then number of users rise to 500 in a 20-seconds span
// Before to cool down to 5 users in 20 seconds to conclude the test
// 

export const options = {
    stages: [
        { duration: '5s', target: 5 },
        { duration: '20s', target: 500 },
        { duration: '20s', target: 5 },
    ],
    thresholds: {
        checks: ['rate==1'],
        http_req_failed: ['rate<0.01'],
        'http_req_duration{type:getList}': ['p(90)<250'],
        'http_req_duration{type:getListWithQueryOperator}': ['p(90)<250'],
        'http_req_duration{type:getById}': ['p(90)<250'],        
        'http_req_duration{type:count}': ['p(90)<250'],
        'http_req_duration{type:export}': ['p(90)<250'],
    }
}

export default function () {
    executeGetTests('customers')
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data, { enableColors: true }),
    };
}
