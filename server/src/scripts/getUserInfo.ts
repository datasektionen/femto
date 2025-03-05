// Ask the user for the access token
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please enter the access token: ', (accessToken: String) => {
  // Fetch user info
  fetch('https://sso.datasektionen.se/op/userinfo', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('User Info:', data); // Output user info
    })
    .catch(error => {
      console.error('Error fetching user info:', error); // Handle errors
    })
    .finally(() => rl.close());
});
