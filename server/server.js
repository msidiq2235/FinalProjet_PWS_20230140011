const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // Untuk generate Lisensi Unik

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// KONEKSI DATABASE
const db = mysql.createConnection({
    host: 'localhost',
    port: 3307,        // SESUAIKAN PORT MYSQL KAMU
    user: 'root',
    password: 'MSidiq',      // SESUAIKAN PASSWORD
    database: 'db_forgeplay_final'
});

db.connect(err => {
    if (err) console.error('Database Error:', err);
    else console.log('✅ Application Layer Connected to Data Layer');
});

// --- AUTHENTICATION & AUTHORIZATION ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT id, username, role FROM users WHERE username = ? AND password = ?', 
    [username, password], (err, result) => {
        if (result.length > 0) res.json({ status: 'success', user: result[0] });
        else res.status(401).json({ status: 'error', message: 'Username/Password Salah' });
    });
});

app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    
    // Generate API Key Baru (Misal: KEY-A1B2-C3D4)
    const newApiKey = 'KEY-' + uuidv4().toUpperCase().substring(0, 18); 

    // Masukkan Username, Password, DAN API KEY
    db.query('INSERT INTO users (username, password, api_key, role) VALUES (?, ?, ?, "user")', 
    [username, password, newApiKey], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Username sudah dipakai' });
        }
        res.json({ message: 'Registrasi Berhasil', api_key: newApiKey });
    });
});

// --- GAME CATALOG (Landing Page Data) ---
app.get('/api/games', (req, res) => {
    // Hanya tampilkan data umum (Download URL disembunyikan)
   db.query('SELECT id, title, description, price, image_url, genre, discount FROM games', (err, result) => res.json(result));
});

// --- BUSINESS LOGIC: PEMBELIAN & PENERBITAN LISENSI ---
app.post('/api/buy', (req, res) => {
    const { user_id, game_id } = req.body;

    // 1. Cek apakah user sudah punya lisensi aktif?
    db.query('SELECT * FROM licenses WHERE user_id = ? AND game_id = ?', [user_id, game_id], (err, check) => {
        if (check.length > 0) return res.status(400).json({ message: 'Anda sudah memiliki game ini!' });

        // 2. Simulasi Payment Sukses -> Generate LICENSE KEY
        const newLicense = 'LICENSE-' + uuidv4().toUpperCase().substring(0, 18);

        // 3. Simpan ke Database Lisensi
        db.query('INSERT INTO licenses (user_id, game_id, license_key) VALUES (?, ?, ?)', 
        [user_id, game_id, newLicense], (err) => {
            if (err) return res.status(500).json({ message: 'Gagal memproses transaksi' });
            
            res.json({ 
                status: 'success', 
                message: 'Pembelian Berhasil! Lisensi diterbitkan.',
                license_key: newLicense
            });
        });
    });
});

// --- USER LIBRARY (Menampilkan Game yg sudah dibeli) ---
app.get('/api/library/:userId', (req, res) => {
    // JOIN Table Games & Licenses
    const sql = `SELECT g.id, g.title, g.image_url, l.license_key 
                 FROM licenses l 
                 JOIN games g ON l.game_id = g.id 
                 WHERE l.user_id = ?`;
    db.query(sql, [req.params.userId], (err, result) => res.json(result));
});

// --- ACCESS CONTROL (Download Game) ---
app.post('/api/access', (req, res) => {
    const { user_id, game_id, license_key } = req.body;

    // Verifikasi: Apakah User + Game + Lisensi Valid?
    const sql = `SELECT g.download_url 
                 FROM licenses l
                 JOIN games g ON l.game_id = g.id
                 WHERE l.user_id = ? AND l.game_id = ? AND l.license_key = ?`;
    
    db.query(sql, [user_id, game_id, license_key], (err, result) => {
        if (result.length === 0) return res.status(403).json({ message: 'AKSES DITOLAK: Lisensi Tidak Valid' });
        
        // Jika Valid, berikan Link Rahasia
        res.json({ status: 'authorized', url: result[0].download_url });
    });
});

