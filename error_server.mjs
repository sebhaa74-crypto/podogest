import http from 'http';

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('CLIENT ERROR RECEIVED:', body);
      res.end('ok');
    });
  } else {
    res.end('Listening for errors...');
  }
});

server.listen(3005, () => {
  console.log('Server listening on 3005');
});
