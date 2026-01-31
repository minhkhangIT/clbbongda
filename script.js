// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://vicrggfxuakpfxzhuktj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vm635kgShm0yeSPboZ5ZLA_OX4OPbN4'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let playerToDeleteId = null;
let playerToEditId = null;
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', () => {
    displayDate();
    fetchPlayers();
});

// --- FETCH & RENDER ---
async function fetchPlayers() {
    const { data, error } = await supabaseClient
        .from('players')
        .select('*');

    if (error) {
        console.error('Error fetching:', error);
    } else {
        players = data;
        if (currentSort.column) {
            sortPlayers(currentSort.column, true);
        } else {
            renderTable();
        }
        updateStats();
    }
}

function renderTable() {
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = "";
    
    players.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.name}</td>
                <td style="text-align:center"><b class="score-badge">${p.pots}</b></td>
                <td style="text-align:center">
                    <input type="checkbox" ${p.available ? 'checked' : ''} 
                    onchange="toggleAvailable(${p.id}, ${p.available})">
                </td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Sửa</button>
                </td>
                <td>
                    <button class="btn-delete" onclick="openDeleteModal(${p.id})">Xóa</button>
                </td>
            </tr>
        `;
    });
}

// --- ADD, EDIT, DELETE ---
async function addPlayer() {
    const nameInput = document.getElementById('playerName');
    const scoreInput = document.getElementById('playerScore');

    if (nameInput.value.trim() === "") return alert("Vui lòng nhập tên");

    const { error } = await supabaseClient
        .from('players')
        .insert([{ 
            name: nameInput.value.trim(), 
            pots: parseFloat(scoreInput.value), // Lưu điểm vào cột pots
            available: false 
        }]);

    if (error) {
        alert("Lỗi lưu cầu thủ: " + error.message);
    } else {
        nameInput.value = "";
        fetchPlayers(); 
    }
}

function openEditModal(player) {
    playerToEditId = player.id;
    document.getElementById('editPlayerName').value = player.name;
    document.getElementById('editPlayerScore').value = player.pots;
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

document.getElementById('confirmEditBtn').onclick = async function() {
    const newName = document.getElementById('editPlayerName').value.trim();
    const newScore = parseFloat(document.getElementById('editPlayerScore').value);

    if (!newName) return alert("Tên không được để trống");

    const { error } = await supabaseClient
        .from('players')
        .update({ name: newName, pots: newScore })
        .eq('id', playerToEditId);

    if (error) {
        alert("Cập nhật thất bại: " + error.message);
    } else {
        closeEditModal();
        fetchPlayers();
    }
}

async function toggleAvailable(id, currentStatus) {
    const { error } = await supabaseClient
        .from('players')
        .update({ available: !currentStatus })
        .eq('id', id);

    if (error) {
        alert("Lỗi cập nhật: " + error.message);
    } else {
        fetchPlayers();
    }
}

document.getElementById('confirmDeleteBtn').onclick = async function() {
    if (playerToDeleteId) {
        const { error } = await supabaseClient.from('players').delete().eq('id', playerToDeleteId);
        if (error) alert("Xóa thất bại");
        else { closeModal(); fetchPlayers(); }
    }
}

// --- THUẬT TOÁN CHIA ĐỘI ---
function divideTeams() {
    let pool = players.filter(p => p.available);
    if (pool.length < 5) return alert("Cần ít nhất 5 người để chia đội");

    const numTeams = Math.floor(pool.length / 5);
    const numSubs = pool.length % 5;

    // 1. Xáo trộn để ngẫu nhiên
    let shuffledPool = pool.map(p => ({
        ...p,
        score: parseFloat(p.pots) || 0
    })).sort(() => Math.random() - 0.5);

    // 2. Tách dự bị
    const subs = [];
    for (let i = 0; i < numSubs; i++) {
        const randomIndex = Math.floor(Math.random() * shuffledPool.length);
        subs.push(shuffledPool.splice(randomIndex, 1)[0]);
    }

    // 3. Tách Gôn và Cầu thủ thường
    const goaliePool = shuffledPool.filter(p => p.name.toLowerCase().includes('gôn'));
    const regularPool = shuffledPool.filter(p => !p.name.toLowerCase().includes('gôn'));
    regularPool.sort((a, b) => b.score - a.score);

    // 4. Khởi tạo đội
    let teams = Array.from({ length: numTeams }, () => ({ members: [], totalScore: 0 }));

    // 5. Chia Gôn đều
    goaliePool.forEach((goalie, index) => {
        const teamIndex = index % numTeams;
        teams[teamIndex].members.push(goalie);
        teams[teamIndex].totalScore += goalie.score;
    });

    // 6. Chia cầu thủ bằng thuật toán Greedy (Ưu tiên đội đang yếu/ít người)
    regularPool.forEach(player => {
        teams.sort((a, b) => a.totalScore - b.totalScore || a.members.length - b.members.length);
        teams[0].members.push(player);
        teams[0].totalScore += player.score;
    });

    renderResults(teams, subs);
}

function renderResults(teams, subs) {
    const container = document.getElementById('results');
    container.innerHTML = "";

    teams.forEach((team, i) => {
        container.innerHTML += `
            <div class="team-card">
                <div class="team-header">
                    <span>ĐỘI ${i + 1}</span>
                    <span class="team-score-badge">${team.totalScore.toFixed(1)} điểm</span>
                </div>
                <ul>
                    ${team.members.map(m => `
                        <li>
                            <span>${m.name}</span>
                            <span class="pot-text">${m.score}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>`;
    });

    if (subs.length > 0) {
        container.innerHTML += `
            <div class="team-card sub-card">
                <div class="team-header">DỰ BỊ 🙁</div>
                <ul>
                    ${subs.map(m => `<li><span>${m.name}</span><span class="pot-text">${m.score}</span></li>`).join('')}
                </ul>
            </div>`;
    }
}

// --- UTILS ---
function filterTable() {
    const searchTerm = removeVietnameseTones(document.getElementById('searchInput').value.toLowerCase());
    const rows = document.querySelectorAll('#playerTableBody tr');
    rows.forEach(row => {
        const name = removeVietnameseTones(row.cells[0].textContent.toLowerCase());
        row.style.display = name.includes(searchTerm) ? "" : "none";
    });
}

function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

function sortPlayers(column, maintainDirection = false) {
    if (!maintainDirection) {
        if (currentSort.column === column) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        else { currentSort.column = column; currentSort.direction = 'asc'; }
    }
    players.sort((a, b) => {
        let valA = a[column]; let valB = b[column];
        if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
    renderTable();
}

function updateStats() {
    document.getElementById('totalPlayers').innerText = players.length;
    document.getElementById('availablePlayers').innerText = players.filter(p => p.available).length;
}

function displayDate() {
    const now = new Date();
    document.getElementById('currentDate').innerText = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function openDeleteModal(id) { playerToDeleteId = id; document.getElementById('deleteModal').style.display = 'flex'; }
function closeModal() { document.getElementById('deleteModal').style.display = 'none'; }