const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
let isDbConnected = false;

const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
    : []),
];

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests with no Origin header such as health checks/Postman.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const connectDB = async () => {
  if (isDbConnected) {
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  isDbConnected = true;
  console.log('MongoDB Connected');
};

// Models
const User = require('./models/User');
const Sheet = require('./models/Sheet');
const Record = require('./models/Record');
const Header = require('./models/Header');
const Uom = require('./models/Uom');
const InvoiceCounter = require('./models/InvoiceCounter');
const SlNoCounter = require('./models/SlNoCounter');

// Auth Middleware
const { protect, authorize } = require('./middleware/auth');

// Seed Super Admin
const seedSuperAdmin = async () => {
  try {
    const count = await User.countDocuments({ role: 'Super Admin' });
    if (count === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await User.create({
        name: 'System Super Admin',
        email: 'super@admin.com',
        password: hashedPassword,
        role: 'Super Admin'
      });

      console.log('Super Admin User Created: super@admin.com / admin123');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
};

// Seed default headers
const seedHeaders = async () => {
  try {
    const count = await Header.countDocuments();

    if (count === 0) {
      await Header.insertMany([
        {
          name: 'Present',
          key: 'present',
          symbol: 'X',
          bgColor: '#16a34a',
          textColor: '#ffffff',
          sortOrder: 1,
          isActive: true
        },
        {
          name: 'Absent',
          key: 'absent',
          symbol: 'X',
          bgColor: '#dc2626',
          textColor: '#ffffff',
          sortOrder: 2,
          isActive: true
        },
        {
          name: 'Leave',
          key: 'leave',
          symbol: 'X',
          bgColor: '#eab308',
          textColor: '#000000',
          sortOrder: 3,
          isActive: true
        },
        {
          name: 'Week Off',
          key: 'week_off',
          symbol: 'X',
          bgColor: '#6b7280',
          textColor: '#ffffff',
          sortOrder: 4,
          isActive: true
        },
        {
          name: 'Holiday',
          key: 'holiday',
          symbol: 'X',
          bgColor: '#2563eb',
          textColor: '#ffffff',
          sortOrder: 5,
          isActive: true
        }
      ]);

      console.log('Default headers seeded');
    }
  } catch (err) {
    console.error('Header seed error:', err);
  }
};

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Billing backend is running',
    status: 'ok'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();

    res.status(200).json({
      message: 'Billing backend is healthy',
      status: 'ok'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      message: 'Database connection failed',
      status: 'error'
    });
  }
});





// ---------------- UOM Routes ----------------

