import net from 'node:net';

const port = Number(process.env.REDIS_PORT ?? 6379);
const host = process.env.REDIS_HOST ?? '127.0.0.1';

const server = net.createServer((socket) => {
  socket.on('data', (buf) => {
    const text = buf.toString();
    if (/\bPING\b/i.test(text) || text.includes('PING')) {
      socket.write('+PONG\r\n');
      return;
    }
    socket.write('+OK\r\n');
  });
  socket.on('error', () => undefined);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    process.stdout.write(`redis already listening on ${port}\n`);
    process.exit(0);
  }
  throw err;
});

server.listen(port, host, () => {
  process.stdout.write(`redis ready on ${host}:${port}\n`);
});
