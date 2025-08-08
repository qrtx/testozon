
// Apply Liquid Glass theme after DOM ready and after any dynamic render
(function(){
  function applyGlass(){
    // Animated light blobs (once)
    if (!document.querySelector('.liquid-blobs')){
      const d = document.createElement('div');
      d.className = 'liquid-blobs';
      d.innerHTML = '<div class="blob a"></div><div class="blob b"></div>';
      document.body.prepend(d);
    }
    // Mark main blocks as glass
    const core = ['header.topbar','.form-block','.rules-block','.contacts-block','.bank-block','#adminPanel','#salary-summary-container'];
    core.forEach(sel => document.querySelectorAll(sel).forEach(el => el.classList.add('glass')));
    // Controls as glass-ink
    document.querySelectorAll('select, input[type="text"], input[type="tel"], input[type="number"], button')
      .forEach(el => el.classList.add('glass-ink'));
    // Calendar cells that may be re-rendered
    document.querySelectorAll('#calendar .day, #calendar .calendar-day, #calendar .grid > div, .calendar .day, .calendar .grid > div')
      .forEach(el => el.classList.add('glass'));
    // Optional bottom tabbar (only if not present)
    if (!document.querySelector('.tabbar')){
      const nav = document.createElement('nav');
      nav.className = 'tabbar';
      nav.innerHTML = '<div class=\"wrap\"><button data-target=\".form-block\">Отметка</button><button data-target=\"#calendar\">Календарь</button><button data-target=\".bank-block\">Реквизиты</button><button data-target=\".rules-block\">Правила</button><button data-target=\".contacts-block\">Контакты</button></div>';
      document.body.appendChild(nav);
      nav.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-target]'); if(!btn) return;
        nav.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const el = document.querySelector(btn.getAttribute('data-target'));
        if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
      }, {passive:true});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyGlass);
  else applyGlass();

  // expose hook for your scripts after data updates
  window.applyGlassTheme = applyGlass;
})();
