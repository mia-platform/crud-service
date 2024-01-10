import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 5 },
        { duration: '2m', target: 10 },
        { duration: '30s', target: 0 },
    ],
}

export default function () {
    http.get('http://crud-service:3000/users/export?shopID=2')
    sleep(1)
}