import http from 'k6/http';
import { sleep } from 'k6';


export const options = {
vus: 20,
duration: '30s',
thresholds: {
http_req_duration: ['p(95)<200'],
},
};


export default function () {
http.get('http://localhost:3000/balances', {
headers: {
Authorization: 'Bearer test-token',
},
});
sleep(1);
}