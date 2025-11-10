const express = require('express');
const app = express();

app.get('/', (req,res) => res.send('ok'));

app.get('/burn', (req,res) => {
  const durationMs = parseInt(req.query.ms || '20000', 10);
  const end = Date.now() + durationMs;
  let x = 0;
  while (Date.now() < end) { x += Math.random()*Math.random(); }
  res.send('burned ' + x);
});

app.listen(3000, ()=> console.log('sample-app ready on 3000'));