// Get active UOM list - all logged in users
app.get('/api/uoms', protect, async (req, res) => {
  try {
    const uoms = await Uom.find({ isActive: true }).sort({ name: 1 });
    res.json(uoms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all UOMs - Super Admin only
app.get('/api/uoms/all', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const uoms = await Uom.find().sort({ name: 1 });
    res.json(uoms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create UOM - Super Admin only
app.post('/api/uoms', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const { name, code, isActive } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'UOM name is required' });
    }

    const normalizedName = String(name).trim();

    const exists = await Uom.findOne({
      name: { $regex: `^${normalizedName}$`, $options: 'i' }
    });

    if (exists) {
      return res.status(400).json({ message: 'UOM already exists' });
    }

    const uom = await Uom.create({
      name: normalizedName,
      code: code || '',
      isActive: isActive ?? true,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    res.status(201).json(uom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update UOM - Super Admin only
app.put('/api/uoms/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const uom = await Uom.findById(req.params.id);

    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }

    const { name, code, isActive } = req.body;

    if (name !== undefined) {
      const normalizedName = String(name).trim();

      const exists = await Uom.findOne({
        _id: { $ne: uom._id },
        name: { $regex: `^${normalizedName}$`, $options: 'i' }
      });

      if (exists) {
        return res.status(400).json({ message: 'UOM already exists' });
      }

      uom.name = normalizedName;
    }

    if (code !== undefined) uom.code = code;
    if (isActive !== undefined) uom.isActive = isActive;
    uom.updatedBy = req.user._id;

    await uom.save();
    res.json(uom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete UOM - Super Admin only
app.delete('/api/uoms/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const uom = await Uom.findById(req.params.id);

    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }

    await Uom.deleteOne({ _id: req.params.id });
    res.json({ message: 'UOM deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------- Auth Routes ----------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0)
  });
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json(req.user);
});

// ---------------- User Routes ----------------

app.get('/api/users', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const query = req.user.role === 'Admin' ? { role: 'SME' } : {};
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (req.user.role === 'Admin' && role === 'Super Admin') {
      return res.status(403).json({ message: 'Unauthorized assigning Super Admin role' });
    }

    if (req.user.role === 'Admin' && role === 'Admin') {
      return res.status(403).json({ message: 'Admin cannot create another Admin' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------- Header Routes ----------------
const getFinancialYear = (inputDate) => {
  const date = inputDate ? new Date(inputDate) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date for invoice generation');
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // FY starts in April
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

const generateInvoiceNumber = async (sheetId, inputDate) => {
  const fy = getFinancialYear(inputDate);

 const counter = await InvoiceCounter.findOneAndUpdate(
  { sheetId, fy },
  { $inc: { lastNumber: 1 } },
  { returnDocument: 'after', upsert: true }
);

  const runningNo = String(counter.lastNumber).padStart(2, '0');
  return `ICT/${fy}/${runningNo}`;
};

const generateSlNo = async (sheetId) => {
  const counter = await SlNoCounter.findOneAndUpdate(
    { sheetId },
    { $inc: { lastNumber: 1 } },
    { new: true, upsert: true }
  );

  return String(counter.lastNumber).padStart(2, '0');
};



app.get('/api/headers', protect, async (req, res) => {
  try {
    const headers = await Header.find().sort({ sortOrder: 1, createdAt: 1 });
    res.json(headers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/headers', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { name, key, symbol, bgColor, textColor, sortOrder, isActive } = req.body;

    const normalizedKey = key?.trim().toLowerCase();
    if (!name || !normalizedKey) {
      return res.status(400).json({ message: 'Name and key are required' });
    }

    const exists = await Header.findOne({ key: normalizedKey });
    if (exists) {
      return res.status(400).json({ message: 'Header key already exists' });
    }

    const header = await Header.create({
      name,
      key: normalizedKey,
      symbol: symbol || 'X',
      bgColor: bgColor || '#1f2937',
      textColor: textColor || '#ffffff',
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    res.status(201).json(header);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/headers/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const header = await Header.findById(req.params.id);
    if (!header) return res.status(404).json({ message: 'Header not found' });

    const { name, key, symbol, bgColor, textColor, sortOrder, isActive } = req.body;

    if (key && key.trim().toLowerCase() !== header.key) {
      const normalizedKey = key.trim().toLowerCase();
      const exists = await Header.findOne({
        key: normalizedKey,
        _id: { $ne: header._id }
      });

      if (exists) {
        return res.status(400).json({ message: 'Header key already exists' });
      }

      header.key = normalizedKey;
    }

    header.name = name ?? header.name;
    header.symbol = symbol ?? header.symbol;
    header.bgColor = bgColor ?? header.bgColor;
    header.textColor = textColor ?? header.textColor;
    header.sortOrder = sortOrder ?? header.sortOrder;
    header.isActive = isActive ?? header.isActive;
    header.updatedBy = req.user._id;

    await header.save();
    res.json(header);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/headers/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const header = await Header.findById(req.params.id);
    if (!header) return res.status(404).json({ message: 'Header not found' });

    await Header.deleteOne({ _id: req.params.id });
    res.json({ message: 'Header deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------- Sheet Routes ----------------

app.get('/api/sheets', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role !== 'Super Admin') {
      query.assignedTo = req.user._id;
    }

    const sheets = await Sheet.find(query)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name');

    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/sheets', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { title, processType, assignedTo } = req.body;

    let allowedAssignedTo = assignedTo || [];

    if (req.user.role === 'Admin' && !allowedAssignedTo.includes(req.user._id.toString())) {
      allowedAssignedTo.push(req.user._id);
    }

    const sheet = await Sheet.create({
      title,
      processType,
      assignedTo: allowedAssignedTo,
      createdBy: req.user._id
    });

    res.status(201).json(sheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/sheets/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);

    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }

    if (req.body.title !== undefined) sheet.title = req.body.title;
    if (req.body.processType !== undefined) sheet.processType = req.body.processType;
    if (req.body.assignedTo !== undefined) sheet.assignedTo = req.body.assignedTo;
    if (req.body.customHeaders !== undefined) sheet.customHeaders = req.body.customHeaders || {};
    if (req.body.extraHeaders !== undefined) sheet.extraHeaders = req.body.extraHeaders || [];
    if (req.body.hiddenHeaders !== undefined) sheet.hiddenHeaders = req.body.hiddenHeaders || [];

    await sheet.save();
    res.json(sheet);
  } catch (error) {
    console.error('UPDATE SHEET ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/sheets/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    await Record.deleteMany({ sheetId: sheet._id });
    await Sheet.deleteOne({ _id: req.params.id });

    res.json({ message: 'Sheet removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------- Record Routes ----------------

app.get('/api/sheets/:sheetId/records', protect, async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.sheetId);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    const isAssigned = sheet.assignedTo.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (req.user.role !== 'Super Admin' && !isAssigned) {
      return res.status(403).json({ message: 'Not authorized for this sheet' });
    }

    const { project, aoNumber, potentialNo, date, uom } = req.query;
    let query = { sheetId: req.params.sheetId };

    if (project) query.project = { $regex: project, $options: 'i' };
    if (aoNumber) query.aoNumber = { $regex: aoNumber, $options: 'i' };
    if (potentialNo) query.potentialNo = { $regex: potentialNo, $options: 'i' };
    if (date) query.date = { $regex: date, $options: 'i' };
    if (uom) query.uom = { $regex: uom, $options: 'i' };

    const records = await Record.find(query);
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post('/api/sheets/:sheetId/records', protect, async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.sheetId);
    if (!sheet) return res.status(404).json({ message: 'Sheet not found' });

    const isAssigned = sheet.assignedTo.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (req.user.role !== 'Super Admin' && !isAssigned) {
      return res.status(403).json({ message: 'Not authorized for this sheet' });
    }

    const payload = { ...req.body };

    // Auto-generate invoice number per sheet + FY
    if (!payload.invoiceNo || !String(payload.invoiceNo).trim()) {
      payload.invoiceNo = await generateInvoiceNumber(sheet._id, payload.date);
    }

    // Auto-generate Sl No per sheet
    if (!payload.slNo || !String(payload.slNo).trim()) {
      payload.slNo = await generateSlNo(sheet._id);
    }

    const record = await Record.create({
      ...payload,
      sheetId: sheet._id,
      processType: sheet.processType,
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Create record error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/records/:id', protect, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const sheet = await Sheet.findById(record.sheetId);
    const isAssigned = sheet.assignedTo.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (req.user.role !== 'Super Admin' && !isAssigned) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // lock billed records for non-super-admin users
    if (record.billedStatus && req.user.role !== 'Super Admin') {
      return res.status(403).json({
        message: 'This record is billed and cannot be edited by other users'
      });
    }

    const payload = { ...req.body };

    if (!payload.invoiceNo || !String(payload.invoiceNo).trim()) {
      payload.invoiceNo = record.invoiceNo;
    }

    if (!payload.slNo || !String(payload.slNo).trim()) {
      payload.slNo = record.slNo;
    }

    const updated = await Record.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Super Admin only can update billed status
app.put('/api/records/:id/billed-status', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const { billedStatus } = req.body;

    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    record.billedStatus = !!billedStatus;
    await record.save();

    res.json(record);
  } catch (error) {
    console.error('Billed status update error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/records/:id', protect, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Only Super Admin can delete records' });
    }

    await Record.deleteOne({ _id: req.params.id });
    res.json({ message: 'Record removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  connectDB()
    .then(async () => {
      await seedSuperAdmin();
      await seedHeaders();
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}

connectDB()
  .then(async () => {
    await seedSuperAdmin();
    await seedHeaders();
  })
  .catch((error) => {
    console.error('Database bootstrap failed:', error);
  });

module.exports = app;
