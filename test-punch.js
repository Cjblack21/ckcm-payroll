// Test script to verify attendance punch
// Run with: node test-punch.js YOUR_SCHOOL_ID

const userId = process.argv[2] || '2021-00000';

console.log('Testing attendance punch with userId:', userId);

fetch('http://localhost:3000/api/attendance/punch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ users_id: userId })
})
.then(res => res.json())
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error('Error:', err.message);
});
