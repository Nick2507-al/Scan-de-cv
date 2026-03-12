const axios = require('axios');
const FormData = require('form-data');

async function callNlpService(file, criteria) {
  const form = new FormData();
  form.append('file', file.buffer, file.originalname);
  form.append('criteria', criteria);

  const response = await axios.post('http://localhost:5001/analyze', form, {
    headers: form.getHeaders(),
  });

  return response.data;
}

module.exports = { callNlpService };
