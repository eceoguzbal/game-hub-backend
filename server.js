import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';  // ← ADD THIS
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ← REPLACE the old `new PrismaClient({})` with these two lines:
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
app.use(cors());
app.use(express.json());

// ... Kodunun geri kalan kısmı (Register, Login ve listen kısımları) tamamen aynı kalabilir.
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const PORT = process.env.PORT || 3000;

// ==========================================
// 🔐 1. REGISTER (KAYIT OLMA) API'SI
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kullanıcı adı veya şifre boş mu kontrolü
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });
    }

    // Bu kullanıcı adı daha önce alınmış mı?
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
    }

    // Şifreyi güvenli hale getiriyoruz (Hashleme)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıyı Supabase'e kaydediyoruz
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });

    res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu! 🎉', userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

// ==========================================
// 🔑 2. LOGIN (GİRİŞ YAPMA) API'SI
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kullanıcıyı veritabanında ara
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(400).json({ error: 'Hatalı kullanıcı adı veya şifre.' });
    }

    // Gelen şifre ile veritabanındaki hashlenmiş şifreyi karşılaştır
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Hatalı kullanıcı adı veya şifre.' });
    }

    // Şifre doğruysa kullanıcıya bir JWT Token üretiyoruz
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' } // Token 24 saat geçerli olsun
    );

    res.json({
      message: 'Giriş başarılı! 🚀',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});
// ==========================================
// 👥 3. KULLANICILARI LİSTELE
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          // password: false  ← şifreyi asla gönderme!
        }
      });
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  });

// Server'ı ayağa kaldır
app.listen(PORT, () => {
  console.log(`🚀 Server http://localhost:${PORT} adresinde çalışıyor!`);
});