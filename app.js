// ---------- Datos iniciales ----------
const DEFAULT_ITEMS = [
  { id: 'cap_go', nombre: 'Gorro verde', parte: 'cabeza', color: '#2a9d8f', estilos_usuario: ['casual','urbano'] },
  { id: 'hat_be', nombre: 'Sombrero beige', parte: 'cabeza', color: '#d9cbb3', estilos_usuario: ['formal','minimalista'] },

  { id: 'tee_wh', nombre: 'Camiseta blanca', parte: 'torso_base', color: '#f2f2f2', estilos_usuario: ['casual','urbano','minimalista'] },
  { id: 'tee_bl', nombre: 'Camiseta negra', parte: 'torso_base', color: '#222222', estilos_usuario: ['urbano','minimalista'] },
  { id: 'shirt_na', nombre: 'Camisa azul marino', parte: 'torso_base', color: '#1d3557', estilos_usuario: ['formal','casual'] },

  { id: 'jack_ol', nombre: 'Chaqueta oliva', parte: 'torso_layer', color: '#6b8f71', estilos_usuario: ['casual','urbano'] },
  { id: 'blaz_na', nombre: 'Blazer azul marino', parte: 'torso_layer', color: '#1d3557', estilos_usuario: ['formal'] },
  { id: 'hood_gr', nombre: 'Polerón gris', parte: 'torso_layer', color: '#b9c1cc', estilos_usuario: ['casual','urbano','minimalista'] },

  { id: 'pants_be', nombre: 'Pantalón beige', parte: 'inferior', color: '#e8d8b9', estilos_usuario: ['casual','formal','minimalista'] },
  { id: 'jean_ind', nombre: 'Jeans índigo', parte: 'inferior', color: '#274060', estilos_usuario: ['casual','urbano'] },
  { id: 'short_ol', nombre: 'Short oliva', parte: 'inferior', color: '#6b8f71', estilos_usuario: ['deportivo','casual'] },

  { id: 'snea_wh', nombre: 'Zapatillas blancas', parte: 'pies', color: '#f2f2f2', estilos_usuario: ['casual','urbano','minimalista'] },
  { id: 'shoe_br', nombre: 'Zapatos café', parte: 'pies', color: '#6a4a3c', estilos_usuario: ['formal'] },
  { id: 'run_bl', nombre: 'Zapatillas negras', parte: 'pies', color: '#222222', estilos_usuario: ['deportivo','urbano','minimalista'] },
];

const STORAGE_KEYS = {
  ITEMS: 'outfit_items_v1',
  OUTFITS: 'outfit_saves_v1'
};

const parts = ['cabeza','torso_base','torso_layer','inferior','pies'];
let items = loadItems();
let outfits = loadOutfits();

// Estado: índice seleccionado por parte
let selected = {
  cabeza: 0,
  torso_base: 0,
  torso_layer: 0,
  inferior: 0,
  pies: 0,
};

