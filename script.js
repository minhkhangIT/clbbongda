// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://vicrggfxuakpfxzhuktj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vm635kgShm0yeSPboZ5ZLA_OX4OPbN4'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let playerToDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    displayDate();
    fetchPlayers();
});

// 2. FETCH DATA (Cập nhật: Lấy thêm cột available)
async function fetchPlayers() {
    const { data, error } = await supabaseClient
        .from('players')
        .select('*')
        .order('pots', { ascending: true }) // Sắp xếp theo nhóm trước (1 -> 3)
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching:', error);
    } else {
        players = data; // Không cần gán cứng false nữa vì đã lấy từ DB
        renderTable();
        updateStats();
    }
}

// 3. ADD PLAYER
async function addPlayer() {
    const nameInput = document.getElementById('playerName');
    const potsInput = document.getElementById('playerPots');

    if (nameInput.value.trim() === "") return alert("Vui lòng nhập tên");

    const { error } = await supabaseClient
        .from('players')
        .insert([{ 
            name: nameInput.value.trim(), 
            pots: parseInt(potsInput.value),
            available: false // Mặc định khi thêm mới là chưa điểm danh
        }]);

    if (error) {
        alert("Lỗi lưu cầu thủ: " + error.message);
    } else {
        nameInput.value = "";
        fetchPlayers(); 
    }
}

// 4. TOGGLE AVAILABILITY (Cập nhật: Lưu vào Database)
async function toggleAvailable(id, currentStatus) {
    const { error } = await supabaseClient
        .from('players')
        .update({ available: !currentStatus }) // Đảo ngược trạng thái hiện tại
        .eq('id', id);

    if (error) {
        alert("Không thể cập nhật trạng thái: " + error.message);
        fetchPlayers(); // Reset lại UI nếu lỗi
    } else {
        // Cập nhật local state để UI thay đổi ngay lập tức mà không cần load lại toàn bộ table nếu muốn
        // Ở đây ta gọi fetchPlayers để đảm bảo đồng bộ hoàn toàn
        fetchPlayers();
    }
}

let playerToEditId = null;

// Update renderTable to include the Edit button
function renderTable() {
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = "";
    
    players.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.name}</td>
                <td><span class="pot-badge pot-${p.pots}">${p.pots}</span></td>
                <td>
                    <input type="checkbox" ${p.available ? 'checked' : ''} 
                    onchange="toggleAvailable(${p.id}, ${p.available})">
                </td>
                <td>
                    <button class="btn-edit" onclick="openEditModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">Sửa</button>
                    <button class="btn-delete" onclick="openDeleteModal(${p.id})">Xóa</button>
                </td>
            </tr>
        `;
    });
}

// Open Edit Modal and fill data
function openEditModal(player) {
    playerToEditId = player.id;
    document.getElementById('editPlayerName').value = player.name;
    document.getElementById('editPlayerPots').value = player.pots;
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    playerToEditId = null;
}

// Confirm Edit Action
document.getElementById('confirmEditBtn').onclick = async function() {
    const newName = document.getElementById('editPlayerName').value.trim();
    const newPot = parseInt(document.getElementById('editPlayerPots').value);

    if (!newName) return alert("Tên không được để trống");

    const { error } = await supabaseClient
        .from('players')
        .update({ name: newName, pots: newPot })
        .eq('id', playerToEditId);

    if (error) {
        alert("Cập nhật thất bại: " + error.message);
    } else {
        closeEditModal();
        fetchPlayers();
    }
}
// 5. DELETE PLAYER
document.getElementById('confirmDeleteBtn').onclick = async function() {
    if (playerToDeleteId) {
        const { error } = await supabaseClient
            .from('players')
            .delete()
            .eq('id', playerToDeleteId);

        if (error) {
            alert("Xóa thất bại");
        } else {
            closeModal();
            fetchPlayers();
        }
    }
}

// THUẬT TOÁN CHIA ĐỘI (Giữ nguyên logic lọc từ players đã fetch)
function divideTeams() {
    let pool = players.filter(p => p.available);
    if (pool.length < 5) return alert("Cần ít nhất 5 cầu thủ đã điểm danh để chia đội");

    const numTeams = Math.floor(pool.length / 5);
    const numSubs = pool.length % 5;

    const p1 = pool.filter(p => p.pots === 1).sort(() => Math.random() - 0.5);
    const p2 = pool.filter(p => p.pots === 2).sort(() => Math.random() - 0.5);
    const p3 = pool.filter(p => p.pots === 3).sort(() => Math.random() - 0.5);

    const sortedPool = [...p1, ...p2, ...p3];
    const finalPool = [...sortedPool];
    const subs = [];
    
    for(let i = 0; i < numSubs; i++) {
        const randomIndex = Math.floor(Math.random() * finalPool.length);
        subs.push(finalPool.splice(randomIndex, 1)[0]);
    }

    let teams = Array.from({ length: numTeams }, () => ({ members: [] }));
    
    finalPool.forEach((player, index) => {
        const teamIndex = index % numTeams;
        teams[teamIndex].members.push(player);
    });

    renderResults(teams, subs);
}

// RENDER RESULTS & STATS (Giữ nguyên)
function renderResults(teams, subs) {
    const container = document.getElementById('results');
    container.innerHTML = "";

    teams.forEach((team, i) => {
        container.innerHTML += `
            <div class="team-card">
                <div class="team-header">ĐỘI ${i+1}</div>
                <ul>${team.members.map(m => `<li><span>${m.name}</span><span class="pot-text">H${m.pots}</span></li>`).join('')}</ul>
            </div>`;
    });

    if (subs.length > 0) {
        container.innerHTML += `
            <div class="team-card sub-card">
                <div class="team-header">DỰ BỊ 🙁</div>
                <ul>${subs.map(m => `<li><span>${m.name}</span><span class="pot-text">H${m.pots}</span></li>`).join('')}</ul>
            </div>`;
    }
}

function updateStats() {
    document.getElementById('totalPlayers').innerText = players.length;
    document.getElementById('availablePlayers').innerText = players.filter(p => p.available).length;
}

function displayDate() {
    const now = new Date();
    document.getElementById('currentDate').innerText = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function openDeleteModal(id) {
    playerToDeleteId = id;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
    playerToDeleteId = null;
}