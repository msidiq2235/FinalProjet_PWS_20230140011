const API_URL = 'http://localhost:3000/api';
const userId = localStorage.getItem('user_id');
let userWishlist = []; // Menyimpan ID game yang di-wishlist user

// --- 1. FITUR NOTIFIKASI (TOAST) ---
// Ini pengganti alert() biar terlihat premium
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if(!container) return; // Guard clause

    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400';
    const icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
    
    toast.className = `flex items-center gap-3 bg-[#1b2838] border-l-4 ${colorClass} text-white px-6 py-4 rounded shadow-2xl mb-3 transform transition-all duration-300 translate-x-full opacity-0`;
    toast.innerHTML = `
        <div class="text-xl">${icon}</div>
        <div class="font-semibold text-sm">${message}</div>
    `;

    container.appendChild(toast);

    // Animasi Masuk
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);

    // Hilang otomatis setelah 3 detik
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- 2. AUTH LOGIC ---
async function handleAuth() {
    const u = document.getElementById('u').value;
    const p = document.getElementById('p').value;

    if(!u || !p) return showToast("Please fill in all fields", "error");
    
    try {
        let res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p})
        });

        if (res.status === 401) {
            // Simulasi UX: Tawar Register
            if(confirm("Account not found. Would you like to create a new account?")) {
                res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: u, password: p})
                });
                if(res.ok) {
                    showToast("Account created! Please Sign In.", "success");
                    return;
                }
            }
            return showToast("Authentication failed", "error");
        }

        const data = await res.json();
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('role', data.user.role);
        
        window.location.href = 'index.html';
    } catch (err) {
        showToast("Server connection error", "error");
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- 3. UI INTERACTIVITY ---

// Tombol Wishlist (Simulasi)
function toggleWishlist(btn) {
    if(!userId) return window.location.href = 'login.html';
    
    // Cek state saat ini
    const isAdded = btn.getAttribute('data-added') === 'true';

    if (!isAdded) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> IN WISHLIST';
        btn.classList.remove('bg-gray-800', 'bg-opacity-80');
        btn.classList.add('bg-blue-600', 'text-white');
        btn.setAttribute('data-added', 'true');
        showToast("Added to your Wishlist");
    } else {
        btn.innerHTML = 'ADD TO WISHLIST';
        btn.classList.add('bg-gray-800', 'bg-opacity-80');
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.setAttribute('data-added', 'false');
        showToast("Removed from Wishlist");
    }
}