// ---------- Utilidades de color ----------
function hexToRgb(hex){
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return res ? {
    r: parseInt(res[1], 16),
    g: parseInt(res[2], 16),
    b: parseInt(res[3], 16)
  } : {r:0,g:0,b:0};
}
function rgbToHex(r,g,b){
  return '#' + [r,g,b].map(v => {
    const h = v.toString(16).padStart(2,'0');
    return h;
  }).join('');
}
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if(max===min){ h = s = 0; }
  else {
    const d = max - min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g < b ? 6 : 0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h /= 6;
  }
  return {h: h*360, s, l};
}
function hslToRgb(h, s, l){
  h/=360;
  let r, g, b;
  if(s===0){ r=g=b=l; }
  else {
    const hue2rgb = (p, q, t) => {
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p + (q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p + (q-p)*(2/3 - t)*6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l*s;
    const p = 2*l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255)};
}
function adjustHue(hex, delta){
  const {r,g,b} = hexToRgb(hex);
  const hsl = rgbToHsl(r,g,b);
  let h = (hsl.h + delta) % 360;
  if(h<0) h+=360;
  const {r:rr,g:gg,b:bb} = hslToRgb(h, hsl.s, hsl.l);
  return rgbToHex(rr,gg,bb);
}
function distanceHsl(hex1, hex2){
  const a = rgbToHsl(...Object.values(hexToRgb(hex1)));
  const b = rgbToHsl(...Object.values(hexToRgb(hex2)));
  // distancia simple ponderada en H, S, L
  const dh = Math.min(Math.abs(a.h-b.h), 360-Math.abs(a.h-b.h))/180; // normalizada
  const ds = Math.abs(a.s-b.s);
  const dl = Math.abs(a.l-b.l);
  return dh*0.6 + ds*0.25 + dl*0.15;
}

// ---------- Items persistencia ----------
function loadItems(){
  const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
  if(!raw){
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(DEFAULT_ITEMS));
    return [...DEFAULT_ITEMS];
  }
  try {
    const data = JSON.parse(raw);
    // merge si faltan por primera vez (evitar vacíos)
    if(!Array.isArray(data) || data.length === 0){
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(DEFAULT_ITEMS));
      return [...DEFAULT_ITEMS];
    }
    return data;
  } catch(e){
    console.warn('Items corruptos, reseteando.', e);
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(DEFAULT_ITEMS));
    return [...DEFAULT_ITEMS];
  }
}
function saveItems(){ localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items)); }

// ---------- Outfits persistencia ----------
function loadOutfits(){
  const raw = localStorage.getItem(STORAGE_KEYS.OUTFITS);
  if(!raw) return [];
  try { return JSON.parse(raw) || []; } catch{ return []; }
}
function saveOutfits(){ localStorage.setItem(STORAGE_KEYS.OUTFITS, JSON.stringify(outfits)); }

// ---------- Helpers de vista ----------
function itemsByPart(part){
  return items.filter(it => it.parte === part);
}

function clampIdx(part, idx){
  const arr = itemsByPart(part);
  if(arr.length === 0) return -1;
  return ((idx % arr.length) + arr.length) % arr.length;
}

function currentItem(part){
  const arr = itemsByPart(part);
  if(arr.length === 0) return null;
  const idx = clampIdx(part, selected[part] || 0);
  return arr[idx];
}

function setSelected(part, dir){
  const arr = itemsByPart(part);
  if(arr.length === 0){ selected[part] = -1; return; }
  const idx = clampIdx(part, (selected[part] || 0) + dir);
  selected[part] = idx;
  render();
}

function pill(text){ const span = document.createElement('span'); span.className='pill'; span.textContent = text; return span; }

function renderCanvas(){
  const head = currentItem('cabeza');
  const base = currentItem('torso_base');
  const layer = currentItem('torso_layer');
  const lower = currentItem('inferior');
  const feet = currentItem('pies');

  const setCol = (elId, item) => {
    const el = document.getElementById(elId);
    if(!el) return;
    if(item){
      el.style.background = item.color;
      el.style.borderColor = '#ffffff40';
      el.title = item.nombre;
      el.style.visibility = 'visible';
    } else {
      el.style.visibility = 'hidden';
    }
  };

  setCol('head_shape', head);
  setCol('torso_base_shape', base);
  setCol('torso_layer_shape', layer);
  setCol('lower_shape', lower);
  setCol('feet_shape', feet);

  const labels = document.getElementById('canvasLabels');
  labels.innerHTML = '';
  [['Cabeza',head],['Torso base',base],['Torso capa',layer],['Inferior',lower],['Pies',feet]].forEach(([k, it])=>{
    labels.appendChild(pill(`${k}: ${it?it.nombre:'—'}`));
  });
}

function renderSelectors(){
  for(const part of parts){
    const val = document.getElementById('val_'+part.replace('torso_','torso_'));
    const it = currentItem(part);
    if(val) val.textContent = it ? it.nombre : '—';
  }
}

function selectedStyles(){
  return Array.from(document.querySelectorAll('#styleFilters input:checked')).map(i=>i.value);
}

