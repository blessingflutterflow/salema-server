const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb+srv://temoshomaduane:Bafana23%2B@salema.8trhc.mongodb.net/?retryWrites=true&w=majority&appName=salema';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Create security company
  const company = {
    companyName: 'Shield Force Security',
    address: '123 Main Road, Sandton, Johannesburg',
    psiraNumber: 'PSI-2024-200',
    contactPerson: 'John Mokoena',
    phone: '0719998877',
    latitude: -26.1076,
    longitude: 28.0567,
    servicesOffered: ['vehicle-escort', 'armed-response', 'patrol'],
    branches: ['Sandton', 'Midrand', 'Fourways'],
    verificationStatus: 'verified',
    verifiedAt: new Date(),
    officers: [],
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const companyResult = await db.collection('securitycompanies').insertOne(company);
  const companyId = companyResult.insertedId;
  console.log('Security company created:', companyId.toString());

  // 2. Create admin user (to have verified the company)
  const adminExists = await db.collection('users').findOne({ email: 'admin@salema.co.za' });
  let adminId;
  if (!adminExists) {
    const adminHash = await bcrypt.hash('Admin123', 10);
    const adminResult = await db.collection('users').insertOne({
      userName: 'Salema Admin',
      userId: 'admi' + Math.floor(1000 + Math.random() * 9000),
      email: 'admin@salema.co.za',
      passwordHash: adminHash,
      role: 'AD',
      permissions: '01',
      isActive: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    adminId = adminResult.insertedId;
    console.log('Admin user created:', adminId.toString());
  } else {
    adminId = adminExists._id;
    console.log('Admin already exists:', adminId.toString());
  }

  // Update company with verifiedBy
  await db.collection('securitycompanies').updateOne(
    { _id: companyId },
    { $set: { verifiedBy: adminId } }
  );

  // 3. Create security company manager user (login user)
  const managerExists = await db.collection('users').findOne({ email: 'shieldforce@salema.co.za' });
  if (managerExists) {
    console.log('Manager user already exists, deleting old one...');
    await db.collection('users').deleteOne({ _id: managerExists._id });
  }

  const managerHash = await bcrypt.hash('Shield123', 10);
  const managerResult = await db.collection('users').insertOne({
    userName: 'Shield Force Security',
    userId: 'shie' + Math.floor(1000 + Math.random() * 9000),
    email: 'shieldforce@salema.co.za',
    passwordHash: managerHash,
    role: 'MG',
    permissions: '03',
    profile: companyId,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log('Manager user created:', managerResult.insertedId.toString());

  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Email:    shieldforce@salema.co.za');
  console.log('Password: Shield123');
  console.log('Role:     Security Company Manager (MG)');
  console.log('Status:   VERIFIED');
  console.log('\n=== ADMIN CREDENTIALS ===');
  console.log('Email:    admin@salema.co.za');
  console.log('Password: Admin123');
  console.log('Role:     Admin (AD)');

  await mongoose.disconnect();
  console.log('\nDone!');
}

seed().catch(err => { console.error(err); process.exit(1); });
