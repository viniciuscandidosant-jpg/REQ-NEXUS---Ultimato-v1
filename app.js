


const SUPABASE_URL = 'https://baxioajyrjfnmvpknaes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheGlvYWp5cmpmbm12cGtuYWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjQ3NTYsImV4cCI6MjA5NDY0MDc1Nn0.OOLTbz5TTLaPCXVY7ntkSxjcZljFYSOkoCwBvHG4iLI';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const app = document.getElementById('app');
let state = { session:null, profile:null, tab:'', catalog:[], categories:[], catalogError:null, reqs:[], reqItems:{}, selectedReq:null, toast:null, filters:{}, nav:[] };
const labelSetor={bar:'Bar',cozinha:'Cozinha',cumim:'Cumim'};
const labelRole={admin:'ADM Geral',estoquista:'Estoquista',setor:'Setor'};
const stL={pendente:'Pendente',separando:'Separando',entregue:'Entregue',cancelado:'Cancelado',lixeira:'Lixeira'};
const stC={pendente:'b-am',separando:'b-bl',entregue:'b-gr',cancelado:'b-rd',lixeira:'b-gy'};
const prL={normal:'Normal',urgente:'Urgente',critico:'Crítico'};
const prC={normal:'b-gr',urgente:'b-am',critico:'b-rd'};
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function formatDateBR(dateStr){if(!dateStr)return '—'; const parts=String(dateStr).split('-'); if(parts.length===3){const [y,m,d]=parts; if(y&&m&&d)return `${d}/${m}/${y}`;} return String(dateStr);} 
function fmtDate(s){return formatDateBR(s);}
function fmtDT(s){if(!s)return '—';return new Date(s).toLocaleString('pt-BR');}
function today(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);}
function toast(msg){state.toast=msg;render();setTimeout(()=>{state.toast=null;render();},2600)}
function role(){return state.profile?.role||''}
function isAdmin(){return role()==='admin'}
function isEst(){return role()==='estoquista'}
function isSetor(){return role()==='setor'}
function userName(){return state.profile?.nome || state.session?.user?.email || ''}
async function logAudit(tabela, id, acao, antes=null, depois=null, justificativa=''){
  try{await sb.from('audit_logs').insert({tabela,registro_id:id,acao,antes,depois,usuario_id:state.session?.user?.id,usuario_nome:userName(),usuario_role:role(),justificativa});}catch(e){console.warn('audit',e)}
}
function navFor(){
  if(isAdmin()) return [['dashboard','Dashboard'],['requisicoes','Requisições'],['nova','Nova'],['catalogo','Catálogo'],['usuarios','Usuários'],['lixeira','Lixeira'],['auditoria','Auditoria']];
  if(isEst()) return [['painel','Painel'],['nova','Nova'],['dashboard','Dashboard']];
  return [['nova','Nova Requisição'],['meus','Meus Pedidos']];
}
function header(){return `<header class="app-hdr"><div class="app-hdr-inner"><img class="app-hdr-logo" src="logo-ilha.png" alt="Grupo Ilha"><div class="app-hdr-text"><h1>NEXUS · Requisições</h1><p>Grupo Ilha do Caranguejo</p></div><div class="top-user"><span>${esc(userName())}<br>${esc(labelRole[role()]||'')}</span><button class="btn bs bsm" onclick="logout()">Sair</button></div></div></header>`}
function shell(content){const nav=navFor(); if(!state.tab || !nav.some(n=>n[0]===state.tab)) state.tab=nav[0][0]; return `${header()}<main class="wrap"><div class="tabs">${nav.map(([k,l])=>`<button class="${state.tab===k?'on':''}" onclick="go('${k}')">${l}</button>`).join('')}</div>${content}</main>${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}`}
function setTab(t){state.tab=t; render(); routeLoad();}
window.go=setTab;
async function logout(){await sb.auth.signOut(); state={session:null,profile:null,tab:'',catalog:[],categories:[],catalogError:null,reqs:[],reqItems:{},selectedReq:null,toast:null,filters:{},nav:[]}; renderLogin();}
window.logout=logout;
async function init(){
  const {data:{session}}=await sb.auth.getSession(); state.session=session; if(session) await loadProfile(); render(); routeLoad();
  sb.auth.onAuthStateChange(async(ev,sess)=>{state.session=sess;if(sess){await loadProfile();render();routeLoad();}else renderLogin();});
}
async function loadProfile(){
  const {data,error}=await sb.from('profiles').select('*').eq('id',state.session.user.id).single();
  if(error||!data){alert('Login sem perfil no NEXUS. Fale com o Administrador.'); await sb.auth.signOut(); return;}
  if(!data.ativo){alert('Este login está bloqueado. Fale com o Administrador.'); await sb.auth.signOut(); return;}
  state.profile=data; await sb.from('profiles').update({ultimo_login:new Date().toISOString()}).eq('id',data.id); await loadCatalog();
}
function render(){if(!state.session||!state.profile){renderLogin();return;} const t=state.tab||navFor()[0][0]; const map={dashboard:viewDashboard,requisicoes:viewReqs,painel:viewReqs,nova:viewNova,meus:viewReqs,catalogo:viewCatalogo,usuarios:viewUsuarios,lixeira:viewLixeira,auditoria:viewAuditoria}; app.innerHTML=shell((map[t]||viewDashboard)());}
function renderLogin(){app.innerHTML=`<div class="login-bg"><div class="login-card"><img src="logo-ilha.png" class="login-logo"><h1>NEXUS · Requisições</h1><p class="sub">Acesso online · Grupo Ilha do Caranguejo</p><form onsubmit="login(event)" class="grid"><div><label class="lbl">E-mail</label><input id="loginEmail" class="inp" type="email" autocomplete="username" placeholder="usuario@grupoilha.local" required></div><div><label class="lbl">Senha</label><input id="loginPass" class="inp" type="password" autocomplete="current-password" placeholder="Senha" required></div><button class="btn bp" style="width:100%;padding:14px">Entrar</button></form><div class="login-note">Caso ainda não tenha um login, entre em contato com o Administrador.</div></div></div>${state.toast?`<div class="toast">${esc(state.toast)}</div>`:''}`}
async function login(e){e.preventDefault(); const email=document.getElementById('loginEmail').value.trim(); const password=document.getElementById('loginPass').value; const {error}=await sb.auth.signInWithPassword({email,password}); if(error) toast('Login ou senha inválidos.');}
window.login=login;
async function routeLoad(){const t=state.tab||navFor()[0][0]; if(['dashboard','requisicoes','painel','meus','lixeira'].includes(t)) await loadReqs(); if(['nova','catalogo'].includes(t)) await loadCatalog(); if(t==='usuarios') await loadUsers(); if(t==='auditoria') await loadAudit(); render();}
async function loadCatalog(){
  state.catalogError=null;
  const {data:cats,error:catErr}=await sb.from('catalog_categories').select('id,setor,nome,ativo').order('setor').order('nome');
  const {data:items,error:itemErr}=await sb.from('catalog_items').select('id,setor,categoria_nome,nome,unidade,ativo').order('setor').order('categoria_nome').order('nome');
  if(catErr || itemErr){
    state.catalogError = (catErr?.message || itemErr?.message || 'Erro ao carregar catálogo');
    console.error('Erro catálogo:', catErr || itemErr);
  }
  state.categories=cats||[]; state.catalog=items||[];
}
async function loadReqs(){
  let q=sb.from('requisicoes').select('*').order('criado_em',{ascending:false});
  if(state.tab==='lixeira') q=q.eq('status','lixeira'); else q=q.neq('status','lixeira');
  const {data,error}=await q; if(error){toast(error.message); return;} state.reqs=data||[];
  const ids=state.reqs.map(r=>r.id); state.reqItems={}; if(ids.length){const {data:items}=await sb.from('requisicao_itens').select('*').in('requisicao_id',ids).order('categoria').order('nome'); (items||[]).forEach(it=>{(state.reqItems[it.requisicao_id] ||= []).push(it)});}
}
function filterReqs(){let arr=[...state.reqs]; if(state.tab==='meus'&&isSetor()) arr=arr.filter(r=>r.setor===state.profile.setor); if(state.filters.q){const q=state.filters.q.toLowerCase(); arr=arr.filter(r=>(r.numero+' '+r.responsavel_nome+' '+(r.observacoes||'')).toLowerCase().includes(q));} if(state.filters.setor) arr=arr.filter(r=>r.setor===state.filters.setor); if(state.filters.status) arr=arr.filter(r=>r.status===state.filters.status); if(state.filters.prioridade) arr=arr.filter(r=>r.prioridade===state.filters.prioridade); if(state.filters.data) arr=arr.filter(r=>r.data_requisicao===state.filters.data); return arr;}
function clearReqFilters(){['q','setor','status','prioridade','data'].forEach(k=>delete state.filters[k]);}
window.clearReqFilters=clearReqFilters;
let searchRenderTimer=null;
function searchInput(el,key){
  state.filters[key]=el.value;
  clearTimeout(searchRenderTimer);
  searchRenderTimer=setTimeout(()=>renderKeepFocus(key),180);
}
function renderKeepFocus(key){
  const active=document.activeElement;
  const pos=active&&typeof active.selectionStart==='number'?active.selectionStart:null;
  render();
  setTimeout(()=>{
    const next=document.querySelector(`[data-search="${key}"]`);
    if(next){next.focus(); if(pos!==null){try{next.setSelectionRange(pos,pos)}catch(e){}}}
  },0);
}
window.searchInput=searchInput;
function viewReqs(){const arr=filterReqs(); const title=state.tab==='meus'?'Meus Pedidos':(state.tab==='painel'?'Painel do Estoquista':'Requisições'); const filtroSetor = state.tab==='meus'&&isSetor() ? `<div class="inp" style="display:flex;align-items:center;color:var(--s2);background:#F9FAFB">${labelSetor[state.profile.setor]}</div>` : `<select class="inp" onchange="state.filters.setor=this.value;render()"><option value="">Todos setores</option>${Object.entries(labelSetor).map(([k,v])=>`<option value="${k}" ${state.filters.setor===k?'selected':''}>${v}</option>`).join('')}</select>`; return `<div class="title row space"><div><h2>${title}</h2><p>${arr.length} registro(s) online</p></div><button class="btn bs bsm" onclick="routeLoad()">Atualizar</button></div><div class="card" style="padding:13px;margin:12px 0"><div class="grid g4"><input class="inp" placeholder="Buscar REQ, solicitante..." data-search="q" oninput="searchInput(this,'q')" value="${esc(state.filters.q||'')}">${filtroSetor}<select class="inp" onchange="state.filters.status=this.value;render()"><option value="">Todos status</option>${Object.entries(stL).filter(([k])=>k!=='lixeira').map(([k,v])=>`<option value="${k}" ${state.filters.status===k?'selected':''}>${v}</option>`).join('')}</select><select class="inp" onchange="state.filters.prioridade=this.value;render()"><option value="">Prioridades</option>${Object.entries(prL).map(([k,v])=>`<option value="${k}" ${state.filters.prioridade===k?'selected':''}>${v}</option>`).join('')}</select><button type="button" class="btn bs" onclick="clearReqFilters();render();routeLoad()">Limpar filtros</button></div></div>${arr.length?arr.map(reqCard).join(''):`<div class="card empty">Nenhuma requisição encontrada.</div>`}${modalHtml()}`}
function reqCard(r){const items=state.reqItems[r.id]||[];return `<div class="card req-card pr-${r.prioridade}" onclick="openReq('${r.id}')"><div class="row space"><div><strong>${esc(r.numero)}</strong> <span class="badge ${prC[r.prioridade]}">${prL[r.prioridade]}</span><div class="small">${labelSetor[r.setor]} · ${esc(r.responsavel_nome)} · ${fmtDT(r.criado_em)}</div></div><span class="badge ${stC[r.status]}">${stL[r.status]}</span></div><div class="small" style="margin-top:8px">${items.length} item(s) · Data ${fmtDate(r.data_requisicao)}</div></div>`}
function openReq(id){state.selectedReq=state.reqs.find(r=>r.id===id); render();}
window.openReq=openReq;
function modalHtml(){const r=state.selectedReq;if(!r)return ''; const items=state.reqItems[r.id]||[]; const canOperate=isAdmin()||isEst(); return `<div class="modal-bg" onclick="if(event.target.className==='modal-bg'){state.selectedReq=null;render()}"><div class="modal"><div class="modal-h"><div><h2>${esc(r.numero)}</h2><p class="small">${labelSetor[r.setor]} · ${esc(r.responsavel_nome)} · ${fmtDT(r.criado_em)}</p></div><button class="btn bs bsm" onclick="state.selectedReq=null;render()">Fechar</button></div><div class="modal-b"><div class="grid g3" style="margin-bottom:14px"><div><label class="lbl">Status</label><span class="badge ${stC[r.status]}">${stL[r.status]}</span></div><div><label class="lbl">Prioridade</label><span class="badge ${prC[r.prioridade]}">${prL[r.prioridade]}</span></div><div><label class="lbl">Data</label><strong>${fmtDate(r.data_requisicao)}</strong></div></div>${r.observacoes?`<div class="card" style="padding:12px;margin-bottom:14px"><label class="lbl">Observações</label>${esc(r.observacoes)}</div>`:''}<div class="table-wrap"><table class="table"><thead><tr><th>Categoria</th><th>Item</th><th>Solicitado</th><th>Enviado</th><th>Justificativa</th></tr></thead><tbody>${items.map(i=>`<tr><td>${esc(i.categoria)}</td><td>${esc(i.nome)}${i.observacao_item?`<div class="small">Obs.: ${esc(i.observacao_item)}</div>`:''}</td><td>${i.qtd_solicitada} ${esc(i.unidade)}</td><td>${i.qtd_enviada==null?'—':i.qtd_enviada+' '+esc(i.unidade)}</td><td>${esc(i.justificativa_ajuste||'—')}</td></tr>`).join('')}</tbody></table></div>${actionButtons(r,canOperate)}</div></div></div>`}
function actionButtons(r,canOperate){if(state.tab==='lixeira')return `<div class="row" style="margin-top:16px;flex-wrap:wrap"><button class="btn bgr" onclick="restoreReq('${r.id}')">Restaurar</button>${isAdmin()?`<button class="btn brd" onclick="deleteReq('${r.id}')">Excluir definitivo</button>`:''}</div>`; let b=[]; b.push(`<button class="btn bs" onclick="emitirPDF('${r.id}')">Emitir PDF</button>`); if(canOperate){ if(r.status==='pendente') b.push(`<button class="btn bs" onclick="markSeparando('${r.id}')">Marcar Separando</button>`); if(['pendente','separando'].includes(r.status)) b.push(`<button class="btn bgr" onclick="openEntrega('${r.id}')">Ajustar / Confirmar entrega</button>`); if(r.status==='entregue') b.push(`<button class="btn bs" onclick="openEntrega('${r.id}')">Alterar entrega</button>`); if(isAdmin() && r.status!=='cancelado') b.push(`<button class="btn brd" onclick="cancelReq('${r.id}')">Cancelar</button>`); if(isAdmin() && r.status==='entregue') b.push(`<button class="btn bs" onclick="reopenReq('${r.id}')">Reabrir</button>`); if(isAdmin()) b.push(`<button class="btn brd" onclick="trashReq('${r.id}')">Mover para Lixeira</button>`); } return `<div class="row" style="margin-top:16px;flex-wrap:wrap">${b.join('')}</div>`}
async function markSeparando(id){const antes=state.selectedReq; if(!confirm('Marcar esta requisição como Separando?'))return; const depois={status:'separando'}; const {error}=await sb.from('requisicoes').update(depois).eq('id',id); if(error) return toast(error.message); await logAudit('requisicoes',id,'marcar_separando',antes,{...antes,...depois}); state.selectedReq=null; toast('Marcado como Separando'); await routeLoad();}
window.markSeparando=markSeparando;
function openEntrega(id){const r=state.reqs.find(x=>x.id===id), items=state.reqItems[id]||[]; state.selectedReq=null; const editMode=r.status==='entregue'; app.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="entregaModal"><div class="modal"><div class="modal-h"><div><h2>${editMode?'Alterar entrega':'Confirmar entrega'} · ${esc(r.numero)}</h2><p class="small">Informe a quantidade enviada. Se enviar diferente do solicitado, a justificativa é obrigatória.</p></div><button class="btn bs bsm" onclick="document.getElementById('entregaModal').remove()">Fechar</button></div><div class="modal-b"><form onsubmit="submitEntrega(event,'${id}')"><div class="card" style="padding:0 14px">${items.map(i=>`<div class="delivery-card"><strong>${esc(i.nome)}</strong><div class="small">${esc(i.categoria)} · Solicitado: <b>${i.qtd_solicitada} ${esc(i.unidade)}</b></div>${i.observacao_item?`<div class="pdf-mini">Obs. do item: ${esc(i.observacao_item)}</div>`:''}<div class="delivery-line"><div><label class="lbl">Justificativa se alterar</label><input class="inp" name="j_${i.id}" value="${esc(i.justificativa_ajuste||'')}" placeholder="Obrigatória se alterar"></div><div><label class="lbl">Enviar</label><input class="inp" name="q_${i.id}" type="number" step="0.01" min="0" value="${i.qtd_enviada??i.qtd_solicitada}"></div></div></div>`).join('')}</div><button class="btn bgr" style="margin-top:16px;width:100%;padding:14px">${editMode?'Salvar alteração da entrega':'Confirmar Entrega'}</button></form></div></div></div>`)}
window.openEntrega=openEntrega;
async function submitEntrega(e,id){e.preventDefault(); const r=state.reqs.find(x=>x.id===id), items=state.reqItems[id]||[]; const updates=[]; for(const it of items){const q=Number(e.target[`q_${it.id}`].value); const j=e.target[`j_${it.id}`].value.trim(); if(q!==Number(it.qtd_solicitada)&&!j){toast('Justifique todos os itens alterados.'); return;} updates.push({id:it.id,qtd_enviada:q,justificativa_ajuste:j||null});}
  for(const u of updates){const {error}=await sb.from('requisicao_itens').update({qtd_enviada:u.qtd_enviada,justificativa_ajuste:u.justificativa_ajuste}).eq('id',u.id); if(error)return toast(error.message)}
  let patch={}; let acao='alterar_entrega'; let msg='Entrega atualizada';
  if(r.status!=='entregue'){patch={status:'entregue',entregue_por:state.session.user.id,entregue_por_nome:userName(),entregue_em:new Date().toISOString()}; acao='confirmar_entrega'; msg='Entrega confirmada';}
  if(Object.keys(patch).length){const {error}=await sb.from('requisicoes').update(patch).eq('id',id); if(error)return toast(error.message);}
  await logAudit('requisicoes',id,acao,r,{...r,...patch,itens_entrega:updates},msg); document.getElementById('entregaModal')?.remove(); toast(msg); await routeLoad();}
window.submitEntrega=submitEntrega;
async function emitirPDF(id){
  const r=state.reqs.find(x=>x.id===id);
  if(!r){toast('Pedido não encontrado.');return;}
  if(!window.jspdf?.jsPDF){toast('PDF indisponível. Recarregue a página.');return;}
  let items=state.reqItems[id]||[];
  if(!items.length){
    const res=await sb.from('requisicao_itens').select('*').eq('requisicao_id',id).order('categoria').order('nome');
    if(res.error){toast('Erro ao carregar itens para o PDF: '+res.error.message);return;}
    items=res.data||[];
    state.reqItems[id]=items;
  }
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  const W=doc.internal.pageSize.getWidth();
  const H=doc.internal.pageSize.getHeight();
  const M=14;
  const OR=[245,149,0], INK=[17,24,39], MUT=[107,114,128], BD=[229,231,235], SOFT=[249,250,251];
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const qty=v=>Number(v??0).toLocaleString('pt-BR',{maximumFractionDigits:2});
  const qSol=it=>`${qty(it.qtd_solicitada)} ${it.unidade||''}`.trim();
  const qEnv=it=> it.qtd_enviada===null || it.qtd_enviada===undefined ? 'Aguardando' : `${qty(it.qtd_enviada)} ${it.unidade||''}`.trim();
  const adjusted=it=> it.qtd_enviada!==null && it.qtd_enviada!==undefined && Number(it.qtd_enviada)!==Number(it.qtd_solicitada);
  const footer=()=>{
    const pages=doc.internal.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(156,163,175);
      doc.text(`Gerado pelo NEXUS Requisições · Grupo Ilha · Página ${p}/${pages}`,W/2,H-8,{align:'center'});
    }
  };
  const header=()=>{
    doc.setFillColor(...OR);doc.rect(0,0,W,36,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);
    doc.text('NEXUS · Requisições',M,14);
    doc.setFontSize(8.5);doc.text('GRUPO ILHA DO CARANGUEJO',M,21);
    doc.setFontSize(13);doc.text(clean(r.numero||''),W-M,14,{align:'right'});
    doc.setFontSize(8.5);doc.text(clean(stL[r.status]||r.status).toUpperCase(),W-M,21,{align:'right'});
  };
  const tableHeader=(y)=>{
    doc.setFillColor(243,244,246);doc.rect(M,y, W-M*2,8,'F');
    doc.setTextColor(...MUT);doc.setFont('helvetica','bold');doc.setFontSize(7.5);
    doc.text('ITEM',M+2,y+5.2);
    doc.text('SOLIC.',M+89,y+5.2);
    doc.text('ENVIADO',M+116,y+5.2);
    doc.text('JUSTIFICATIVA / OBS.',M+145,y+5.2);
    return y+10;
  };
  header();
  let y=46;
  doc.setTextColor(...INK);
  doc.setDrawColor(...BD);doc.setFillColor(255,248,236);doc.roundedRect(M,y-5,W-M*2,39,3,3,'F');
  const left=[['Setor',labelSetor[r.setor]||r.setor],['Responsável',r.responsavel_nome||'-'],['Data',fmtDate(r.data_requisicao)]];
  const right=[['Prioridade',prL[r.prioridade]||r.prioridade],['Criado em',fmtDT(r.criado_em)],['Entregue em',r.entregue_em?fmtDT(r.entregue_em):'Aguardando']];
  doc.setFontSize(8.6);
  left.forEach(([a,b],i)=>{doc.setFont('helvetica','bold');doc.text(a+':',M+5,y+i*9);doc.setFont('helvetica','normal');doc.text(clean(b),M+34,y+i*9,{maxWidth:58});});
  right.forEach(([a,b],i)=>{doc.setFont('helvetica','bold');doc.text(a+':',M+102,y+i*9);doc.setFont('helvetica','normal');doc.text(clean(b),M+132,y+i*9,{maxWidth:55});});
  y+=42;
  if(r.observacoes){
    const obs=doc.splitTextToSize(clean(r.observacoes),W-M*2-8);
    doc.setFillColor(249,250,251);doc.roundedRect(M,y-4,W-M*2,obs.length*4.2+11,2,2,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...MUT);doc.text('OBSERVAÇÕES',M+4,y+1);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...INK);doc.text(obs,M+4,y+7);
    y+=obs.length*4.2+14;
  }
  const totalAjustes=items.filter(adjusted).length;
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...INK);doc.text('Itens do pedido',M,y);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...MUT);doc.text(`${items.length} item(ns) · ${totalAjustes} ajuste(s) operacional(is)`,W-M,y,{align:'right'});
  y+=5;
  y=tableHeader(y);
  doc.setFont('helvetica','normal');doc.setFontSize(7.8);
  items.forEach((it,idx)=>{
    const itemText=doc.splitTextToSize(clean(it.nome||''),82);
    let justText='—';
    if(adjusted(it)) justText=clean(it.justificativa_ajuste||'Ajuste operacional sem observação');
    if(it.observacao_item) justText=(justText==='—'?'':justText+' · ')+`Obs.: ${clean(it.observacao_item)}`;
    const justLines=doc.splitTextToSize(justText,48);
    const rowH=Math.max(12,itemText.length*4.1,justLines.length*4.1)+6;
    if(y+rowH>H-16){doc.addPage();header();y=44;y=tableHeader(y);doc.setFont('helvetica','normal');doc.setFontSize(7.8);}
    if(idx%2===0){doc.setFillColor(...SOFT);doc.rect(M,y-4,W-M*2,rowH,'F');}
    doc.setTextColor(...INK);doc.setFont('helvetica','bold');doc.text(itemText,M+2,y);
    doc.setFont('helvetica','normal');doc.setTextColor(...MUT);doc.text(clean(it.categoria||''),M+2,y+itemText.length*4.1,{maxWidth:82});
    doc.setTextColor(...INK);doc.text(qSol(it),M+89,y,{maxWidth:24});
    doc.setTextColor(adjusted(it)?220:17, adjusted(it)?38:24, adjusted(it)?38:39);
    doc.setFont(adjusted(it)?'helvetica':'helvetica', adjusted(it)?'bold':'normal');doc.text(qEnv(it),M+116,y,{maxWidth:27});
    doc.setFont('helvetica','normal');doc.setTextColor(...INK);doc.text(justLines,M+145,y);
    doc.setDrawColor(...BD);doc.line(M,y+rowH-5,W-M,y+rowH-5);
    y+=rowH;
  });
  if(!items.length){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...MUT);doc.text('Nenhum item encontrado para este pedido.',M+2,y+5);}
  footer();
  doc.save(`${clean(r.numero||'pedido')}_${clean(r.setor||'setor')}.pdf`);
}
window.emitirPDF=emitirPDF;
async function cancelReq(id){const motivo=prompt('Motivo do cancelamento (obrigatório):'); if(!motivo||!motivo.trim())return toast('Cancelamento exige justificativa.'); const r=state.reqs.find(x=>x.id===id); const patch={status:'cancelado',cancelado_por:state.session.user.id,cancelado_por_nome:userName(),cancelado_em:new Date().toISOString(),motivo_cancelamento:motivo.trim()}; const {error}=await sb.from('requisicoes').update(patch).eq('id',id); if(error)return toast(error.message); await logAudit('requisicoes',id,'cancelar',r,{...r,...patch},motivo); state.selectedReq=null; toast('Requisição cancelada'); await routeLoad();}
window.cancelReq=cancelReq;
async function reopenReq(id){const motivo=prompt('Motivo da reabertura (obrigatório):'); if(!motivo||!motivo.trim())return toast('Reabertura exige justificativa.'); const r=state.reqs.find(x=>x.id===id); const patch={status:'separando',reaberto_por:state.session.user.id,reaberto_por_nome:userName(),reaberto_em:new Date().toISOString(),motivo_reabertura:motivo.trim()}; const {error}=await sb.from('requisicoes').update(patch).eq('id',id); if(error)return toast(error.message); await logAudit('requisicoes',id,'reabrir',r,{...r,...patch},motivo); state.selectedReq=null; toast('Requisição reaberta'); await routeLoad();}
window.reopenReq=reopenReq;
async function trashReq(id){const motivo=prompt('Motivo para mover à lixeira:'); if(!motivo||!motivo.trim())return toast('Informe o motivo.'); const r=state.reqs.find(x=>x.id===id); const patch={status:'lixeira',movido_lixeira_por:state.session.user.id,movido_lixeira_por_nome:userName(),movido_lixeira_em:new Date().toISOString(),motivo_lixeira:motivo.trim()}; const {error}=await sb.from('requisicoes').update(patch).eq('id',id); if(error)return toast(error.message); await logAudit('requisicoes',id,'mover_lixeira',r,{...r,...patch},motivo); state.selectedReq=null; state.reqs=state.reqs.filter(x=>x.id!==id); delete state.reqItems[id]; toast('Movido para lixeira'); render(); await loadReqs(); render();}
window.trashReq=trashReq;
async function restoreReq(id){if(!confirm('Restaurar esta requisição para Pendente?'))return; const r=state.reqs.find(x=>x.id===id); const patch={status:'pendente',restaurado_por:state.session.user.id,restaurado_por_nome:userName(),restaurado_em:new Date().toISOString()}; const {error}=await sb.from('requisicoes').update(patch).eq('id',id); if(error)return toast(error.message); await logAudit('requisicoes',id,'restaurar_lixeira',r,{...r,...patch}); state.selectedReq=null; state.reqs=state.reqs.filter(x=>x.id!==id); toast('Restaurada'); render(); await loadReqs(); render();}
window.restoreReq=restoreReq;
async function deleteReq(id){if(!confirm('Excluir definitivamente? Esta ação não pode ser desfeita.'))return; const r=state.reqs.find(x=>x.id===id); const {error}=await sb.from('requisicoes').delete().eq('id',id); if(error)return toast(error.message); await logAudit('requisicoes',id,'excluir_definitivo',r,null); state.selectedReq=null; state.reqs=state.reqs.filter(x=>x.id!==id); delete state.reqItems[id]; toast('Excluída definitivamente'); render(); await loadReqs(); render();}
window.deleteReq=deleteReq;
function viewNova(){let setor = isSetor()?state.profile.setor:(state.filters.novaSetor||'cozinha'); let items=state.catalog.filter(i=>String(i.setor)===String(setor)&&i.ativo!==false); let groups={}; items.forEach(i=>(groups[i.categoria_nome] ||= []).push(i)); const emptyCatalog = !items.length ? `<div class="card" style="padding:18px;margin:12px 0;border-left:4px solid var(--am)"><strong>Nenhum item carregado para ${esc(labelSetor[setor]||setor)}.</strong><p class="small" style="margin-top:6px">${state.catalogError ? 'Erro: '+esc(state.catalogError) : 'Clique em Atualizar catálogo. Se continuar, revise as permissões do catálogo no Supabase.'}</p><button type="button" class="btn bs bsm" style="margin-top:10px" onclick="loadCatalog().then(render)">Atualizar catálogo</button></div>` : ''; return `<div class="title"><h2>Nova Requisição</h2><p>${isSetor()?'Seu setor já está definido para este login.':'Escolha o setor e selecione os itens.'}</p></div><form id="novaReqForm" onsubmit="previewReq(event)" class="grid" style="margin-top:14px"><div class="card" style="padding:16px"><div class="grid g3"><div><label class="lbl">Setor</label><select class="inp" name="setor" ${isSetor()?'disabled':''} onchange="state.filters.novaSetor=this.value;render();routeLoad()">${Object.entries(labelSetor).map(([k,v])=>`<option value="${k}" ${setor===k?'selected':''}>${v}</option>`).join('')}</select></div><div><label class="lbl">Responsável</label><input class="inp" name="responsavel" value="${esc(userName())}" required></div><div><label class="lbl">Data</label><input class="inp" type="date" name="data" value="${today()}" required></div><div><label class="lbl">Prioridade</label><select class="inp" name="prioridade"><option value="normal">Normal</option><option value="urgente">Urgente</option><option value="critico">Crítico</option></select></div><div style="grid-column:1/-1"><label class="lbl">Observações</label><textarea class="inp" name="observacoes" placeholder="Observações gerais"></textarea></div></div></div>${emptyCatalog}<div id="itemsBox">${Object.entries(groups).map(([cat,arr])=>`<div class="card cat-group"><div class="cat-title">${esc(cat)}</div>${arr.map(it=>`<div class="item-row"><div><strong style="font-size:13px">${esc(it.nome)}</strong><div class="small">${esc(it.unidade)}</div><input class="inp" style="margin-top:6px" name="obs_${it.id}" placeholder="Observação do item (opcional)"></div><input class="inp num" name="q_${it.id}" type="number" min="0" step="0.01" placeholder="0"></div>`).join('')}</div>`).join('')}</div><button class="btn bp" style="width:100%;padding:15px">Revisar Requisição</button></form>`}
function getReqDraftFromForm(form){
  const fd=new FormData(form);
  const setor=isSetor()?state.profile.setor:fd.get('setor');
  const responsavel=String(fd.get('responsavel')||userName()).trim();
  const data=String(fd.get('data')||'').trim();
  const prioridade=String(fd.get('prioridade')||'normal');
  const observacoes=String(fd.get('observacoes')||'').trim();
  const selected=state.catalog.filter(i=>String(i.setor)===String(setor)&&Number(fd.get('q_'+i.id))>0);
  const itens=selected.map(i=>({
    catalog_item_id:i.id,
    categoria:i.categoria_nome,
    nome:i.nome,
    unidade:i.unidade,
    qtd_solicitada:Number(fd.get('q_'+i.id)),
    observacao_item:String(fd.get('obs_'+i.id)||'').trim()||null
  }));
  return {fd,setor,responsavel,data,prioridade,observacoes,selected,itens};
}
function previewReq(e){
  e.preventDefault();
  const form=e.target;
  const draft=getReqDraftFromForm(form);
  if(!draft.responsavel){toast('Informe o responsável.'); return;}
  if(!draft.data){toast('Informe a data da requisição.'); return;}
  if(!draft.selected.length){toast('Selecione ao menos 1 item.'); return;}
  if(draft.prioridade==='critico'&&!draft.observacoes){toast('Prioridade crítica exige observação.'); return;}
  const old=document.getElementById('reqSummaryModal');
  if(old) old.remove();
  const itensHtml=draft.itens.map(it=>`<div class="summary-item"><div><strong>${esc(it.nome)}</strong><div class="small">${esc(it.categoria)}${it.observacao_item?` · Obs.: ${esc(it.observacao_item)}`:''}</div></div><span class="badge b-or">${it.qtd_solicitada} ${esc(it.unidade)}</span></div>`).join('');
  app.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="reqSummaryModal"><div class="modal"><div class="modal-h"><div><h2>Resumo da Requisição</h2><p class="small">Confira os dados antes de enviar ao estoque.</p></div><button type="button" class="btn bs bsm" onclick="closeReqSummary()">Voltar e editar</button></div><div class="modal-b"><div class="grid g2" style="margin-bottom:14px"><div><label class="lbl">Setor</label><strong>${esc(labelSetor[draft.setor]||draft.setor)}</strong></div><div><label class="lbl">Responsável</label><strong>${esc(draft.responsavel)}</strong></div><div><label class="lbl">Data</label><strong>${fmtDate(draft.data)}</strong></div><div><label class="lbl">Prioridade</label><span class="badge ${prC[draft.prioridade]||'b-or'}">${esc(prL[draft.prioridade]||draft.prioridade)}</span></div></div>${draft.observacoes?`<div class="card" style="padding:12px;margin-bottom:14px"><label class="lbl">Observações gerais</label>${esc(draft.observacoes)}</div>`:''}<div class="card" style="padding:0;margin-bottom:14px"><div class="cat-title">Itens selecionados</div>${itensHtml}</div><div class="operational-warning"><strong>Atenção operacional</strong><p>Antes de confirmar, verifique eventos semanais, datas atípicas e necessidades do final de semana. Em especial, considere o movimento de terça-feira com caranguejo dobrado e, nas sextas-feiras, faça a requisição pensando também em sábado e domingo.</p></div><div class="row" style="margin-top:16px;gap:10px"><button type="button" class="btn bs" style="flex:1" onclick="closeReqSummary()">Voltar e editar</button><button type="button" id="confirmReqBtn" class="btn bgr" style="flex:1" onclick="confirmReq()">Confirmar requisição</button></div></div></div></div>`);
}
window.previewReq=previewReq;
function closeReqSummary(){document.getElementById('reqSummaryModal')?.remove();}
window.closeReqSummary=closeReqSummary;
async function confirmReq(){
  const form=document.getElementById('novaReqForm');
  if(!form){toast('Formulário não encontrado.'); closeReqSummary(); return;}
  const btn=document.getElementById('confirmReqBtn');
  const oldText=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='Enviando...';}
  try{
    const draft=getReqDraftFromForm(form);
    if(!draft.selected.length){toast('Selecione ao menos 1 item.'); return;}
    if(draft.prioridade==='critico'&&!draft.observacoes){toast('Prioridade crítica exige observação.'); return;}
    const {data:num,error:numErr}=await sb.rpc('proximo_numero_requisicao');
    if(numErr) throw numErr;
    const req={numero:num,setor:draft.setor,responsavel_nome:draft.responsavel,data_requisicao:draft.data,prioridade:draft.prioridade,observacoes:draft.observacoes||null,criado_por:state.session.user.id,criado_por_nome:userName()};
    const {data:r,error}=await sb.from('requisicoes').insert(req).select('*').single();
    if(error) throw error;
    const rows=draft.itens.map(i=>({requisicao_id:r.id,catalog_item_id:i.catalog_item_id,categoria:i.categoria,nome:i.nome,unidade:i.unidade,qtd_solicitada:i.qtd_solicitada,observacao_item:i.observacao_item}));
    const {data:insertedItems,error:ie}=await sb.from('requisicao_itens').insert(rows).select('*');
    if(ie){await sb.from('requisicoes').delete().eq('id',r.id); throw ie;}
    await logAudit('requisicoes',r.id,'criar',null,{...r,itens:rows});
    clearReqFilters();
    closeReqSummary();
    state.selectedReq=null;
    state.tab=isSetor()?'meus':(isEst()?'painel':'requisicoes');
    state.reqs=[r,...state.reqs.filter(x=>x.id!==r.id)];
    state.reqItems[r.id]=insertedItems||rows;
    toast(`${num} enviada com sucesso`);
    await loadReqs();
    render();
  }catch(err){
    console.error('Erro ao enviar requisição:',err);
    toast('Erro ao gerar requisição: '+(err?.message||err));
  }finally{
    if(btn){btn.disabled=false;btn.textContent=oldText||'Confirmar requisição';}
  }
}
window.confirmReq=confirmReq;
function viewDashboard(){const arr=state.reqs.filter(r=>r.status!=='lixeira'); const total=arr.length, pend=arr.filter(r=>r.status==='pendente').length, sep=arr.filter(r=>r.status==='separando').length, ent=arr.filter(r=>r.status==='entregue').length, can=arr.filter(r=>r.status==='cancelado').length; const bySet={};arr.forEach(r=>bySet[r.setor]=(bySet[r.setor]||0)+1); const items={}; Object.values(state.reqItems).flat().forEach(i=>items[i.nome]=(items[i.nome]||0)+Number(i.qtd_solicitada)); const top=Object.entries(items).sort((a,b)=>b[1]-a[1]).slice(0,8); return `<div class="title row space"><div><h2>Dashboard</h2><p>Indicadores online do NEXUS Requisições</p></div><button class="btn bs bsm" onclick="exportCSV()">Exportar CSV</button></div><div class="grid g4" style="margin:14px 0"><div class="card stat"><strong>${total}</strong><span>Total</span></div><div class="card stat"><strong>${pend}</strong><span>Pendentes</span></div><div class="card stat"><strong>${sep}</strong><span>Separando</span></div><div class="card stat"><strong>${ent}</strong><span>Entregues</span></div></div><div class="grid g2"><div class="card" style="padding:16px"><h3>Requisições por setor</h3><table class="table"><tbody>${Object.entries(labelSetor).map(([k,v])=>`<tr><td>${v}</td><td><strong>${bySet[k]||0}</strong></td></tr>`).join('')}</tbody></table></div><div class="card" style="padding:16px"><h3>Itens mais solicitados</h3><table class="table"><tbody>${top.map(([n,q])=>`<tr><td>${esc(n)}</td><td><strong>${q}</strong></td></tr>`).join('')||'<tr><td>Nenhum dado ainda</td><td></td></tr>'}</tbody></table></div></div>`}
function exportCSV(){let rows=[['numero','setor','responsavel','status','prioridade','criado_em']]; filterReqs().forEach(r=>rows.push([r.numero,r.setor,r.responsavel_nome,r.status,r.prioridade,r.criado_em])); const csv=rows.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(';')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='nexus_requisicoes.csv'; a.click();}
window.exportCSV=exportCSV;
function viewLixeira(){return `<div class="title"><h2>Lixeira Administrativa</h2><p>Somente ADM Geral. Restaure ou exclua definitivamente.</p></div>${viewReqs().replace(/<div class="title[\s\S]*?<\/div><div class="card" style="padding:14px;margin:14px 0">[\s\S]*?<\/div>/,'')}`}
async function loadUsers(){const {data,error}=await sb.from('profiles').select('*').order('role').order('setor'); if(error)toast(error.message); state.users=data||[]}
function viewUsuarios(){const users=state.users||[]; return `<div class="title"><h2>Usuários e Acessos</h2><p>Controle de perfis e bloqueio de login. Para criar novos usuários com segurança, crie primeiro no Auth e depois vincule aqui.</p></div><div class="card" style="padding:16px;margin:14px 0"><h3>Criar perfil para usuário já criado no Auth</h3><p class="small" style="margin:6px 0 12px">O login precisa existir em Authentication > Users. Depois use o e-mail aqui para vincular ao NEXUS.</p><form class="grid g4" onsubmit="createProfileByEmail(event)"><input class="inp" name="email" type="email" placeholder="email do login" required><input class="inp" name="nome" placeholder="Nome" required><select class="inp" name="role"><option value="setor">Setor</option><option value="estoquista">Estoquista</option><option value="admin">ADM Geral</option></select><select class="inp" name="setor"><option value="">Sem setor</option><option value="bar">Bar</option><option value="cozinha">Cozinha</option><option value="cumim">Cumim</option></select><button class="btn bp">Vincular</button></form></div><div class="table-wrap card"><table class="table"><thead><tr><th>Email</th><th>Nome</th><th>Perfil</th><th>Setor</th><th>Ativo</th><th>Último login</th><th>Ações</th></tr></thead><tbody>${users.map(u=>`<tr><td>${esc(u.email)}</td><td>${esc(u.nome)}</td><td>${labelRole[u.role]}</td><td>${u.setor?labelSetor[u.setor]:'—'}</td><td>${u.ativo?'Sim':'Bloqueado'}</td><td>${fmtDT(u.ultimo_login)}</td><td><button class="btn ${u.ativo?'brd':'bgr'} bsm" onclick="toggleUser('${u.id}',${!u.ativo})">${u.ativo?'Bloquear':'Desbloquear'}</button></td></tr>`).join('')}</tbody></table></div>`}
async function createProfileByEmail(e){e.preventDefault(); const fd=new FormData(e.target); const email=fd.get('email').trim(); toast('Para vincular novo usuário, rode o SQL de profile após criar no Auth. Edição direta via navegador não consegue localizar auth.users com RLS.');}
window.createProfileByEmail=createProfileByEmail;
async function toggleUser(id,ativo){if(!confirm(ativo?'Desbloquear usuário?':'Bloquear usuário?'))return; const {error}=await sb.from('profiles').update({ativo,bloqueado_em:ativo?null:new Date().toISOString()}).eq('id',id); if(error)return toast(error.message); await logAudit('profiles',id,ativo?'desbloquear_usuario':'bloquear_usuario',null,{ativo}); toast('Usuário atualizado'); await routeLoad();}
window.toggleUser=toggleUser;
function viewCatalogo(){const q=(state.filters.catq||'').toLowerCase(); const items=state.catalog.filter(i=>!q || (i.nome+' '+i.categoria_nome+' '+i.setor).toLowerCase().includes(q)); return `<div class="title"><h2>Catálogo</h2><p>Gestão online de categorias e itens.</p></div><div class="card" style="padding:16px;margin:14px 0"><div class="grid g3"><input class="inp" placeholder="Buscar item/categoria" value="${esc(state.filters.catq||'')}" data-search="catq" oninput="searchInput(this,'catq')"><button class="btn bp" onclick="addCategory()">Nova categoria</button><button class="btn bp" onclick="addItem()">Novo item</button></div></div><div class="table-wrap card"><table class="table"><thead><tr><th>Setor</th><th>Categoria</th><th>Item</th><th>Un.</th><th>Ativo</th><th>Ações</th></tr></thead><tbody>${items.map(i=>`<tr><td>${labelSetor[i.setor]}</td><td>${esc(i.categoria_nome)}</td><td>${esc(i.nome)}</td><td>${esc(i.unidade)}</td><td>${i.ativo?'Sim':'Inativo'}</td><td><button class="btn bs bsm" onclick="editItem('${i.id}')">Editar</button> <button class="btn ${i.ativo?'brd':'bgr'} bsm" onclick="toggleItem('${i.id}',${!i.ativo})">${i.ativo?'Inativar':'Ativar'}</button></td></tr>`).join('')}</tbody></table></div>`}
async function addCategory(){const setor=prompt('Setor: bar, cozinha ou cumim'); if(!labelSetor[setor])return toast('Setor inválido.'); const nome=prompt('Nome da categoria:'); if(!nome)return; const {error}=await sb.from('catalog_categories').insert({setor,nome:nome.trim(),criado_por:state.session.user.id}); if(error)return toast(error.message); await logAudit('catalog_categories',null,'criar_categoria',null,{setor,nome}); toast('Categoria criada'); await routeLoad();}
window.addCategory=addCategory;
async function addItem(){const setor=prompt('Setor: bar, cozinha ou cumim'); if(!labelSetor[setor])return toast('Setor inválido.'); const cats=state.categories.filter(c=>c.setor===setor&&c.ativo); const catNome=prompt('Categoria existente:\n'+cats.map(c=>c.nome).join('\n')); const cat=cats.find(c=>c.nome.toLowerCase()===String(catNome||'').toLowerCase()); if(!cat)return toast('Categoria não encontrada.'); const nome=prompt('Nome do item:'); if(!nome)return; const unidade=prompt('Unidade:', 'und')||'und'; const row={category_id:cat.id,setor,categoria_nome:cat.nome,nome:nome.trim(),unidade:unidade.trim(),criado_por:state.session.user.id}; const {error}=await sb.from('catalog_items').insert(row); if(error)return toast(error.message); await logAudit('catalog_items',null,'criar_item',null,row); toast('Item criado'); await routeLoad();}
window.addItem=addItem;
async function editItem(id){const it=state.catalog.find(x=>x.id===id); const nome=prompt('Nome:',it.nome); if(!nome)return; const unidade=prompt('Unidade:',it.unidade)||it.unidade; const patch={nome:nome.trim(),unidade:unidade.trim()}; const {error}=await sb.from('catalog_items').update(patch).eq('id',id); if(error)return toast(error.message); await logAudit('catalog_items',id,'editar_item',it,{...it,...patch}); toast('Item editado'); await routeLoad();}
window.editItem=editItem;
async function toggleItem(id,ativo){const it=state.catalog.find(x=>x.id===id); if(!confirm(`${ativo?'Ativar':'Inativar'} item?`))return; const {error}=await sb.from('catalog_items').update({ativo}).eq('id',id); if(error)return toast(error.message); await logAudit('catalog_items',id,ativo?'ativar_item':'inativar_item',it,{...it,ativo}); toast('Item atualizado'); await routeLoad();}
window.toggleItem=toggleItem;
async function loadAudit(){const {data,error}=await sb.from('audit_logs').select('*').order('criado_em',{ascending:false}).limit(300); if(error)toast(error.message); state.audit=data||[]}
function viewAuditoria(){const logs=state.audit||[]; return `<div class="title"><h2>Auditoria</h2><p>Últimos registros de governança online.</p></div><div class="table-wrap card" style="margin-top:14px"><table class="table"><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Tabela</th><th>Justificativa</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${fmtDT(l.criado_em)}</td><td>${esc(l.usuario_nome||'—')}</td><td>${esc(l.acao)}</td><td>${esc(l.tabela)}</td><td>${esc(l.justificativa||'—')}</td></tr>`).join('')}</tbody></table></div>`}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn')?.classList.remove('hidden')});
async function installApp(){
  const btn=document.getElementById('installBtn');
  if(deferredPrompt){
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt=null;
    btn?.classList.add('hidden');
    return;
  }
  alert('Se a instalação automática não aparecer, no celular abra o menu do navegador e toque em “Adicionar à tela inicial”.');
}
window.installApp=installApp;
document.getElementById('installBtn')?.addEventListener('click',installApp);
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(console.warn));}
window.routeLoad=routeLoad; window.state=state; init();
