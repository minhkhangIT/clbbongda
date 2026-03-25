// 1. Cấu hình Supabase
const SUPABASE_URL = 'https://vicrggfxuakpfxzhuktj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vm635kgShm0yeSPboZ5ZLA_OX4OPbN4'; 
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let playerToDeleteId = null;
let playerToEditId = null;
let currentSort = { column: null, direction: 'asc' };

document.addEventListener('DOMContentLoaded', () => {
    fetchPlayers();
});

// Cập nhật số hiển thị khi kéo slider
function updateScoreLabel(val) {
    // Thay vì parseFloat(val).toFixed(2), ta dùng:
    document.getElementById('scoreValue').innerText = +parseFloat(val).toFixed(2);
}
// Lấy danh sách từ Database
async function fetchPlayers() {
    const { data, error } = await supabaseClient.from('players').select('*');
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

// Hiển thị bảng cầu thủ
function renderTable() {
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = "";
    
    players.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.name}</td>
                <td>${+parseFloat(p.pots).toFixed(2)}</td>
                <td>
                    <input type="checkbox" ${p.available ? 'checked' : ''} 
                    onchange="toggleAvailable(${p.id}, ${p.available})">
                </td>
                <td><button class="btn-edit" onclick='openEditModal(${JSON.stringify(p)})'>Sửa</button></td>
                <td><button class="btn-delete" onclick="openDeleteModal(${p.id})">Xóa</button></td>
            </tr>`;
    });
}
// Thêm cầu thủ mới
// Hàm hiển thị thông báo
function showToast(message) {
    const toast = document.getElementById('notification');
    toast.innerText = message;
    
    // Reset animation bằng cách xóa và thêm lại class
    toast.classList.remove('show');
    void toast.offsetWidth; // Trigger reflow để restart animation
    toast.classList.add('show');
    
    // Ẩn element sau khi animation kết thúc (3 giây)
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}
// Cập nhật hàm addPlayer
async function addPlayer() {
    const nameInput = document.getElementById('playerName');
    const scoreInput = document.getElementById('playerScore');

    if (!nameInput.value.trim()) return alert("Vui lòng nhập tên");

    const { error } = await supabaseClient.from('players').insert([{ 
        name: nameInput.value.trim(), 
        pots: parseFloat(scoreInput.value), 
        available: false 
    }]);

    if (error) {
        alert("Lỗi: " + error.message);
    } else {
        // Hiện thông báo thành công
        showToast(`Đã thêm cầu thủ ${nameInput.value.trim()}!`);

        // Reset các ô nhập liệu
        nameInput.value = "";
        
        // Đặt lại slider về giá trị mặc định 2.5
        scoreInput.value = 2.5; 
        updateScoreLabel(2.5);
        
        fetchPlayers();
    }
}
// Sắp xếp bảng
function sortPlayers(column, maintainDirection = false) {
    const headers = document.querySelectorAll('th');
    
    if (!maintainDirection) {
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
    }

    headers.forEach(h => {
        // Reset tất cả các icon về mặc định
        h.classList.remove('sort-asc', 'sort-desc');
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.innerText = '↕';

        // Chỉ cập nhật header đang được chọn
        if (h.getAttribute('onclick')?.includes(`'${column}'`)) {
            h.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            const currentIcon = h.querySelector('.sort-icon');
            if (currentIcon) {
                currentIcon.innerText = currentSort.direction === 'asc' ? '▲' : '▼';
            }
        }
    });

    // ... phần logic sort bên dưới giữ nguyên ...
    players.sort((a, b) => {
        let vA = a[column], vB = b[column];
        if (column === 'pots') { vA = parseFloat(vA); vB = parseFloat(vB); }
        if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = vB.toLowerCase(); }
        return currentSort.direction === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });
    renderTable();
}

// Điểm danh
async function toggleAvailable(id, currentStatus) {
    await supabaseClient.from('players').update({ available: !currentStatus }).eq('id', id);
    fetchPlayers();
}

// THUẬT TOÁN CHIA ĐỘI
function divideTeams() {
    let pool = players.filter(p => p.available);
    if (pool.length < 10) return alert("Cần ít nhất 10 người để chia 2 đội");

    const numTeams = Math.floor(pool.length / 5);
    let bestResult = null;
    let minDiff = Infinity;

    // Define all pairs that should NOT be on the same team
    const forbiddenPairs = [
        ["Nhân AI", "Trí 1970"],
        ["Nhân AI", "Hùng Đặng"],
        ["Lộc", "Mẫn"]
    ];

    for (let i = 0; i < 500; i++) { // Increased iterations slightly for more constraints
        let currentTeams = Array.from({ length: numTeams }, () => ({ members: [], totalScore: 0 }));
        
        let shuffled = [...pool].sort(() => Math.random() - 0.5);
        let tempSubs = shuffled.splice(0, pool.length % 5);

        const goalies = shuffled.filter(p => p.name.toLowerCase().includes('gôn')).sort(() => Math.random() - 0.5);
        const fieldPlayers = shuffled.filter(p => !p.name.toLowerCase().includes('gôn')).sort(() => Math.random() - 0.5);

        // 1. Assign Goalies
        goalies.forEach((g, idx) => {
            let targetTeam = currentTeams[idx % numTeams];
            targetTeam.members.push(g);
            targetTeam.totalScore += parseFloat(g.pots);
        });

        // 2. Assign Field Players
        fieldPlayers.forEach(p => {
            let availableTeams = currentTeams.filter(t => t.members.length < 5);
            if (availableTeams.length === 0) availableTeams = currentTeams;

            availableTeams.sort((a, b) => a.totalScore - b.totalScore);
            availableTeams[0].members.push(p);
            availableTeams[0].totalScore += parseFloat(p.pots);
        });

        // 3. Check all constraints
        const scores = currentTeams.map(t => t.totalScore);
        const diff = Math.max(...scores) - Math.min(...scores);

        const hasConflict = currentTeams.some(team => {
            const names = team.members.map(m => m.name);
            // Returns true if ANY forbidden pair is found in the same team
            return forbiddenPairs.some(([p1, p2]) => names.includes(p1) && names.includes(p2));
        });

        // 4. Update best result if no conflicts exist
        if (!hasConflict && diff < minDiff) {
            minDiff = diff;
            bestResult = { teams: JSON.parse(JSON.stringify(currentTeams)), subs: tempSubs };
        }
        
        // Early break if it's very balanced and follows all rules
        if (minDiff < 0.25 && !hasConflict) break;
    }

    if (!bestResult) {
        return alert("Không tìm thấy phương án chia đội thỏa mãn các yêu cầu tách cặp. Hãy thử lại hoặc tăng số lần lặp!");
    }

    renderResults(bestResult.teams, bestResult.subs);
}

// HIỂN THỊ KẾT QUẢ
function renderResults(teams, subs) {
    const container = document.getElementById('results');
    container.innerHTML = "";

    teams.forEach((team, i) => {
        container.innerHTML += `
            <div class="team-card">
                <div class="team-header">
                    <span class="team-title">ĐỘI ${i + 1}</span>
                    <span class="team-score-badge">${+team.totalScore.toFixed(2)} điểm</span>
                </div>
                <ul class="team-list">
                    ${team.members.map(m => {
                        const isGoalie = m.name.toLowerCase().includes('gôn');
                        return `
                            <li>
                                <span class="player-name ${isGoalie ? 'is-goalie' : ''}">
                                    ${isGoalie ? '🧤' : '👟'} ${m.name}
                                </span>
                                <span class="player-score"><i>${+parseFloat(m.pots).toFixed(2)}</i></span>
                            </li>`;
                    }).join('')}
                </ul>
            </div>`;
    });

    if (subs.length > 0) {
        container.innerHTML += `
            <div class="team-card sub-card">
                <div class="team-header"><span class="team-title">DỰ BỊ</span></div>
                <ul class="team-list">
                    ${subs.map(s => `<li><span class="player-name">🪑 ${s.name}</span><span class="player-score"><i>${parseFloat(s.pots).toFixed(1)}</i></span></li>`).join('')}
                </ul>
            </div>`;
    }
    container.scrollIntoView({ behavior: 'smooth' });
}

// TIỆN ÍCH
function filterTable() {
    // Lấy từ khóa, chuyển về chữ thường và loại bỏ dấu
    const term = removeVietnameseTones(document.getElementById('searchInput').value.toLowerCase());
    
    document.querySelectorAll('#playerTableBody tr').forEach(row => {
        // Lấy tên cầu thủ ở cột đầu tiên (cells[0])
        const playerName = row.cells[0].innerText;
        
        // Chuyển tên cầu thủ về chữ thường và loại bỏ dấu để so sánh
        const processedPlayerName = removeVietnameseTones(playerName.toLowerCase());
        
        // Hiển thị hàng nếu tên chứa từ khóa tìm kiếm
        row.style.display = processedPlayerName.includes(term) ? "" : "none";
    });
}

// Hàm bổ trợ để loại bỏ dấu tiếng Việt
function removeVietnameseTones(str) {
    return str
        .normalize('NFD') // Chuyển sang dạng tổ hợp phím (ví dụ: 'á' -> 'a' + '´')
        .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu vừa tách ra
        .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Xử lý riêng chữ đ/Đ
        .replace(/[^a-zA-Z0-9 ]/g, ''); // Loại bỏ các ký tự đặc biệt khác nếu cần
}

function updateStats() {
    document.getElementById('availablePlayers').innerText = players.filter(p => p.available).length;
}

// MODALS SỬA/XÓA
// Hàm cập nhật con số hiển thị trong Modal Sửa
function updateEditScoreLabel(val) {
    document.getElementById('editScoreValue').innerText = +parseFloat(val).toFixed(2);
}

// Sửa lại hàm openEditModal hiện có
function openEditModal(p) {
    playerToEditId = p.id;
    document.getElementById('editPlayerName').value = p.name;
    
    // Gán giá trị điểm hiện tại vào thanh kéo
    const currentScore = parseFloat(p.pots);
    document.getElementById('editPlayerScore').value = currentScore;
    
    // Cập nhật nhãn hiển thị con số
    updateEditScoreLabel(currentScore);
    
    document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }
// Hàm lưu thay đổi (confirmEditBtn.onclick)
document.getElementById('confirmEditBtn').onclick = async () => {
    const newName = document.getElementById('editPlayerName').value;
    const newScore = parseFloat(document.getElementById('editPlayerScore').value);
    
    if (!newName.trim()) return alert("Tên không được để trống");

    const { error } = await supabaseClient.from('players').update({ 
        name: newName, 
        pots: newScore 
    }).eq('id', playerToEditId);

    if (error) {
        alert("Cập nhật thất bại: " + error.message);
    } else {
        closeEditModal(); 
        fetchPlayers();
    }
};
function openDeleteModal(id) { playerToDeleteId = id; document.getElementById('deleteModal').style.display = 'flex'; }
function closeModal() { document.getElementById('deleteModal').style.display = 'none'; }
document.getElementById('confirmDeleteBtn').onclick = async () => {
    await supabaseClient.from('players').delete().eq('id', playerToDeleteId);
    closeModal(); fetchPlayers();
};

// Mở modal xác nhận
function uncheckAll() {
    document.getElementById('uncheckAllModal').style.display = 'flex';
}

// Đóng modal
function closeUncheckModal() {
    document.getElementById('uncheckAllModal').style.display = 'none';
}

// Xử lý khi bấm nút "Xóa sạch" trong modal
document.getElementById('confirmUncheckBtn').onclick = async () => {
    closeUncheckModal();
    showToast("Đang đặt lại danh sách...");

    const { error } = await supabaseClient
        .from('players')
        .update({ available: false })
        .eq('available', true); // Chỉ tác động lên những người đang check

    if (error) {
        alert("Lỗi: " + error.message);
    } else {
        showToast("Đã làm mới danh sách điểm danh!");
        fetchPlayers(); // Tải lại bảng và stats
    }
};