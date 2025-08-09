import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/MTLLoader.js';

// ====== DOM ======
const st = document.getElementById('st');
const msg = document.getElementById('msg');
const logBox = document.getElementById('log');
const phaseName = document.getElementById('phaseName');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const goalEl = document.getElementById('goal');
const goalTotalEl = document.getElementById('goalTotal');
const phaseList = document.getElementById('phaseList');
const phaseSelect = document.getElementById('phaseSelect');
const endDialog = document.getElementById('endDialog');
const endMsg = document.getElementById('endMsg');

// ====== Scene ======
const container = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 5000);
camera.position.set(6, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8); hemi.position.set(0, 1, 0); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(5, 10, 7); scene.add(dir);

const grid = new THREE.GridHelper(50, 50); grid.name = 'grid'; scene.add(grid);
const axes = new THREE.AxesHelper(2); axes.name = 'axes'; scene.add(axes);

// state
let currentRoot = null;
let wireframe = false;
let clipping = false;
const clippingPlanes = [];

// resize
addEventListener('resize', ()=>{
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// render loop
(function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

// ====== Utils ======
function log(t){ logBox.textContent += t + '\n'; logBox.scrollTop = logBox.scrollHeight; }
function setStatus(s,m=''){ st.textContent = s; msg.textContent = m; }
function clearModel(){
  if(currentRoot){
    scene.remove(currentRoot);
    currentRoot.traverse(o => {
      if(o.geometry) o.geometry.dispose();
      if(o.material){
        if(Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose();
      }
    });
    currentRoot = null;
  }
}
function fitToObject(obj){
  const box = new THREE.Box3().setFromObject(obj);
  if(!isFinite(box.min.x) || !isFinite(box.max.x)) return;
  const size = new THREE.Vector3(); const center = new THREE.Vector3(); box.getSize(size); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let dist = (maxDim/2) / Math.tan(fov/2); dist *= 1.6;
  const dirv = new THREE.Vector3(1,0.6,1).normalize();
  camera.position.copy(center.clone().add(dirv.multiplyScalar(dist)));
  camera.near = dist/100; camera.far = dist*100; camera.updateProjectionMatrix();
  controls.target.copy(center); controls.update();
}
function applyWireframe(root, enabled){
  root.traverse(o => { if(o.isMesh && o.material){ Array.isArray(o.material) ? o.material.forEach(m=>m.wireframe=enabled) : o.material.wireframe=enabled; } });
}
function isolateOnly(meshes){
  // hide all meshes except provided
  if(!currentRoot) return;
  currentRoot.traverse(o => { if(o.isMesh) o.visible = false; });
  meshes.forEach(m => m.visible = true);
}

// ====== Loaders & URL params ======
const qs = new URLSearchParams(location.search);
const objUrl = qs.get('obj');
const mtlUrl = qs.get('mtl');

async function loadObjFromUrl(objPath, mtlPath){
  try{
    setStatus('chargement…', objPath);
    clearModel();
    const objLoader = new OBJLoader();
    if(mtlPath){
      const mtl = await new MTLLoader().loadAsync(mtlPath);
      mtl.preload(); objLoader.setMaterials(mtl);
    }
    const root = await objLoader.loadAsync(objPath);
    afterLoad(root);
    setStatus('prêt', mtlPath ? 'OBJ+MTL chargés' : 'OBJ chargé');
  }catch(e){ console.error(e); setStatus('erreur','Échec (URL/CORS/chemin).'); }
}

if(objUrl){ loadObjFromUrl(objUrl, mtlUrl); } else { setStatus('prêt','Astuce: ?obj=modele.obj&mtl=modele.mtl'); }

// manual import
let selectedMTL = null;
document.getElementById('mtlFile').addEventListener('change', async e => { selectedMTL = e.target.files[0] || null; if(selectedMTL) setStatus('prêt','MTL sélectionné : ' + selectedMTL.name); });
document.getElementById('objFile').addEventListener('change', async e => {
  const file = e.target.files[0]; if(!file) return;
  try{
    setStatus('chargement…', file.name);
    clearModel();
    const objLoader = new OBJLoader();
    if(selectedMTL){
      const text = await selectedMTL.text();
      const mtlLoader = new MTLLoader();
      const creator = mtlLoader.parse(text, ''); creator.preload(); objLoader.setMaterials(creator);
    }
    const url = URL.createObjectURL(file);
    const root = await objLoader.loadAsync(url); URL.revokeObjectURL(url);
    afterLoad(root);
    setStatus('prêt', selectedMTL ? 'OBJ+MTL chargés (local)' : 'OBJ chargé (local)');
  }catch(e){ console.error(e); setStatus('erreur','Impossible de charger cet OBJ.'); }
});

function afterLoad(root){
  currentRoot = root; scene.add(root); applyWireframe(root, wireframe); fitToObject(root);
  // build pickable set
  buildPickTargets();
  // recompute regex mapping
  autoMapPhases();
  renderPhaseUI();
}

// ====== Picking ======
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let lastPicked = null;
container.addEventListener('click', (e)=>{
  // game click handled separately when running; here just update selection
  if(state.running) return;
  pickAtEvent(e, true);
});
container.addEventListener('dblclick', (e)=>{ pickAtEvent(e, true); });

function pickAtEvent(e, highlight=false){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const meshes = [];
  currentRoot && currentRoot.traverse(o => { if(o.isMesh) meshes.push(o); });
  const inter = raycaster.intersectObjects(meshes, true)[0];
  if(!inter) { setStatus('prêt',''); return null; }
  const m = inter.object;
  lastPicked = m;
  setStatus('prêt', `Sélection : ${meshLabel(m)}`);
  if(highlight) flashMesh(m);
  return m;
}

function meshLabel(m){
  const n = m.name || m.parent?.name || '(sans_nom)';
  return `${n} [${m.uuid.slice(0,8)}]`;
}

function flashMesh(m){
  const oldVis = m.visible;
  m.visible = true; // ensure visible
  const oldWire = Array.isArray(m.material) ? m.material[0].wireframe : m.material.wireframe;
  applyWireframe(m, true);
  setTimeout(()=>{ applyWireframe(m, wireframe); m.visible = oldVis; }, 300);
}

// ====== Clipping ======
document.getElementById('clip').addEventListener('click', ()=>{
  clipping = true;
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // horizontal
  clippingPlanes.push(plane);
  renderer.clippingPlanes = clippingPlanes;
  renderer.localClippingEnabled = true;
  setStatus('prêt','Plan de coupe activé');
});
document.getElementById('clipClear').addEventListener('click', ()=>{
  clipping = false;
  clippingPlanes.length = 0;
  renderer.clippingPlanes = [];
  setStatus('prêt','Coupes retirées');
});

// ====== Wireframe & camera ======
document.getElementById('wire').addEventListener('click', ()=>{ wireframe = !wireframe; if(currentRoot) applyWireframe(currentRoot, wireframe); setStatus('prêt', wireframe?'Fil de fer ON':'Fil de fer OFF'); });
document.getElementById('fit').addEventListener('click', ()=>{ if(currentRoot) fitToObject(currentRoot); });
document.getElementById('showAll').addEventListener('click', ()=>{ if(!currentRoot) return; currentRoot.traverse(o=>{ if(o.isMesh) o.visible=true; }); });

// ====== Phases & Mapping ======
const PHASES = [
  { key:'terrassement', label:'Terrassement', regex: /(terrain|site|ground|earth|soil|topo)/i },
  { key:'fondations', label:'Fondations', regex: /(footing|foundation|semelle|longrine|socle|pied)/i },
  { key:'superstructure', label:'Superstructure', regex: /(wall|mur|beam|poutre|column|poteau|structure|frame)/i },
  { key:'planchers', label:'Planchers', regex: /(slab|floor|plancher|dalle)/i },
  { key:'menuiseries', label:'Menuiseries', regex: /(window|fenetre|door|porte|chassis|menuiserie)/i },
  { key:'toiture', label:'Toiture', regex: /(roof|toit|tuile|chevron|panne)/i }
];

const mapping = {}; // phaseKey -> Set of mesh.uuid
let meshIndex = []; // array of meshes

function buildPickTargets(){
  meshIndex = [];
  currentRoot && currentRoot.traverse(o => { if(o.isMesh) meshIndex.push(o); });
}

function autoMapPhases(){
  PHASES.forEach(p => mapping[p.key] = new Set());
  for(const m of meshIndex){
    const name = (m.name || m.parent?.name || '').toString();
    for(const p of PHASES){
      if(p.regex.test(name)){ mapping[p.key].add(m.uuid); break; }
    }
  }
}

function renderPhaseUI(){
  phaseList.innerHTML = '';
  phaseSelect.innerHTML = '';
  PHASES.forEach(p => {
    const count = (mapping[p.key]||new Set()).size;
    // row
    const row = document.createElement('div'); row.className = 'phaseRow';
    const label = document.createElement('div'); label.textContent = `${p.label} (${count})`; label.className='lbl';
    const btnIso = document.createElement('button'); btnIso.textContent = 'Isoler'; btnIso.className='btn';
    btnIso.onclick = ()=>{ showPhaseOnly(p.key); };
    const btnShow = document.createElement('button'); btnShow.textContent = 'Ajouter'; btnShow.className='btn';
    btnShow.onclick = ()=>{ showPhaseAdd(p.key); };
    phaseList.appendChild(label); phaseList.appendChild(btnIso); phaseList.appendChild(btnShow);
    // select
    const opt = document.createElement('option'); opt.value = p.key; opt.textContent = p.label;
    phaseSelect.appendChild(opt);
  });
}

function getMeshesOfPhase(key){
  const ids = mapping[key] ? Array.from(mapping[key]) : [];
  return ids.map(uuid => meshIndex.find(m => m.uuid === uuid)).filter(Boolean);
}

function showPhaseOnly(key){
  if(!currentRoot) return;
  currentRoot.traverse(o => { if(o.isMesh) o.visible = false; });
  getMeshesOfPhase(key).forEach(m => m.visible = true);
}

function showPhaseAdd(key){
  if(!currentRoot) return;
  getMeshesOfPhase(key).forEach(m => m.visible = true);
}

// Assign selection to phase
document.getElementById('assignSel').addEventListener('click', ()=>{
  if(!lastPicked){ setStatus('prêt','Sélectionnez d’abord un objet (clic).'); return; }
  const phase = phaseSelect.value;
  mapping[phase] = mapping[phase] || new Set();
  mapping[phase].add(lastPicked.uuid);
  renderPhaseUI();
  setStatus('prêt', `Assigné à ${phase}.`);
});
document.getElementById('clearSel').addEventListener('click', ()=>{ lastPicked = null; setStatus('prêt','Sélection nettoyée.'); });

// Export/Import mapping
document.getElementById('exportMap').addEventListener('click', ()=>{
  const data = {};
  for(const k of Object.keys(mapping)) data[k] = Array.from(mapping[k]||[]);
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mapping_phases.json'; a.click(); URL.revokeObjectURL(url);
});
document.getElementById('importMapFile').addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  const txt = await f.text();
  const data = JSON.parse(txt);
  for(const k of Object.keys(data)){ mapping[k] = new Set(data[k]); }
  renderPhaseUI(); setStatus('prêt','Mappage importé.');
});

// ====== Game logic ======
const GAME = {
  duration: 6*60,
  pointsCorrect: 10,
  pointsWrong: -5,
  targetsPerPhase: 5,
  order: ['terrassement','fondations','superstructure','planchers','menuiseries','toiture']
};

const state = {
  running:false, paused:false,
  timeLeft: GAME.duration, score:0,
  phaseIndex:0, goal:0, goalTotal:0,
  validated: new Set(),
  targetMeshes: [],
  history: []
};

function fmtTime(s){ const m = Math.floor(s/60).toString().padStart(2,'0'); const r = Math.floor(s%60).toString().padStart(2,'0'); return m+':'+r; }
function updateHud(){ timerEl.textContent = fmtTime(state.timeLeft); scoreEl.textContent = String(state.score); goalEl.textContent = String(state.goal); goalTotalEl.textContent = String(state.goalTotal); }

let timerHandle = null;
document.getElementById('start').addEventListener('click', startGame);
document.getElementById('pause').addEventListener('click', ()=>{ state.paused=true; document.getElementById('pause').disabled=true; document.getElementById('resume').disabled=false; setStatus('pause',''); });
document.getElementById('resume').addEventListener('click', ()=>{ state.paused=false; document.getElementById('pause').disabled=false; document.getElementById('resume').disabled=true; setStatus('prêt','Jeu en cours'); });
document.getElementById('reset').addEventListener('click', resetGame);
document.getElementById('exportCsv').addEventListener('click', exportCsv);

document.getElementById('endClose').addEventListener('click', ()=> endDialog.close());
document.getElementById('endExport').addEventListener('click', exportCsv);
document.getElementById('endReset').addEventListener('click', ()=>{ endDialog.close(); resetGame(); });

container.addEventListener('click', (e)=>{
  if(!state.running || state.paused) return;
  const m = pickAtEvent(e, false);
  if(!m) return;
  const isTarget = state.targetMeshes.includes(m);
  const already = state.validated.has(m.uuid);
  if(isTarget && !already){
    state.validated.add(m.uuid);
    state.score = Math.max(0, state.score + GAME.pointsCorrect);
    state.goal += 1; updateHud(); log(`✅ Correct (+${GAME.pointsCorrect}) – ${meshLabel(m)}`);
    flashMesh(m);
    if(state.goal >= state.goalTotal) nextPhase();
  } else {
    state.score = Math.max(0, state.score + GAME.pointsWrong);
    updateHud(); log(`❌ Incorrect (${GAME.pointsWrong})`);
  }
});

function enableGameButtons(v){
  document.getElementById('start').disabled = !v;
  document.getElementById('pause').disabled = true;
  document.getElementById('resume').disabled = true;
  document.getElementById('reset').disabled = true;
  document.getElementById('exportCsv').disabled = true;
}

function startGame(){
  if(!currentRoot){ setStatus('info','Chargez un OBJ d’abord.'); return; }
  state.running = true; state.paused=false; state.timeLeft=GAME.duration; state.score=0; state.phaseIndex=0; state.history=[]; logBox.textContent='';
  goToPhase(0);
  timerHandle = setInterval(()=>{ if(!state.paused){ state.timeLeft--; updateHud(); if(state.timeLeft<=0) finishGame('Temps écoulé ⏱️'); } }, 1000);
  document.getElementById('start').disabled = true; document.getElementById('pause').disabled = false; document.getElementById('reset').disabled = false; document.getElementById('exportCsv').disabled = false;
  setStatus('prêt','Jeu en cours. Cliquez les bons objets.');
}

function resetGame(){
  state.running=false; state.paused=false; clearInterval(timerHandle);
  state.score=0; state.goal=0; state.goalTotal=0; updateHud();
  state.validated.clear(); state.targetMeshes=[]; phaseName.textContent='—';
  currentRoot && currentRoot.traverse(o=>{ if(o.isMesh) o.visible = true; });
  document.getElementById('start').disabled=false; document.getElementById('pause').disabled=true; document.getElementById('resume').disabled=true; document.getElementById('reset').disabled=true;
  setStatus('prêt','Réinitialisé.');
}

function finishGame(reason){
  state.running=false; clearInterval(timerHandle);
  endMsg.textContent = `${reason} – Score final : ${state.score}`;
  endDialog.showModal();
  state.history.push({ t:Date.now(), event:'end', reason, score: state.score });
}

function nextPhase(){
  state.history.push({ t:Date.now(), event:'phase_complete', phase: GAME.order[state.phaseIndex], score: state.score, timeLeft: state.timeLeft });
  state.phaseIndex++;
  if(state.phaseIndex >= GAME.order.length){ finishGame('Toutes les phases complétées'); }
  else goToPhase(state.phaseIndex);
}

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

function goToPhase(idx){
  const key = GAME.order[idx];
  const ph = PHASES.find(p=>p.key===key);
  phaseName.textContent = ph.label;
  const meshes = getMeshesOfPhase(key);
  if(meshes.length === 0){
    log(`⚠️ Aucun mesh mappé sur « ${ph.label} ». Passage à la suivante…`);
    nextPhase(); return;
  }
  const targets = shuffle(meshes.slice()).slice(0, Math.min(GAME.targetsPerPhase, meshes.length));
  state.targetMeshes = targets; state.validated.clear(); state.goal=0; state.goalTotal = targets.length; updateHud();
  isolateOnly(meshes); // on montre la phase courante
  log(`Phase « ${ph.label} » – ${state.goalTotal} cible(s) à trouver.`);
  state.history.push({ t:Date.now(), event:'phase_start', phase:key, totalTargets: state.goalTotal });
}

// Export CSV
function exportCsv(){
  const rows = [['time','event','phase','score','timeLeft','details']];
  for(const h of state.history){ rows.push([ new Date(h.t).toISOString(), h.event||'', h.phase||'', h.score??'', h.timeLeft??'', h.reason||'' ]); }
  const csv = rows.map(r => r.map(x => String(x).replaceAll('"','""')).map(x => `"${x}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'resultats_obj_game.csv'; a.click(); URL.revokeObjectURL(url);
}

// init
updateHud();
enableGameButtons(true);
