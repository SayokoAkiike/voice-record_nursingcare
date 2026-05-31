import pem from 'pem';
import fs from 'fs';
import path from 'path';

const certDir = path.join(process.cwd(), '.certs');

if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const certPath = path.join(certDir, 'localhost.crt');
const keyPath = path.join(certDir, 'localhost.key');

// Check if cert already exists
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('✅ Certificates already exist at .certs/');
  process.exit(0);
}

console.log('🔐 Generating self-signed certificate...');

pem.createCertificate(
  {
    days: 365,
    selfSigned: true,
    commonName: 'localhost',
    altNames: ['localhost', '127.0.0.1']
  },
  (err, keys) => {
    if (err) {
      console.error('❌ Error generating certificate:', err);
      process.exit(1);
    }

    fs.writeFileSync(certPath, keys.certificate);
    fs.writeFileSync(keyPath, keys.serviceKey);

    console.log('✅ Certificate generated successfully!');
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Key: ${keyPath}`);
    console.log('\n📝 Update your vite.config.ts to use HTTPS:');
    console.log(`   server: { https: { key: fs.readFileSync('${keyPath}'), cert: fs.readFileSync('${certPath}') } }`);
  }
);
