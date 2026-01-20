// 1. INITIALIZE SUPABASE
const SUPABASE_URL = 'https://vicrggfxuakpfxzhuktj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vm635kgShm0yeSPboZ5ZLA_OX4OPbN4'; // Use ONLY the actual key here
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let players = [];
let playerToDeleteId = null;

document.addEventListener('DOMContentLoaded', () => {
    displayDate();
    fetchPlayers();
    
    // Setup slider display listener
    const slider = document.getElementById('playerPoint');
    const pointVal = document.getElementById('pointVal');
    slider.oninput = function() {
        pointVal.innerText = this.value;
    }
});

// 2. FETCH DATA
async function fetchPlayers() {
    const { data, error } = await supabaseClient
        .from('players')
        .select('id, name, point')
        .order('point', { ascending: false });

    if (error) {
        console.error('Error fetching:', error);
    } else {
        players = data.map(p => ({
            ...p,
            available: false 
        }));
        renderTable();
        updateStats();
    }
}

// 3. ADD PLAYER
async function addPlayer() {
    const nameInput = document.getElementById('playerName');
    const pointInput = document.getElementById('playerPoint');

    if (nameInput.value.trim() === "") return alert("Please enter a name");

    const { error } = await supabaseClient
        .from('players')
        .insert([{ 
            name: nameInput.value.trim(), 
            point: parseInt(pointInput.value)
        }]);

    if (error) {
        alert("Error saving player: " + error.message);
    } else {
        nameInput.value = "";
        fetchPlayers(); 
    }
}

// 4. TOGGLE AVAILABILITY (Local only)
function toggleAvailable(id) {
    const player = players.find(p => p.id === id);
    if (player) {
        player.available = !player.available;
        updateStats();
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
            alert("Delete failed");
        } else {
            closeModal();
            fetchPlayers();
        }
    }
}

// UI RENDERING
function renderTable() {
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = "";
    
    players.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.name}</td>
                <td><strong>${p.point}</strong></td>
                <td>
                    <input type="checkbox" ${p.available ? 'checked' : ''} 
                    onchange="toggleAvailable(${p.id})">
                </td>
                <td><button class="btn-delete" onclick="openDeleteModal(${p.id})">Xóa</button></td>
            </tr>
        `;
    });
}

function updateStats() {
    document.getElementById('totalPlayers').innerText = players.length;
    document.getElementById('availablePlayers').innerText = players.filter(p => p.available).length;
}

function displayDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    document.getElementById('currentDate').innerText = `${day}/${month}/${year}`;
}

function openDeleteModal(id) {
    playerToDeleteId = id;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('deleteModal').style.display = 'none';
    playerToDeleteId = null;
}

function divideTeams() {
    // 1. Get all available players
    let pool = players.filter(p => p.available);
    if (pool.length < 5) return alert("Cần ít nhất 5 cầu thủ điểm danh");

    // 2. Determine how many people must be substitutes
    const numTeams = Math.floor(pool.length / 5);
    const numSubs = pool.length % 5;

    // 3. Shuffle the ENTIRE pool randomly first
    pool = pool.sort(() => Math.random() - 0.5);

    // 4. Pull the substitutes from the top of the SHUFFLED list
    // This ensures subs are chosen by luck, not by points
    const subPool = pool.slice(0, numSubs);
    const mainPool = pool.slice(numSubs);

    // 5. NOW sort the mainPool by points for the balancing algorithm
    // We sort descending (Highest -> Lowest)
    mainPool.sort((a, b) => b.point - a.point);

    let teams = Array.from({ length: numTeams }, () => ({ 
        members: [], 
        totalPoints: 0 
    }));

    // 6. Greedy Distribution: Give the strongest available player 
    // to the team that currently has the lowest total point score.
    mainPool.forEach(player => {
        const targetTeam = teams
            .filter(t => t.members.length < 5)
            .sort((a, b) => a.totalPoints - b.totalPoints)[0];
        
        targetTeam.members.push(player);
        targetTeam.totalPoints += player.point;
    });

    // 7. Final Sort for UI display
    teams.forEach(t => t.members.sort((a, b) => b.point - a.point));
    subPool.sort((a, b) => b.point - a.point);

    renderResults(teams, subPool);
}

function renderResults(teams, subs) {
    const container = document.getElementById('results');
    container.innerHTML = "";

    teams.forEach((team, i) => {
        container.innerHTML += `
            <div class="team-card">
                <div class="team-header"><span>ĐỘI ${i+1}</span><span>Chỉ số: ${team.totalPoints}</span></div>
                <ul>${team.members.map(m => `<li><span>${m.name}</span><span>${m.point}</span></li>`).join('')}</ul>
            </div>`;
    });

    if (subs.length > 0) {
        container.innerHTML += `
            <div class="team-card sub-card">
                <div class="team-header">DỰ BỊ</div>
                <ul>${subs.map(m => `<li><span>${m.name}</span><span>${m.point}</span></li>`).join('')}</ul>
            </div>`;
    }
}