function isStyleCompatible(item, filters){
  if(filters.length===0) return true;
  return item.estilos_usuario?.some(s=>filters.includes(s));
}

// Sugerencias de color basadas en la prenda "base" (priorizamos torso_base)
function renderSuggestions(){
  const base = currentItem('torso_base') || currentItem('torso_layer') || currentItem('inferior') || currentItem('cabeza');
  const filters = selectedStyles();

  const chipWrap = document.getElementById('colorChips');
  const sugWrap  = document.getElementById('suggestedItems');
  chipWrap.innerHTML = '';
  sugWrap.innerHTML = '';

  if(!base){
    sugWrap.innerHTML = '<p class="hint">Selecciona al menos una prenda para ver sugerencias.</p>';
    return;
  }

  // paletas: complementario, análogos, tríada
  const complement = adjustHue(base.color, 180);
  const analogL = adjustHue(base.color, -30);
  const analogR = adjustHue(base.color, 30);
  const triadL = adjustHue(base.color, -120);
  const triadR = adjustHue(base.color, 120);

  const palette = [base.color, complement, analogL, analogR, triadL, triadR];
  palette.forEach(c => {
    const span = document.createElement('span');
    span.className = 'color-chip';
    span.style.background = c;
    span.title = c;
    chipWrap.appendChild(span);
  });

  // buscar items compatibles por color y estilo en otras partes
  const targets = {
    cabeza: itemsByPart('cabeza'),
    'torso_layer': itemsByPart('torso_layer'),
    inferior: itemsByPart('inferior'),
    pies: itemsByPart('pies')
  };

  // Excluir la parte ya seleccionada como base
  const basePart = base.parte;
  if(targets[basePart]) delete targets[basePart];

  const threshold = 0.22; // umbral de cercanía de color (0=igual, mayor = más permisivo)
  const neutrals = ['#ffffff','#f2f2f2','#eeeeee','#cccccc','#999999','#666666','#333333','#000000','#e8d8b9','#d9cbb3'];

  const group = document.createElement('div');

  Object.entries(targets).forEach(([part, list])=>{
    // filtrar por estilo
    const listF = list.filter(it => isStyleCompatible(it, filters));

    // ordenar por proximidad a la paleta (permitir neutrales siempre)
    const scored = listF.map(it => {
      let best = Infinity;
      for(const c of palette){
        const d = distanceHsl(it.color, c);
        if(d < best) best = d;
      }
      const isNeutral = neutrals.some(n => distanceHsl(it.color, n) < 0.08);
      return {it, score: isNeutral ? 0.05 : best};
    }).sort((a,b)=>a.score-b.score);

    const picks = scored.filter(s=>s.score <= threshold).slice(0,4);
    const sec = document.createElement('div');
    sec.className='sug-section';
    const title = document.createElement('h3');
    title.textContent = 'Para ' + humanPart(part);
    sec.appendChild(title);

    if(picks.length===0){
      const p = document.createElement('p');
      p.className='hint';
      p.textContent = 'Sin coincidencias fuertes. Prueba cambiando estilos o color base.';
      sec.appendChild(p);
    } else {
      const ul = document.createElement('ul'); ul.className='list';
      picks.forEach(p => {
        const li = document.createElement('li');
        const left = document.createElement('div');
        left.style.display='flex'; left.style.alignItems='center'; left.style.gap='10px';
        const sw = document.createElement('span');
        sw.className='color-chip'; sw.style.background=p.it.color;
        const name = document.createElement('span');
        name.textContent = p.it.nombre + ' • ' + p.it.estilos_usuario.join(', ');
        left.appendChild(sw); left.appendChild(name);
        const btn = document.createElement('button');
        btn.textContent = 'Usar';
        btn.addEventListener('click', ()=> selectItemDirect(part, p.it.id));
        li.appendChild(left); li.appendChild(btn);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
    }
    group.appendChild(sec);
  });

  sugWrap.appendChild(group);
}

function humanPart(part){
  switch(part){
    case 'cabeza': return 'Cabeza';
    case 'torso_base': return 'Torso (base)';
    case 'torso_layer': return 'Torso (capa)';
    case 'inferior': return 'Parte inferior';
    case 'pies': return 'Pies';
    default: return part;
  }
}

function selectItemDirect(part, id){
  const arr = itemsByPart(part);
  const idx = arr.findIndex(x => x.id === id);
  if(idx !== -1){
    selected[part] = idx;
    render();
  }
}

// ---------- Render maestro ----------
function render(){
  renderCanvas();
  renderSelectors();
  renderSuggestions();
  renderOutfitsList();
}

// ---------- Eventos UI ----------
function setupSelectors(){
  document.querySelectorAll('.selector-row').forEach(row => {
    const part = row.getAttribute('data-part');
    row.querySelector('.prev').addEventListener('click', ()=> setSelected(part, -1));
    row.querySelector('.next').addEventListener('click', ()=> setSelected(part, +1));
  });
  document.querySelectorAll('#styleFilters input').forEach(chk => {
    chk.addEventListener('change', renderSuggestions);
  });
}

function setupAddModal(){
  const dlg = document.getElementById('addModal');
  document.getElementById('openAddBtn').addEventListener('click', ()=> dlg.showModal());
  document.getElementById('confirmAdd').addEventListener('click', (e)=>{
    // Dejar que <form method="dialog"> cierre el modal luego de agregar
  });
  document.getElementById('addForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('addName').value.trim();
    const part = document.getElementById('addPart').value;
    const color = document.getElementById('addColor').value;
    const estilos = Array.from(document.querySelectorAll('#addForm input[type="checkbox"]:checked')).map(x=>x.value);
    if(!name){ return; }

    const newItem = {
      id: 'user_'+Date.now(),
      nombre: name,
      parte: part,
      color: color,
      estilos_usuario: estilos
    };
    items.push(newItem);
    saveItems();

    // Reset form y cerrar
    document.getElementById('addForm').reset();
    document.getElementById('addModal').close();

    // Si es la primera prenda de esa parte, seleccionarla
    if(itemsByPart(part).length === 1) selected[part] = 0;
    render();
  });
}

function renderOutfitsList(){
  const ul = document.getElementById('outfitsList');
  ul.innerHTML = '';
  if(outfits.length === 0){
    const li = document.createElement('li');
    li.innerHTML = '<span class="hint">Aún no guardas outfits.</span>';
    ul.appendChild(li);
    return;
  }
  outfits.forEach((o, idx)=>{
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = o.nombre;
    const actions = document.createElement('div');
    actions.style.display='flex'; actions.style.gap='6px';
    const loadBtn = document.createElement('button'); loadBtn.textContent = 'Cargar';
    loadBtn.addEventListener('click', ()=>{
      // mapear ids a índices actuales
      for(const p of parts){
        const arr = itemsByPart(p);
        const i = arr.findIndex(x=>x.id === o[p]);
        if(i !== -1) selected[p] = i;
      }
      render();
    });
    const delBtn = document.createElement('button'); delBtn.textContent = 'Borrar';
    delBtn.addEventListener('click', ()=>{
      outfits.splice(idx,1); saveOutfits(); renderOutfitsList();
    });
    actions.appendChild(loadBtn); actions.appendChild(delBtn);
    li.appendChild(name); li.appendChild(actions);
    ul.appendChild(li);
  });
}

function setupSaveOutfit(){
  document.getElementById('saveOutfitBtn').addEventListener('click', ()=>{
    const outfit = {};
    for(const p of parts){
      const it = currentItem(p);
      outfit[p] = it ? it.id : null;
    }
    const nombre = prompt('Nombre para este outfit:');
    if(!nombre) return;
    outfit.nombre = nombre;
    outfits.push(outfit);
    saveOutfits();
    renderOutfitsList();
  });
}

// ---------- Inicio ----------
setupSelectors();
setupAddModal();
setupSaveOutfit();

// Asegurar selección válida si no hay items en alguna parte
for(const p of parts){
  if(itemsByPart(p).length === 0) selected[p] = -1;
}

render();
