// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://vicrggfxuakpfxzhuktj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vm635kgShm0yeSPboZ5ZLA_OX4OPbN4'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let playerToDeleteId = null;
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', () => {
    displayDate();
    fetchPlayers();
});


// --- SEARCH LOGIC (Cập nhật hỗ trợ Tiếng Việt không dấu) ---
function filterTable() {
    const searchTerm = removeVietnameseTones(document.getElementById('searchInput').value.toLowerCase());
    const rows = document.querySelectorAll('#playerTableBody tr');

    rows.forEach(row => {
        // Lấy tên cầu thủ từ cột đầu tiên, chuyển về chữ thường và bỏ dấu
        const name = removeVietnameseTones(row.cells[0].textContent.toLowerCase());
        
        if (name.includes(searchTerm)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

// Hàm phụ trợ để loại bỏ dấu Tiếng Việt
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Một vài bộ mã cũ có thể gây lỗi, thêm dòng này để chắc chắn
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    return str;
}
// --- SORTING LOGIC ---
function sortPlayers(column) {
    // Toggle direction if same column, otherwise default to asc
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    players.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Special handling for strings (names)
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
    filterTable(); // Re-apply search filter after sorting
}

// 2. FETCH DATA (Cập nhật: Lấy thêm cột available)
async function fetchPlayers() {
    const { data, error } = await supabaseClient
        .from('players')
        .select('*')
        .order('pots', { ascending: true }) // Sắp xếp theo nhóm trước (1 -> 3)
        .order('name', { ascending: true });

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
                </td>
                <td>
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
    if (pool.length < 5) return alert("Cần ít nhất 5 cầu thủ để chia đội");

    const numTeams = Math.floor(pool.length / 5);
    const numSubs = pool.length % 5;

    // 1. Gán điểm và xáo trộn để đảm bảo ngẫu nhiên
    const scoreMap = { 1: 4, 2: 3, 3: 2, 4: 1 };
    let scoredPool = pool.map(p => ({
        ...p,
        score: scoreMap[p.pots] || 1
    })).sort(() => Math.random() - 0.5);

    // 2. Tách dự bị ngẫu nhiên trước
    const subs = [];
    for (let i = 0; i < numSubs; i++) {
        const randomIndex = Math.floor(Math.random() * scoredPool.length);
        subs.push(scoredPool.splice(randomIndex, 1)[0]);
    }

    // 3. Phân loại: Nhóm Gôn và Nhóm thường
    // Sử dụng regex để tìm chữ "gôn" không phân biệt hoa thường
    const goaliePool = scoredPool.filter(p => p.name.toLowerCase().includes('gôn'));
    const regularPool = scoredPool.filter(p => !p.name.toLowerCase().includes('gôn'));

    // Sắp xếp nhóm thường từ điểm CAO đến THẤP để chạy Greedy
    regularPool.sort((a, b) => b.score - a.score);

    // 4. Khởi tạo danh sách đội
    let teams = Array.from({ length: numTeams }, () => ({ 
        members: [], 
        totalScore: 0 
    }));

    // 5. CHIA GÔN TRƯỚC: Chia đều vào các đội
    // Xáo trộn danh sách gôn một lần nữa để công bằng
    goaliePool.sort(() => Math.random() - 0.5);
    
    goaliePool.forEach((goalie, index) => {
        // Sử dụng modulo để xoay vòng gôn vào các đội (đội 1, 2, 3 rồi quay lại 1 nếu nhiều gôn)
        const teamIndex = index % numTeams;
        teams[teamIndex].members.push(goalie);
        teams[teamIndex].totalScore += goalie.score;
    });

    // 6. CHIA CẦU THỦ CÒN LẠI: Thuật toán Greedy
    regularPool.forEach(player => {
        // Tìm đội đang có ít điểm nhất
        // Nếu điểm bằng nhau, ưu tiên đội có ít người hơn
        teams.sort((a, b) => a.totalScore - b.totalScore || a.members.length - b.members.length);
        
        teams[0].members.push(player);
        teams[0].totalScore += player.score;
    });

    // Trả lại thứ tự đội ban đầu (Đội 1, 2, 3...) trước khi render
    // Vì lệnh sort ở trên đã làm đảo lộn thứ tự mảng teams
    renderResults(teams, subs);
}
// RENDER RESULTS & STATS (Giữ nguyên)
function renderResults(teams, subs) {
    const container = document.getElementById('results');
    container.innerHTML = "";

    teams.forEach((team, i) => {
        container.innerHTML += `
            <div class="team-card">
                <div class="team-header">
                    <span>ĐỘI ${i + 1}</span>
                    <span class="team-score-badge">${team.totalScore} điểm</span>
                </div>
                <ul>
                    ${team.members.map(m => `
                        <li>
                            <span>${m.name}</span>
                            <span class="pot-text">H${m.pots}</span>
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
                    ${subs.map(m => `
                        <li>
                            <span>${m.name}</span>
                            <span class="pot-text">H${m.pots}</span>
                        </li>
                    `).join('')}
                </ul>
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