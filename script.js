/**
 * Returns the current date in Moscow timezone.
 */
function getMoscowDate() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
}

/**
 * Determines pay period (11–25 or 26–10).
 * Returns { start: Date, end: Date, label: string }.
 */
function getPayPeriod() {
  const date = getMoscowDate();
  const d = date.getDate(), m = date.getMonth(), y = date.getFullYear();
  let start, end, label;
  if (d >= 11 && d <= 25) {
    start = new Date(y, m, 11);
    end   = new Date(y, m, 25);
    label = '11–25';
  } else if (d >= 26) {
    start = new Date(y, m, 26);
    const nm = m === 11 ? 0 : m + 1;
    const ny = m === 11 ? y + 1 : y;
    end   = new Date(ny, nm, 10);
    label = '26–10';
  } else {
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    start = new Date(py, pm, 26);
    end   = new Date(y, m, 10);
    label = '26–10';
  }
  return { start, end, label };
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Global state
let allData = {};
let employees = [];
let points = {};
let currentYear = getMoscowDate().getFullYear();
let currentMonth = getMoscowDate().getMonth();
let isAdmin = false;

/**
 * Mark a shift: save to Firebase with Moscow date.
 */
function markShift() {
  const employee = document.getElementById('employee').value;
  const point = document.getElementById('point').value;
  const mskDate = getMoscowDate();
  const date = mskDate.getFullYear() + '-' +
    String(mskDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(mskDate.getDate()).padStart(2, '0');
  db.ref('shifts').push({ date, employee, point });
}

/**
 * Change current month offset and re-render calendar.
 */
function changeMonth(offset) {
  currentMonth += offset;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

/**
 * Remove a shift entry (admin only).
 */
function removeEntry(id) {
  if (!isAdmin) {
    alert('Удаление смен доступно только администратору.');
    return;
  }
  if (confirm('Удалить эту смену?')) {
    db.ref('shifts/' + id).remove();
  }
}

/**
 * Render the calendar grid.
 */
function renderCalendar() {
  const container = document.getElementById('calendar');
  const now = getMoscowDate();
  const isToday = (y, m, d) => y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
  const year = currentYear;
  const month = currentMonth;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();

  let html = "<div style='margin-bottom:10px; display:flex; justify-content:space-between; align-items:center'>" +
    "<button onclick='changeMonth(-1)'>&lt; Назад</button>" +
    `<strong>${first.toLocaleString('ru-RU', { month: 'long' })} ${year}</strong>` +
    "<button onclick='changeMonth(1)'>Вперёд &gt;</button></div>";

  html += "<div class='grid'><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>";

  const weekDay = first.getDay() || 7;
  html += '<div></div>'.repeat(weekDay - 1);

  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shifts = Object.entries(allData).filter(([id, x]) => x.date === dayKey);
    const todayClass = isToday(year, month, d) ? 'today' : '';
    let inner = `<strong>${d}</strong><br>` +
      shifts.map(([id, x]) =>
        `${x.employee} — ${x.point} (${points[x.point] || 0}₽)` +
        (isAdmin ? ` <span class='remove-btn' onclick='removeEntry("${id}")'>×</span>` : '')
      ).join('<br>');

    html += `<div class='day-cell ${todayClass}'>${inner}</div>`;
  }

  html += '</div>';
  container.innerHTML = html;
  renderSummary();
}

/**
 * Render salary summary for current pay period.
 */
function renderSummary() {
  const container = document.getElementById('salary-summary-container');
  if (!container) return;

  const { start, end, label } = getPayPeriod();
  const totals = {};
  const counts = {};

  Object.values(allData).forEach(shift => {
    const [Y, M, D] = shift.date.split('-').map(Number);
    const dateObj = new Date(Y, M - 1, D);
    if (dateObj >= start && dateObj <= end) {
      const name = shift.employee;
      const pay = points[shift.point] || 0;
      totals[name] = (totals[name] || 0) + pay;
      counts[name] = (counts[name] || 0) + 1;
    }
  });

  let html = `<h3>💰 Расчёт зарплат за период ${label}:</h3>` +
    `<div class="salary-list">`;

  Object.keys(totals).forEach(name => {
    html += `
      <div class="salary-item">
        <strong>${name}</strong><br>
        ${label}: ${totals[name].toLocaleString('ru-RU')}₽ (${counts[name]} смен/а)
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// Live data listeners
db.ref('shifts').on('value', snap => {
  allData = snap.val() || {};
  renderCalendar();
});
db.ref('points').on('value', snap => {
  points = snap.val() || {};
  renderCalendar();
});

/**
 * Load employees and points into admin forms.
 */
function loadEmployeesAndPoints() {
  db.ref('employees').on('value', snap => {
    employees = [];
    const selEmp = document.getElementById('employee');
    const delEmp = document.getElementById('deleteEmp');
    if (selEmp && delEmp) {
      selEmp.innerHTML = '';
      delEmp.innerHTML = '';
      snap.forEach(child => {
        employees.push(child.val());
        selEmp.innerHTML += `<option>${child.val()}</option>`;
        delEmp.innerHTML += `<option>${child.val()}</option>`;
      });
    }
  });
  db.ref('points').on('value', snap => {
    points = snap.val() || {};
    const selPoint = document.getElementById('point');
    const delPoint = document.getElementById('deletePoint');
    if (selPoint && delPoint) {
      selPoint.innerHTML = '';
      delPoint.innerHTML = '';
      for (const name in points) {
        selPoint.innerHTML += `<option value="${name}">${name} (${points[name]}₽)</option>`;
        delPoint.innerHTML += `<option value="${name}">${name}</option>`;
      }
    }
  });
}

/**
/**
 * Admin login/logout.
 */
function toggleAdminLogin() {
  const login = prompt('Введите логин:');
  const pass  = prompt('Введите пароль:');

  if (login === 'qwertyxyry' && pass === 'Qrtx5237') {
    // Открываем панель администратора
    isAdmin = true;
    localStorage.setItem('ozon_is_admin', 'true');
    document.getElementById('adminPanel').style.display = 'block';
    loadEmployeesAndPoints();
  }
  else if (login === 'game' && pass === 'game') {

    window.location.href = '/game.html';
  }
      else if (login === 'doom' && pass === 'pc') {

    window.location.href = '/doom.html';
  }
    else if (login === 'mario' && pass === 'game') {

    window.location.href = '/mario.html';
  }
    else if (login === 'mc' && pass === 'pc') {

    window.location.href = '/Minecraft.html';
  }
    else if (login === 'tower' && pass === 'game') {

    window.location.href = '/tower.html';
  }
  else {
    // Во всех прочих случаях — ошибка
    alert('Неверный логин или пароль');
  }
}

function checkAdmin() {
  isAdmin = localStorage.getItem('ozon_is_admin') === 'true';
  if (isAdmin && document.getElementById('adminPanel')) {
    document.getElementById('adminPanel').style.display = 'block';
    loadEmployeesAndPoints();
  }
}

function adminLogout() {
  isAdmin = false;
  localStorage.removeItem('ozon_is_admin');
  alert('Вы вышли из учётки администратора.');
  location.reload();
}


// Employee management
function addEmployee() {
  const name = document.getElementById('newEmp').value.trim();
  if (name) db.ref('employees').push(name);
}
function deleteEmployee() {
  const name = document.getElementById('deleteEmp').value;
  db.ref('employees').once('value', snap => {
    snap.forEach(child => {
      if (child.val() === name) db.ref('employees/' + child.key).remove();
    });
  });
}

// Point management
function addPoint() {
  const name = document.getElementById('newPoint').value.trim();
  const rate = parseInt(document.getElementById('newRate').value.trim());
  if (name && rate) db.ref('points/' + name).set(rate);
}
function deletePoint() {
  const name = document.getElementById('deletePoint').value;
  db.ref('points/' + name).remove();
}

// Bank info
function submitBankInfo() {
  const employee = document.getElementById('bankEmployee').value;
  const phone = document.getElementById('bankPhone').value.trim();
  const bank = document.getElementById('bankName').value.trim();
  if (!phone || !bank) return alert('Заполните оба поля');
  db.ref('bank').push(`${employee}: ${phone} - ${bank}`);
  document.getElementById('bankPhone').value = '';
  document.getElementById('bankName').value = '';
}
function removeBankEntry(id) {
  db.ref('bank/' + id).remove();
}
function loadBankList() {
  db.ref('bank').on('value', snap => {
    const ul = document.getElementById('bankList');
    if (!ul) return;
    ul.innerHTML = '';
    snap.forEach(child => {
  const li = document.createElement('li');
  const v = child.val();
  let text = "";

  if (typeof v === "string") {
    // Старый формат — строка уже содержит имя
    text = v;
  } else if (typeof v === "object" && v !== null) {
    // Новый формат — имя берём из ключа
    text = `${child.key}: ${v.phone || "—"} - ${v.bank || "—"}`;
  } else {
    text = "неизвестный формат";
  }

  li.innerHTML = `${text} <span class="bank-remove" onclick="removeBankEntry('${child.key}')">×</span>`;
  ul.appendChild(li);
});

  });
}
function updateBankEmployeeDropdown() {
  db.ref('employees').once('value', snap => {
    const sel = document.getElementById('bankEmployee');
    if (!sel) return;
    sel.innerHTML = '';
    snap.forEach(child => {
      sel.innerHTML += `<option>${child.val()}</option>`;
    });
  });
}

// Data refresh
function refreshData() {
  db.ref('points').once('value', snap => {
    points = snap.val() || {};
    renderCalendar();
  });
  db.ref('shifts').once('value', snap => {
    allData = snap.val() || {};
    renderCalendar();
  });
  db.ref('employees').once('value', snap => {
    const sel = document.getElementById('employee');
    if (sel) {
      sel.innerHTML = '';
      snap.forEach(child => {
        sel.innerHTML += `<option>${child.val()}</option>`;
      });
    }
  });
  alert('Данные успешно обновлены!');
}

// Initial setup
loadEmployeesAndPoints();
checkAdmin();
loadBankList();
updateBankEmployeeDropdown();
window.onload = () => renderCalendar();

// Auto adjust month display after initial load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    changeMonth(-1);
    setTimeout(() => changeMonth(1), 200);
  }, 1600);
});



document.addEventListener('DOMContentLoaded', () => {
  const interBubble = document.querySelector('.interactive');
  let curX = 0;
  let curY = 0;
  let tgX = 0;
  let tgY = 0;

  function move() {
    curX += (tgX - curX) / 20;
    curY += (tgY - curY) / 20;
    interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
    requestAnimationFrame(move);
  }

  window.addEventListener('mousemove', (event) => {
    tgX = event.clientX;
    tgY = event.clientY;
  });

  move();
});
