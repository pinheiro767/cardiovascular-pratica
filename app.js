const APP_KEY = 'cardioroteiro_v2';
const categories = ['Coração','Artérias','Veias','Capilares','Valvas','Circulação pulmonar','Circulação sistêmica'];
const questions = [
  'Quais estruturas identificam a orientação anatômica externa do coração?',
  'Como diferenciar átrios e ventrículos em uma peça anatômica?',
  'Qual é a relação funcional entre músculos papilares, cordas tendíneas e valvas atrioventriculares?',
  'Como o sangue percorre a circulação pulmonar?',
  'Como o sangue percorre a circulação sistêmica?',
  'Qual aplicação clínica pode ser relacionada à estrutura observada?'
];
const items = [
  ['Coração externo','Base'],['Coração externo','Ápice'],['Coração externo','Face esternocostal'],['Coração externo','Face pulmonar'],['Coração externo','Face diafragmática'],
  ['Câmaras cardíacas','Átrio direito e esquerdo'],['Câmaras cardíacas','Ventrículo direito e esquerdo'],['Câmaras cardíacas','Músculos pectíneos'],['Câmaras cardíacas','Fossa oval'],['Câmaras cardíacas','Septo interventricular'],['Câmaras cardíacas','Septo interatrial'],
  ['Valvas','Músculos papilares'],['Valvas','Cordas tendíneas'],['Valvas','Valva atrioventricular direita — tricúspide'],['Valvas','Valva atrioventricular esquerda — bicúspide/mitral'],['Valvas','Valva da aorta'],['Valvas','Valva do tronco pulmonar'],
  ['Vasos da base','Aorta'],['Vasos da base','Tronco pulmonar'],['Vasos da base','Veia cava superior'],['Vasos da base','Veia cava inferior'],['Vasos da base','Artéria pulmonar direita e esquerda'],['Vasos da base','Veias pulmonares'],
  ['Camadas do coração','Endocárdio'],['Camadas do coração','Miocárdio'],['Camadas do coração','Epicárdio'],
  ['Suprimento sanguíneo do coração','Artéria coronária direita'],['Suprimento sanguíneo do coração','Artéria coronária esquerda'],
  ['Artérias do corpo humano','Artéria subclávia'],['Artérias do corpo humano','Artéria axilar'],['Artérias do corpo humano','Artéria braquial'],['Artérias do corpo humano','Artéria radial'],['Artérias do corpo humano','Artéria ulnar'],['Artérias do corpo humano','Artéria renal'],['Artérias do corpo humano','Artéria ilíaca interna'],['Artérias do corpo humano','Artéria ilíaca externa'],['Artérias do corpo humano','Artéria femoral']
];
let state = JSON.parse(localStorage.getItem(APP_KEY) || '{}');
state.categories ||= {}; state.questions ||= {}; state.items ||= {};
const save = () => localStorage.setItem(APP_KEY, JSON.stringify(state));
const $ = s => document.querySelector(s);
const categoryBox = $('#categoryBox'), questionsBox = $('#questionsBox'), itemsGrid = $('#itemsGrid');

