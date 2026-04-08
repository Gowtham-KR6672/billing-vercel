const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Sheet = require('./models/Sheet');
const Record = require('./models/Record');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected for Seeding'))
  .catch(err => console.log(err));

const seedData = async () => {
  try {
    await User.deleteMany();
    await Sheet.deleteMany();
    await Record.deleteMany();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const superAdmin = await User.create({
      name: 'System Super Admin',
      email: 'super@admin.com',
      password: hashedPassword,
      role: 'Super Admin'
    });

    const standardAdmin = await User.create({
      name: 'Standard Admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'Admin'
    });

    const teamLead = await User.create({
      name: 'Team Lead 1',
      email: 'tl@tl.com',
      password: hashedPassword,
      role: 'TL'
    });

    console.log('Users created.');

    const ogSheet = await Sheet.create({
        title: 'March 2026 OG Invoices',
        processType: 'OG Inv',
        assignedTo: [standardAdmin._id, teamLead._id],
        createdBy: superAdmin._id
    });

    const fteSheet = await Sheet.create({
        title: 'Q1 FTE Invoices',
        processType: 'FTE Inv',
        assignedTo: [superAdmin._id], // Only superadmin via role
        createdBy: superAdmin._id
    });

    console.log('Sheets created.');

    await Record.create([
        {
            sheetId: ogSheet._id,
            processType: 'OG Inv',
            slNo: '1', potentialNo: 'P-001', project: 'Alpha', invDesc: 'Design work',
            aoNumber: 'AO-5001', month: 'March', invoiceNo: 'INV-001', date: '2026-03-01',
            quantity: '10', uom: 'Hours', contactPerson: 'John Doe',
            item2Q: '5', item2UOM: 'Pages',
            billedStatus: false
        },
        {
            sheetId: ogSheet._id,
            processType: 'OG Inv',
            slNo: '2', potentialNo: 'P-002', project: 'Beta', invDesc: 'Dev work',
            aoNumber: 'AO-5002', month: 'March', invoiceNo: 'INV-002', date: '2026-03-05',
            quantity: '40', uom: 'Hours', contactPerson: 'Jane Smith',
            item2Q: '2', item2UOM: 'Modules',
            billedStatus: true
        },
        {
            sheetId: fteSheet._id,
            processType: 'FTE Inv',
            slNo: '1', potentialNo: 'FTE-101', project: 'Support Team', invDesc: 'Monthly FTE',
            aoNumber: 'AO-7001', month: 'February', invoiceNo: 'INV-099', date: '2026-02-28',
            quantity: '4', uom: 'FTEs', contactPerson: 'Alice',
            billedStatus: false
        }
    ]);

    console.log('Records created.');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
