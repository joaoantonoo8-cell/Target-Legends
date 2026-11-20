import {firebaseConfig} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,updateDoc,onSnapshot,collection,query,orderBy,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const gate=document.getElementById('loginGate'),notice=document.getElementById('loginError'),nameInput=document.getElementById('loginUsername'),passInput=document.getElementById('loginPassword');
const enter=document.getElementById('loginEnter'),create=document.getElementById('loginCreate');
const initial=()=>({name:'Jogador',money:0,rebirth:0,hits:0,combo:0,level:1,xp:0,totalxp:0,weapon:0,world:0,upgrades:{power:0,luck:0,xp:0,pet:0},pets:[],equipped:[],achieved:[],claimed:[],finalClaimed:false,mutations:[],settings:{sound:true}});
const normalized=s=>s.trim().toLowerCase(),valid=s=>/^[a-zA-Z0-9_]{3,20}$/.test(s),email=s=>`${normalized(s)}@players.ultimate-target.example.com`;
let uid=null,username='',unsubPlayer=null,unsubRank=null,saveTimer=null,loaded=false,resetVersion=0,saving=false,dirty=false;
const say=s=>notice.textContent=s;
const buttons=busy=>{enter.disabled=busy;create.disabled=busy};
window.cloudReady=false;
window.cloudLogout=()=>auth.signOut();
async function saveNow(){if(!loaded||!uid)return; if(saving){dirty=true;return} saving=true;try{const state=structuredClone(window.getTargetState());state.name=username;await updateDoc(doc(db,'players',uid),{state,updatedAt:serverTimestamp(),resetVersion});}catch(e){console.error('Falha ao salvar',e);window.targetToast?.('⚠️ Erro ao salvar: '+(e.code||e.message));}finally{saving=false;if(dirty){dirty=false;saveNow()}}}
window.cloudSave=()=>{if(!loaded)return;clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,850)};
window.cloudRanking=()=>{
 const el=document.getElementById('onlineRanking');if(!el)return;
 unsubRank?.();el.innerHTML='<div class="rank-loading">Carregando classificação mundial...</div>';
 // Sem indice composto: lemos uma amostra limitada e ordenamos no navegador.
 const q=query(collection(db,'players'),limit(100));
 unsubRank=onSnapshot(q,snap=>{
  const players=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.state&&Number.isFinite(Number(p.state.hits)));
  players.sort((a,b)=>(Number(b.state.hits)||0)-(Number(a.state.hits)||0));
  el.replaceChildren();
  const heading=document.createElement('div');heading.className='rank-head';heading.textContent='CLASSIFICAÇÃO GLOBAL · AMOSTRA DE ATÉ 100 JOGADORES';el.append(heading);
  if(!players.length){const p=document.createElement('p');p.textContent='Ainda não há jogadores no ranking.';el.append(p);return;}
  const top=players.slice(0,25);
  top.forEach((p,i)=>{const row=document.createElement('div');row.className='rank-row'+(p.id===uid?' rank-me':'');
   const pos=document.createElement('span');pos.className='rank-position';pos.textContent=i===0?'1º':i===1?'2º':i===2?'3º':`${i+1}º`;
   const name=document.createElement('span');name.className='rank-name';name.textContent=p.username||'Jogador';
   const score=document.createElement('span');score.className='rank-score';score.textContent=`${Number(p.state.hits)||0} acertos`;
   const extra=document.createElement('small');extra.textContent=`${Number(p.state.rebirth)||0} renascimentos`;
   row.append(pos,name,score,extra);el.append(row);
  });
  const foot=document.createElement('p');foot.className='rank-disclaimer';foot.textContent='Ranking de teste. Os resultados são calculados no navegador e ainda não são verificados contra trapaças.';el.append(foot);
 },e=>{el.textContent='Ranking indisponível ('+(e.code||'erro')+'). Confira se as regras publicadas permitem leitura de players para usuários autenticados.';console.error('Ranking Firestore',e)});
};
async function login(signup){const name=nameInput.value.trim(),password=passInput.value;if(!valid(name))return say('Use de 3 a 20 letras, números ou _.');if(password.length<6)return say('Senha com pelo menos 6 caracteres.');buttons(true);say('Aguarde...');try{if(signup){const result=await createUserWithEmailAndPassword(auth,email(name),password);await setDoc(doc(db,'players',result.user.uid),{username:name,usernameLower:normalized(name),state:{...initial(),name},resetVersion:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});}else await signInWithEmailAndPassword(auth,email(name),password);say('Carregando sua conta...')}catch(e){say(({'auth/email-already-in-use':'Esse nome já está em uso.','auth/invalid-credential':'Nome ou senha incorretos.','auth/weak-password':'Senha fraca.','permission-denied':'Firestore bloqueou o cadastro. Publique as regras do ZIP.'})[e.code]||'Erro: '+(e.code||e.message))}finally{buttons(false)}}
enter.onclick=()=>login(false);create.onclick=()=>login(true);passInput.addEventListener('keydown',e=>{if(e.key==='Enter')login(false)});
onAuthStateChanged(auth,async user=>{clearTimeout(saveTimer);unsubPlayer?.();unsubPlayer=null;unsubRank?.();unsubRank=null;loaded=false;uid=user?.uid||null;window.cloudReady=false;gate.hidden=false;if(!user){window.setTargetState(initial());say('Entre ou crie uma conta para jogar.');return}say('☁️ Carregando progresso...');try{let snapshot=await getDoc(doc(db,'players',user.uid));if(!snapshot.exists()){await new Promise(resolve=>setTimeout(resolve,1200));snapshot=await getDoc(doc(db,'players',user.uid));if(!snapshot.exists()){say('Conta ainda não preparada. Clique em Sair e entre novamente.');return}}if(auth.currentUser?.uid!==user.uid)return;const data=snapshot.data();username=data.username||user.email.split('@')[0];resetVersion=data.resetVersion||0;window.setTargetState({...initial(),...(data.state||{}),name:username});loaded=true;window.cloudReady=true;gate.hidden=true;const status=document.getElementById('authStatus');if(status)status.textContent='☁️ Conectado: '+username;window.targetToast?.('☁️ Bem-vindo, '+username+'!');unsubPlayer=onSnapshot(doc(db,'players',user.uid),snap=>{if(!snap.exists()||!loaded)return;const next=snap.data();if((next.resetVersion||0)!==resetVersion){resetVersion=next.resetVersion||0;clearTimeout(saveTimer);window.setTargetState({...initial(),...(next.state||{}),name:username});window.targetToast?.('♻️ Seu progresso foi atualizado pelo ADMIN.')}})}catch(e){say('Falha ao carregar: '+(e.code||e.message))}});
window.addEventListener('pagehide',()=>{if(loaded&&uid&&!saving)saveNow()});
