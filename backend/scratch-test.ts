async function test() {
  try {
    const email = 'mario.quiros.admin@gmail.com';
    console.log(`Sending GET to http://127.0.0.1:3000/api/admin/subscribers with Bearer ${email}...`);
    const res = await fetch('http://127.0.0.1:3000/api/admin/subscribers', {
      headers: {
        Authorization: `Bearer ${email}`
      }
    });
    console.log('Success! Status:', res.status);
    const data: any = await res.json();
    if (res.ok) {
      console.log('Data count:', data.length);
      console.log('First subscriber:', JSON.stringify(data[0], null, 2));
    } else {
      console.error('Request failed with error:', data);
    }
  } catch (err: any) {
    console.error('Request failed:', err.message);
  }
}

test();