// --- ADMIN DASHBOARD (Tambah Game) ---
app.post('/api/admin/add-game', (req, res) => {
    // 1. Ambil discount dari req.body
    const { title, description, price, image_url, download_url, genre, discount } = req.body; 
    
    // Default jadi 0 kalau kosong
    const finalDiscount = discount || 0;

    // 2. Perhatikan Query INSERT ini:
    // Kolom: title, description, price, image_url, download_url, genre, discount (Total 7)
    // Values (?, ?, ?, ?, ?, ?, ?) (Total 7 Tanda Tanya)
    const sql = 'INSERT INTO games (title, description, price, image_url, download_url, genre, discount) VALUES (?, ?, ?, ?, ?, ?, ?)';

    // 3. Masukkan datanya (Urutannya harus sama!)
    db.query(sql, [title, description, price, image_url, download_url, genre, finalDiscount], (err) => {
        if (err) {
            console.error("❌ ERROR DATABASE:", err); // Biar error muncul di Terminal
            return res.status(500).json({message: 'Gagal simpan ke database'});
        }
        res.json({ message: 'Game Berhasil Dipublish' });
    });
});

// --- ADMIN: GET ALL USERS ---
app.get('/api/users', (req, res) => {
    // PASTIKAN ADA 'created_at' DI SINI 👇
    const sql = 'SELECT id, username, role, api_key, created_at FROM users ORDER BY created_at DESC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// --- ADMIN: HAPUS GAME ---
app.delete('/api/admin/game/:id', (req, res) => {
    const gameId = req.params.id;

    // 1. Hapus dulu Lisensi yang terkait (Biar tidak error Foreign Key)
    db.query('DELETE FROM licenses WHERE game_id = ?', [gameId], (err) => {
        if (err) return res.status(500).json({message: 'Gagal menghapus data lisensi'});

        // 2. Baru hapus Gamenya
        db.query('DELETE FROM games WHERE id = ?', [gameId], (err) => {
            if (err) return res.status(500).json({message: 'Gagal menghapus game'});
            res.json({ message: 'Game berhasil dihapus permanen' });
        });
    });
});

// --- ADMIN: EDIT GAME ---
app.put('/api/admin/game/:id', (req, res) => {
    const gameId = req.params.id;
    const { title, description, price, image_url, download_url, genre, discount } = req.body;

    const sql = `UPDATE games SET title=?, description=?, price=?, image_url=?, download_url=?, genre=?, discount=? WHERE id=?`;

    db.query(sql, [title, description, price, image_url, download_url, genre, discount, gameId], (err) => {
        if (err) return res.status(500).json({message: 'Gagal update game'});
        res.json({ message: 'Data game berhasil diperbarui!' });
    });
});

// --- WISHLIST: TOGGLE (ADD/REMOVE) ---
app.post('/api/wishlist/toggle', (req, res) => {
    const { user_id, game_id } = req.body;

    // 1. Cek dulu apakah sudah ada di wishlist?
    db.query('SELECT * FROM wishlist WHERE user_id = ? AND game_id = ?', [user_id, game_id], (err, results) => {
        if (err) return res.status(500).json({message: 'Database error'});

        if (results.length > 0) {
            // JIKA SUDAH ADA -> HAPUS (REMOVE)
            db.query('DELETE FROM wishlist WHERE user_id = ? AND game_id = ?', [user_id, game_id], (err) => {
                res.json({ status: 'removed', message: 'Removed from Wishlist' });
            });
        } else {
            // JIKA BELUM ADA -> TAMBAH (ADD)
            db.query('INSERT INTO wishlist (user_id, game_id) VALUES (?, ?)', [user_id, game_id], (err) => {
                res.json({ status: 'added', message: 'Added to Wishlist' });
            });
        }
    });
});

// --- WISHLIST: GET USER WISHLIST (List ID Game saja) ---
// Ini untuk menandai tombol "Heart" di halaman Store (Merah/Putih)
app.get('/api/wishlist/check/:userId', (req, res) => {
    db.query('SELECT game_id FROM wishlist WHERE user_id = ?', [req.params.userId], (err, results) => {
        if (err) return res.json([]);
        // Kirim array ID game saja: contoh [1, 5, 8]
        const gameIds = results.map(row => row.game_id);
        res.json(gameIds);
    });
});

// --- WISHLIST: GET FULL DETAILS (Untuk Halaman My Wishlist) ---
app.get('/api/wishlist/:userId', (req, res) => {
    const sql = `
        SELECT g.*, w.created_at as wishlist_date 
        FROM wishlist w 
        JOIN games g ON w.game_id = g.id 
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
    `;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json([]);
        res.json(results);
    });
});

app.listen(PORT, () => console.log(`🚀 ForgePlay Server running at http://localhost:${PORT}`));