// Tombol Scroll ke Catalog
function scrollToCatalog() {
    document.getElementById('store-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Tombol Panah (Simulasi Refresh Katalog)
function refreshCatalog() {
    const grid = document.getElementById('store-grid');
    grid.innerHTML = '<div class="col-span-full h-40 flex items-center justify-center text-gray-500"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Refreshing...</div>';
    
    setTimeout(() => {
        loadStore(); // Load ulang data
    }, 800);
}

// Menu Navigasi Login State
function checkLoginState() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (userId) {
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');

        navAuth.innerHTML = `
        ${adminControls}
        <a href="wishlist.html" class="text-gray-400 hover:text-red-400 px-3 transition" title="My Wishlist">
            <i class="fa-solid fa-heart"></i>
        </a>

        <a href="library.html" class="text-gray-400 hover:text-red-400 px-3 transition" title="My Library">
            <i class="fa-solid fa-layer-group"></i>
        </a>
        `;
        
        // Tombol Publisher (Hanya Admin)
        let adminBtn = '';
        if(role === 'admin') {
            adminBtn = `<button onclick="toggleAdminModal()" class="text-red-400 hover:text-red-300 mr-4 text-xs font-bold uppercase tracking-wider border border-red-900 px-2 py-1 rounded bg-red-900/20">Publisher Panel</button>`;
        }

        navAuth.innerHTML = `
            ${adminBtn}
            <a href="library.html" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold mr-2 transition flex items-center gap-2">
                <i class="fa-solid fa-layer-group"></i> LIBRARY
            </a>
            <div class="flex items-center gap-3 cursor-pointer group relative" onclick="logout()">
                <div class="text-right hidden sm:block">
                    <div class="text-xs text-blue-400 font-bold uppercase">${username}</div>
                    <div class="text-[10px] text-gray-500 group-hover:text-red-400 transition">LOGOUT</div>
                </div>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${username}" class="w-9 h-9 rounded bg-gray-700 border border-gray-600 group-hover:border-red-500 transition">
            </div>
        `;
    }
}

// --- 4. STORE LOGIC ---
async function loadStore() {
    const grid = document.getElementById('store-grid');
    if (!grid) return;
    
    // Cek apakah yang login adalah ADMIN
    const isAdmin = localStorage.getItem('role') === 'admin';

    if (userId) {
        try {
            const wRes = await fetch(`${API_URL}/wishlist/check/${userId}`);
            userWishlist = await wRes.json();
        } catch(e) {}
    }

    try {
        const res = await fetch(`${API_URL}/games`);
        const games = await res.json();
        grid.innerHTML = '';

        games.forEach(g => {
            const shortDesc = g.description.length > 60 ? g.description.substring(0, 60) + '...' : g.description;
            const genre = g.genre || 'General';

            const safeTitle = g.title.replace(/'/g, "\\'"); 
            const safeImg = g.image_url;

            const isWishlisted = typeof userWishlist !== 'undefined' && userWishlist.includes(g.id);
            const heartClass = isWishlisted ? 'fa-solid text-red-500' : 'fa-regular text-gray-400';

            const discount = g.discount || 0; // Ambil dari database
            let priceHTML = '';

            if (discount > 0) {
                // Kalau ada diskon: Hitung harga asli sebelum diskon
                // Rumus: Harga Jual / ((100 - Diskon) / 100)
                const originalPrice = g.price / ((100 - discount) / 100);
                
                priceHTML = `
                    <span class="bg-[#4c6b22] text-[#c1f028] text-[10px] font-bold px-1.5 py-0.5 rounded">-${discount}%</span>
                    <div class="text-right">
                        <div class="text-[10px] text-gray-500 line-through">Rp ${originalPrice.toLocaleString('id-ID', {maximumFractionDigits:0})}</div>
                        <div class="text-white font-bold text-sm">Rp ${g.price.toLocaleString()}</div>
                    </div>
                `;
            } else {
                // Kalau TIDAK ada diskon (0%): Tampilkan harga normal saja
                priceHTML = `
                    <span class="opacity-0">.</span> <div class="text-right">
                        <div class="text-white font-bold text-sm">Rp ${g.price.toLocaleString()}</div>
                    </div>
                `;
            }

            // TOMBOL KHUSUS ADMIN (Edit & Delete)
            let adminControls = '';
            if (isAdmin) {
                const gameData = JSON.stringify(g).replace(/"/g, '&quot;'); 
                // Geser admin controls sedikit ke kiri (right-12) biar gak numpuk sama tombol love
                adminControls = `
                    <div class="absolute top-2 right-12 flex gap-2 z-20"> 
                        <button onclick="openEditModal(${gameData})" class="bg-yellow-600 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-yellow-500 shadow-lg" title="Edit Game">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="deleteGame(${g.id})" class="bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center hover:bg-red-500 shadow-lg" title="Delete Game">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;
            }

            grid.innerHTML += `
                <div class="bg-[#1e232d] rounded-xl overflow-hidden card-hover transition duration-300 relative group border border-gray-800 hover:border-blue-500/50 flex flex-col h-full">
                    
                    ${adminControls} 
                    
                    <div class="relative h-48 overflow-hidden">
                        
                        <button onclick="toggleWishlist(${g.id}, this)" class="absolute top-2 right-2 z-30 bg-black/50 hover:bg-black/80 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition border border-white/10 group-hover:scale-110">
                            <i class="${heartClass} fa-heart"></i>
                        </button>

                        <img src="${g.image_url}" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-700">
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition duration-300 flex items-center justify-center pointer-events-none"></div>
                        <div class="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-900 uppercase tracking-wider shadow-lg">
                            ${genre}
                        </div>
                    </div>

                    <div class="p-5 flex flex-col flex-grow">
                        <h4 class="text-lg font-bold text-white mb-1 leading-tight hover:text-blue-400 transition cursor-pointer">${g.title}</h4>
                        <p class="text-xs text-gray-400 mb-4 h-8 overflow-hidden leading-relaxed">${shortDesc}</p>

                        <div class="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center h-[50px]">
                            ${priceHTML}
                        </div>
                        <button onclick="openPaymentModal(${g.id}, '${safeTitle}', ${g.price}, '${safeImg}')" class="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-sm transition shadow-lg flex items-center justify-center gap-2 group-hover:bg-blue-500">
                            <i class="fa-solid fa-cart-shopping"></i> ${userId ? 'BUY NOW' : 'SIGN IN'}
                        </button>
                    </div>
                </div>
            `;
        });
    } catch(err) {
        console.error(err);
        grid.innerHTML = '<div class="col-span-full text-center text-red-500">Failed to load games.</div>';
    }
}

async function buyGame(gameId) {
    if(!userId) {
        showToast("Please Sign In first", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    if(!confirm("Purchase this game for your library?")) return;

    try {
        const res = await fetch(`${API_URL}/buy`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: userId, game_id: gameId })
        });
        const data = await res.json();
        
        if(data.status === 'success') {
            showToast("Game added to Library!", "success");
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        showToast("Transaction failed", "error");
    }
}

// --- 5. LIBRARY LOGIC ---
async function loadLibrary() {
    const grid = document.getElementById('library-grid');
    if (!grid) return;

    const res = await fetch(`${API_URL}/library/${userId}`);
    const games = await res.json();
    grid.innerHTML = '';
    
    const countEl = document.getElementById('game-count');
    if(countEl) countEl.innerText = `(${games.length} Games)`;

    if(games.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500">
            <i class="fa-solid fa-ghost text-4xl mb-4 opacity-50"></i><br>
            Your library is empty. <a href="index.html" class="text-blue-400 underline">Visit Store</a>
        </div>`;
        return;
    }

    games.forEach(g => {
        grid.innerHTML += `
            <div class="bg-[#2a475e] rounded overflow-hidden shadow-lg relative group border border-gray-700 hover:border-blue-400 transition">
                <img src="${g.image_url}" class="w-full h-40 object-cover opacity-80 group-hover:opacity-100 transition">
                <div class="p-4">
                    <h4 class="font-bold text-white truncate">${g.title}</h4>
                    <p class="text-xs text-blue-300 mt-1 font-mono flex items-center gap-1">
                        <i class="fa-solid fa-shield-halved"></i> LICENSED
                    </p>
                </div>
                <button onclick="accessGame(${g.id}, '${g.license_key}')" class="w-full bg-[#66c0f4] hover:bg-[#4192c0] text-white font-bold py-3 flex items-center justify-center gap-2 transition">
                    <i class="fa-solid fa-download"></i> INSTALL
                </button>
            </div>
        `;
    });
}

async function accessGame(gId, licKey) {
    const res = await fetch(`${API_URL}/access`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ user_id: userId, game_id: gId, license_key: licKey })
    });
    const data = await res.json();
    
    if(data.status === 'authorized') {
        showToast("Starting Download...", "success");
        setTimeout(() => window.open(data.url), 1000);
    } else {
        showToast(data.message, "error");
    }
}

// --- 6. ADMIN MODAL LOGIC ---
function toggleAdminModal() {
    const modal = document.getElementById('admin-modal');
    if(modal) modal.classList.toggle('hidden');
}

// --- ADMIN UPLOAD ---
async function adminUpload() {
    const title = document.getElementById('g-title').value;
    const price = document.getElementById('g-price').value;
    const img = document.getElementById('g-img').value;
    const genre = document.getElementById('g-genre').value; // Ambil nilai Genre

    if(!title || !price || !img) return showToast("All fields required", "error");

    const body = {
        title: document.getElementById('g-title').value,
        genre: document.getElementById('g-genre').value,
        price: document.getElementById('g-price').value,
        discount: document.getElementById('g-discount').value, // <--- TAMBAH INI
        image_url: document.getElementById('g-img').value,
        download_url: document.getElementById('g-url').value,
        description: document.getElementById('g-desc').value
    };
    
    await fetch(`${API_URL}/admin/add-game`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    
    showToast("Game Published Successfully!", "success");
    toggleAdminModal();
    
    // Reset Form
    document.getElementById('g-title').value = '';
    document.getElementById('g-price').value = '';
    document.getElementById('g-genre').value = ''; 
    document.getElementById('g-desc').value = '';
    document.getElementById('g-discount').value = '';
    
    loadStore();
}

function checkLoginState() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    if (userId) {
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        
        // Tombol Khusus Admin (Hanya muncul kalau login sebagai admin)
        let adminBtn = '';
        if(role === 'admin') {
            adminBtn = `
                <div class="flex gap-2 mr-2">
                    <button onclick="toggleAdminModal()" class="text-red-400 hover:text-white text-[10px] font-bold border border-red-900 px-3 py-1 rounded bg-red-900/20 hover:bg-red-600 transition">
                        <i class="fa-solid fa-upload"></i> ADD
                    </button>
                    <button onclick="openUserModal()" class="text-purple-400 hover:text-white text-[10px] font-bold border border-purple-900 px-3 py-1 rounded bg-purple-900/20 hover:bg-purple-600 transition">
                        <i class="fa-solid fa-users"></i> USERS
                    </button>
                </div>
            `;
        }

        // TAMPILAN SUDAH LOGIN
        navAuth.innerHTML = `
            ${adminBtn}

            <a href="wishlist.html" class="text-gray-400 hover:text-red-500 transition px-3 flex items-center" title="My Wishlist">
                <i class="fa-solid fa-heart text-xl"></i>
            </a>

            <a href="library.html" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold mr-2 transition flex items-center gap-2 border border-gray-600">
                <i class="fa-solid fa-layer-group"></i> LIBRARY
            </a>

            <div class="flex items-center gap-3 cursor-pointer group relative" onclick="logout()">
                <div class="text-right hidden sm:block">
                    <div class="text-xs text-blue-400 font-bold uppercase">${username}</div>
                    <div class="text-[10px] text-gray-500 group-hover:text-red-400 transition">LOGOUT</div>
                </div>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${username}" class="w-9 h-9 rounded bg-gray-700 border border-gray-600 group-hover:border-red-500 transition">
            </div>
        `;
    }
}

// --- FUNGSI BARU: MANAGE USERS ---
function toggleUserModal() {
    const modal = document.getElementById('user-modal');
    if(modal) modal.classList.toggle('hidden');
}

async function openUserModal() {
    toggleUserModal(); // Buka modal
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10"><i class="fa-solid fa-spinner fa-spin"></i> Loading data...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        
        tbody.innerHTML = ''; // Clear loading

        users.forEach(u => {
            // Styling Role Badge
            const roleBadge = u.role === 'admin' 
                ? '<span class="bg-red-900 text-red-300 text-xs px-2 py-1 rounded font-bold">ADMIN</span>' 
                : '<span class="bg-blue-900 text-blue-300 text-xs px-2 py-1 rounded font-bold">GAMER</span>';
            
            // Format Tanggal
            const date = u.created_at 
                ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-';

            tbody.innerHTML += `
                <tr class="hover:bg-[#212e3d] transition border-b border-gray-800">
                    <td class="px-6 py-4 font-mono text-gray-500 text-xs">#${u.id}</td>
                    <td class="px-6 py-4 font-bold text-white flex items-center gap-3">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}" class="w-8 h-8 rounded bg-gray-700">
                        <div>
                            <div class="text-sm">${u.username}</div>
                            <div class="text-[10px] text-gray-500 font-mono tracking-tighter">${u.api_key || 'No API Key'}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4">${roleBadge}</td>
                    <td class="px-6 py-4 text-gray-400 text-sm"><i class="fa-regular fa-calendar mr-2"></i>${date}</td>
                    <td class="px-6 py-4"><span class="text-green-500 text-xs font-bold border border-green-800 bg-green-900/20 px-2 py-1 rounded">● Active</span></td>
                </tr>
            `;
        });
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Failed to load users. Are you Admin?</td></tr>';
    }
}

// --- CRUD ADMIN LOGIC ---

// 1. DELETE GAME
async function deleteGame(id) {
    if(!confirm("⚠️ WARNING: Deleting this game will also remove it from all users' libraries.\nAre you sure?")) return;

    try {
        const res = await fetch(`${API_URL}/admin/game/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        
        if(res.ok) {
            showToast("Game Deleted Successfully", "success");
            loadStore(); // Refresh
        } else {
            showToast(data.message, "error");
        }
    } catch(err) {
        showToast("Error deleting game", "error");
    }
}

// 2. OPEN EDIT MODAL (Isi form dengan data lama)
function toggleEditModal() {
    document.getElementById('edit-modal').classList.toggle('hidden');
}

function openEditModal(game) {
    // Isi form dengan data game yang diklik
    document.getElementById('edit-id').value = game.id;
    document.getElementById('edit-title').value = game.title;
    document.getElementById('edit-genre').value = game.genre;
    document.getElementById('edit-price').value = game.price;
    document.getElementById('edit-url').value = game.download_url;
    document.getElementById('edit-img').value = game.image_url;
    document.getElementById('edit-desc').value = game.description;
    document.getElementById('edit-discount').value = game.discount || 0;

    toggleEditModal(); // Tampilkan modal
}

// 3. SAVE EDIT (Kirim data baru ke Backend)
async function saveEditGame() {
    const id = document.getElementById('edit-id').value;
    
    const body = {
        title: document.getElementById('edit-title').value,
        genre: document.getElementById('edit-genre').value,
        price: document.getElementById('edit-price').value,
        download_url: document.getElementById('edit-url').value,
        image_url: document.getElementById('edit-img').value,
        description: document.getElementById('edit-desc').value,
        price: document.getElementById('edit-price').value,
        discount: document.getElementById('edit-discount').value,
    };

    try {
        const res = await fetch(`${API_URL}/admin/game/${id}`, {
            method: 'PUT', // Method Update
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });

        if(res.ok) {
            showToast("Game Updated!", "success");
            toggleEditModal();
            loadStore();
        } else {
            showToast("Failed to update", "error");
        }
    } catch(err) {
        showToast("Server Error", "error");
    }
}

// --- SCROLL SPY (VERSI FINAL - TOP FOCUS) ---
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    // Config Baru: "Hot Zone" ada di 30% layar bagian atas.
    // -30% (Atas diabaikan dikit)
    // -60% (Bawah diabaikan BANYAK) -> Supaya FAQ yang ngintip di bawah gak ke-detect
    const observerOptions = {
        root: null,
        rootMargin: '-30% 0px -60% 0px', 
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 1. Reset Semua Link
                navLinks.forEach(link => {
                    link.classList.remove('text-white', 'font-bold', 'border-blue-500');
                    link.classList.add('text-gray-400', 'border-transparent');
                });

                // 2. Highlight Link Aktif
                const activeId = entry.target.getAttribute('id');
                const activeLink = document.getElementById(`nav-${activeId}`);
                
                if(activeLink) {
                    activeLink.classList.remove('text-gray-400', 'border-transparent');
                    activeLink.classList.add('text-white', 'font-bold', 'border-blue-500');
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});

// --- PAYMENT & CHECKOUT SYSTEM ---

let pendingGameId = null; // Menyimpan ID game yang sedang mau dibayar

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
    // Reset tombol loading jika dicancel
    const btn = document.getElementById('btn-confirm-pay');
    btn.innerHTML = 'PAY NOW';
    btn.disabled = false;
    btn.classList.remove('bg-gray-600', 'cursor-not-allowed');
    btn.classList.add('bg-green-600');
}

function openPaymentModal(id, title, price, img) {
    if(!userId) {
        showToast("Please Sign In to purchase", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    pendingGameId = id; // Simpan ID
    
    // Isi data ke Modal
    document.getElementById('pay-title').innerText = title;
    document.getElementById('pay-price').innerText = "Rp " + price.toLocaleString();
    document.getElementById('pay-img').src = img;

    // Tampilkan Modal
    document.getElementById('payment-modal').classList.remove('hidden');
}

async function processPayment() {
    if(!pendingGameId) return;

    const btn = document.getElementById('btn-confirm-pay');

    // 1. UBAH TAMPILAN JADI LOADING
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> PROCESSING...';
    btn.classList.remove('bg-green-600', 'hover:bg-green-500');
    btn.classList.add('bg-gray-600', 'cursor-not-allowed');

    // 2. SIMULASI DELAY (Biar kerasa kayak lagi connect ke bank)
    await new Promise(r => setTimeout(r, 2000)); // Tunggu 2 detik

    // 3. JALANKAN LOGIC BELI YANG ASLI (Fetch Backend)
    try {
        const res = await fetch(`${API_URL}/buy`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: userId, game_id: pendingGameId })
        });
        const data = await res.json();
        
        closePaymentModal(); // Tutup modal

        if(data.status === 'success') {
            // Tampilkan visual sukses besar atau toast
            showToast(`🎉 Success! ${document.getElementById('pay-title').innerText} added to Library.`, "success");
        } else {
            showToast("⚠️ " + data.message, "error");
        }
    } catch (err) {
        closePaymentModal();
        showToast("Transaction failed due to server error", "error");
    }
}

async function toggleWishlist(gameId, btnElement) {
    if(!userId) {
        showToast("Please Sign In to wishlist", "error");
        return;
    }

    // Efek Visual Instan (Biar UX Cepat)
    const icon = btnElement.querySelector('i');
    const isCurrentlyAdded = icon.classList.contains('fa-solid'); // Cek apakah hati penuh (merah)

    // Toggle Visual Dulu
    if(isCurrentlyAdded) {
        icon.classList.remove('fa-solid', 'text-red-500');
        icon.classList.add('fa-regular', 'text-gray-400');
    } else {
        icon.classList.remove('fa-regular', 'text-gray-400');
        icon.classList.add('fa-solid', 'text-red-500'); // Merah Hati
    }

    // Kirim ke Backend
    try {
        const res = await fetch(`${API_URL}/wishlist/toggle`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: userId, game_id: gameId })
        });
        const data = await res.json();
        
        // Tampilkan Notif
        if(data.status === 'added') showToast("❤️ Added to Wishlist");
        else showToast("💔 Removed from Wishlist");

    } catch(err) {
        showToast("Connection Error", "error");
    }
}