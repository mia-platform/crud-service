import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
    ],
}

export function setup() {
    // Here it goes any code we want to execute before running our tests
}

export default function () {
    http.get('http://crud-service:3000/users/export?shopID=2')
    sleep(1)
}

export function teardown(data) {
    // Here it goes any code we want to execute after running our tests
}
