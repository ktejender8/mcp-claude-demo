const cpuCtx = document.getElementById('cpuChart').getContext('2d');
const cpuData = { labels: [], datasets: [{ label:'CPU (cores)', data: [] }] };
const chart = new Chart(cpuCtx, { type:'line', data: cpuData, options:{ animation:false } });

async function fetchMetrics(){
  try {
    const r = await fetch('/api/metrics');
    const j = await r.json();
    if(j.cpu !== undefined){
      const t = new Date().toLocaleTimeString();
      cpuData.labels.push(t);
      cpuData.datasets[0].data.push(Number(j.cpu));
      if(cpuData.labels.length > 20){ cpuData.labels.shift(); cpuData.datasets[0].data.shift(); }
      chart.update();
      document.getElementById('cpuValue').innerText = 'CPU: ' + Number(j.cpu).toFixed(3) + ' cores';
    } else {
      document.getElementById('cpuValue').innerText = 'No Prometheus';
    }
  } catch(e){
    console.error(e);
  }
}

async function fetchEvents(){
  try {
    const r = await fetch('/api/events');
    const arr = await r.json();
    const el = document.getElementById('eventList');
    el.innerHTML = '';
    arr.forEach(ev => {
      const li = document.createElement('li');
      li.innerText = `${ev.ts || ''} [${ev.source || ev.type || 'ai'}] ${ev.action || ev.type || ''} ${ev.replicas?('→'+ev.replicas):''} ${ev.reason || ''}`;
      el.appendChild(li);
    });
  } catch(e){
    console.error(e);
  }
}

setInterval(fetchMetrics, 5000);
setInterval(fetchEvents, 2000);
fetchMetrics(); fetchEvents();