function init(){
  if(state.theme === 'light') document.body.classList.add('light');
  renderCategories(); renderQuestions(); renderItems(); bind(); registerSW();
}
function bind(){
  $('#themeBtn').onclick = () => { document.body.classList.toggle('light'); state.theme = document.body.classList.contains('light')?'light':'dark'; save(); };
  $('#openGuideBtn').onclick = () => $('#guide').classList.toggle('hidden');
  $('#clearBtn').onclick = () => { if(confirm('Deseja apagar fotos, anotações e respostas salvas neste navegador?')){ localStorage.removeItem(APP_KEY); location.reload(); } };
  $('#pdfBtn').onclick = generatePDF;
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#installBtn').classList.remove('hidden'); });
  $('#installBtn').onclick = async () => { if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }};
}
function renderCategories(){
  categoryBox.innerHTML = categories.map(c => `<label class="chip"><input type="checkbox" ${state.categories[c]?'checked':''} data-cat="${c}">${c}</label>`).join('');
  categoryBox.querySelectorAll('input').forEach(i => i.onchange = e => { state.categories[e.target.dataset.cat]=e.target.checked; save(); });
}
function renderQuestions(){
  questionsBox.innerHTML = questions.map((q,i)=>`<div class="question"><strong>${i+1}. ${q}</strong><textarea data-q="${i}" placeholder="Resposta do aluno...">${state.questions[i]||''}</textarea></div>`).join('');
  questionsBox.querySelectorAll('textarea').forEach(t => t.oninput = e => { state.questions[e.target.dataset.q]=e.target.value; save(); });
}
function renderItems(){
  itemsGrid.innerHTML = items.map(([stage,name],idx)=>{
    const photos = state.items[idx]?.photos || [];
    return `<article class="item-card"><div class="item-head"><div><div class="tag">${stage}</div><div class="item-title">${name}</div></div><span>${photos.length} img</span></div>
    <label class="file-btn">📷 Fotografar / incluir arquivos<input data-file="${idx}" type="file" accept="image/*" capture="environment" multiple></label>
    <textarea class="note" data-note="${idx}" placeholder="Anotação geral sobre ${name}...">${state.items[idx]?.note||''}</textarea>
    <div class="photos" id="photos-${idx}">${photos.map((p,pidx)=>photoHTML(idx,pidx,p)).join('')}</div></article>`;
  }).join('');
  itemsGrid.querySelectorAll('[data-file]').forEach(input => input.onchange = handleFiles);
  itemsGrid.querySelectorAll('[data-note]').forEach(t => t.oninput = e => { const id=e.target.dataset.note; state.items[id] ||= {photos:[]}; state.items[id].note=e.target.value; save(); });
  itemsGrid.querySelectorAll('[data-pnote]').forEach(t => t.oninput = e => { const [id,pid]=e.target.dataset.pnote.split('-'); state.items[id].photos[pid].note=e.target.value; save(); });
  itemsGrid.querySelectorAll('[data-remove]').forEach(b => b.onclick = e => { const [id,pid]=e.target.dataset.remove.split('-'); state.items[id].photos.splice(pid,1); save(); renderItems(); });
}
function photoHTML(id,pid,p){ return `<div class="photo-card"><img src="${p.src}" alt="Imagem"><textarea data-pnote="${id}-${pid}" placeholder="Anotação desta imagem...">${p.note||''}</textarea><button class="remove" data-remove="${id}-${pid}">Remover</button></div>`; }
function handleFiles(e){
  const id = e.target.dataset.file; state.items[id] ||= {photos:[]};
  [...e.target.files].forEach(file => { const reader = new FileReader(); reader.onload = ev => { state.items[id].photos.push({src:ev.target.result,note:'',name:file.name,date:new Date().toLocaleString('pt-BR')}); save(); renderItems(); }; reader.readAsDataURL(file); });
}
async function generatePDF(){
  const { jsPDF } = window.jspdf; const pdf = new jsPDF({unit:'mm', format:'a4'}); let y=14;
  const line = (txt, size=11, bold=false) => { pdf.setFont('helvetica', bold?'bold':'normal'); pdf.setFontSize(size); const split=pdf.splitTextToSize(txt,180); split.forEach(s=>{ if(y>280){pdf.addPage();y=14;} pdf.text(s,15,y); y+=6; }); };
  line('Universidade Estadual de Maringá',14,true); line('Disciplina: Anatomia Humana',11); line('Professora: Cláudia Regina Pinheiro Lopes',11); line('CardioRoteiro — Sistema Cardiovascular',16,true); line('Data: '+new Date().toLocaleString('pt-BR'),10);
  y+=4; line('Estruturas marcadas: '+categories.filter(c=>state.categories[c]).join(', '),10,true);
  y+=4; line('Perguntas-guia',13,true); questions.forEach((q,i)=>{ line(`${i+1}. ${q}`,10,true); line(state.questions[i] || 'Sem resposta registrada.',10); });
  for(const [idx,[stage,name]] of items.entries()){
    const entry = state.items[idx]; if(!entry || (!entry.note && (!entry.photos || !entry.photos.length))) continue;
    if(y>245){pdf.addPage();y=14;} y+=4; line(`${stage} — ${name}`,13,true); if(entry.note) line('Anotação geral: '+entry.note,10);
    for(const p of entry.photos || []){
      if(y>210){pdf.addPage();y=14;} try{ pdf.addImage(p.src,'JPEG',15,y,80,55); }catch{ try{ pdf.addImage(p.src,'PNG',15,y,80,55); }catch{} }
      pdf.setFontSize(9); pdf.text(`Registro: ${p.date || ''}`,100,y+5); const note = pdf.splitTextToSize(p.note || 'Sem anotação da imagem.',90); pdf.text(note,100,y+12); y+=62;
    }
  }
  pdf.save('CardioRoteiro-Sistema-Cardiovascular.pdf');
}
function registerSW(){ if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js'); }
init();
