import {firebaseConfig} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,updateDoc,onSnapshot,collection,query,orderBy,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const gate=document.getElementById('loginGate'),notice=document.getElementById('loginError'),nameInput=document.getElementById('loginUsername'),passInput=document.getElementById('loginPassword');
const enter=document.getElementById('loginEnter'),create=document.getElementById('loginCreate');
let adminPetUnsubscribe=null;onAuthStateChanged(auth,user=>{if(adminPetUnsubscribe){adminPetUnsubscribe();adminPetUnsubscribe=null;}window.adminPetAuthorized=false;if(user){adminPetUnsubscribe=onSnapshot(doc(db,'adminPets',user.uid),snap=>{window.adminPetAuthorized=snap.exists()&&snap.data()?.enabled===true;window.dispatchEvent(new Event('admin-pet-changed'))},err=>console.warn('Pet ADMIN:',err));}});
const initial=()=>({name:'Jogador',money:0,rebirth:0,hits:0,combo:0,level:1,xp:0,totalxp:0,weapon:0,world:0,upgrades:{power:0,luck:0,xp:0,pet:0},pets:[],equipped:[],achieved:[],claimed:[],finalClaimed:false,mutations:[],settings:{sound:true},ownedWorlds:[0],ownedWeapons:[0]});
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
 unsubRank?.();el.replaceChildren();
 const loading=document.createElement('p');loading.className='rank-loading';loading.textContent='Carregando os 100 melhores jogadores...';el.append(loading);
 // Lê os jogadores e ordena no navegador para obter os 100 melhores de verdade.
 // Critério: mais renascimentos, com moedas como desempate.
 // Futuramente, para muitos milhares de jogadores, use um ranking público separado.
 unsubRank=onSnapshot(collection(db,'players'),snap=>{
  const val=v=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,n):0};
  const players=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.state&&typeof p.state==='object');
  players.sort((a,b)=>val(b.state.rebirth)-val(a.state.rebirth)||val(b.state.money)-val(a.state.money)||(a.username||'').localeCompare(b.username||''));
  el.replaceChildren();
  const heading=document.createElement('div');heading.className='rank-head';heading.textContent='TOP 100 · RANKING GLOBAL';el.append(heading);
  const subtitle=document.createElement('p');subtitle.className='rank-subtitle';subtitle.textContent='Classificação por renascimentos. Dinheiro desempata.';el.append(subtitle);
  if(!players.length){const p=document.createElement('p');p.textContent='Ainda não há jogadores no ranking.';el.append(p);return;}
  const top=players.slice(0,100);
  const format=n=>val(n).toLocaleString('pt-BR',{maximumFractionDigits:0});
  const podium=document.createElement('div');podium.className='rank-podium';
  // Ordem visual: segundo, primeiro, terceiro.
  [1,0,2].forEach(i=>{
    const p=top[i];if(!p)return;
    const spot=document.createElement('div');spot.className='rank-podium-spot rank-place-'+(i+1)+(p.id===uid?' rank-me':'');
    const medal=document.createElement('div');medal.className='rank-medal';medal.textContent=['🥇','🥈','🥉'][i];
    const name=document.createElement('strong');name.className='rank-podium-name';name.textContent=p.username||'Jogador';
    const stats=document.createElement('div');stats.className='rank-podium-stats';stats.textContent=`🔄 ${format(p.state.rebirth)} renascimentos`;
    const coins=document.createElement('div');coins.className='rank-podium-coins';coins.textContent=`💰 ${format(p.state.money)} moedas`;
    const stand=document.createElement('div');stand.className='rank-podium-base';stand.textContent=(i+1)+'º LUGAR';
    spot.append(medal,name,stats,coins,stand);podium.append(spot);window.targetBadgeFor?.(p.id,name);
  });el.append(podium);
  const list=document.createElement('div');list.className='rank-list';
  top.forEach((p,i)=>{
   const row=document.createElement('div');row.className='rank-row'+(p.id===uid?' rank-me':'')+(i<3?' rank-top-row':'');
   const pos=document.createElement('span');pos.className='rank-position';pos.textContent=`${i+1}º`;
   const name=document.createElement('span');name.className='rank-name';name.textContent=p.username||'Jogador';
   const numbers=document.createElement('div');numbers.className='rank-numbers';
   const reb=document.createElement('span');reb.textContent=`🔄 ${format(p.state.rebirth)} renascimentos`;
   const money=document.createElement('span');money.textContent=`💰 ${format(p.state.money)} moedas`;
   numbers.append(reb,money);row.append(pos,name,numbers);list.append(row);window.targetBadgeFor?.(p.id,name);
  });el.append(list);
  const foot=document.createElement('p');foot.className='rank-disclaimer';foot.textContent=`Mostrando ${top.length} de ${players.length} jogadores. Os valores são salvos pelo navegador e ainda não têm proteção completa contra trapaças.`;el.append(foot);
 },e=>{el.textContent='Ranking indisponível ('+(e.code||'erro')+'). Confira as permissões de leitura de players no Firebase.';console.error('Ranking Firestore',e)});
};
async function login(signup){const name=nameInput.value.trim(),password=passInput.value;if(!valid(name))return say('Use de 3 a 20 letras, números ou _.');if(password.length<6)return say('Senha com pelo menos 6 caracteres.');buttons(true);say('Aguarde...');try{if(signup){const result=await createUserWithEmailAndPassword(auth,email(name),password);await setDoc(doc(db,'players',result.user.uid),{username:name,usernameLower:normalized(name),state:{...initial(),name},resetVersion:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});}else await signInWithEmailAndPassword(auth,email(name),password);say('Carregando sua conta...')}catch(e){say(({'auth/email-already-in-use':'Esse nome já está em uso.','auth/invalid-credential':'Nome ou senha incorretos.','auth/weak-password':'Senha fraca.','permission-denied':'Firestore bloqueou o cadastro. Publique as regras do ZIP.'})[e.code]||'Erro: '+(e.code||e.message))}finally{buttons(false)}}
enter.onclick=()=>login(false);create.onclick=()=>login(true);passInput.addEventListener('keydown',e=>{if(e.key==='Enter')login(false)});
onAuthStateChanged(auth,async user=>{clearTimeout(saveTimer);unsubPlayer?.();unsubPlayer=null;unsubRank?.();unsubRank=null;loaded=false;uid=user?.uid||null;window.cloudReady=false;gate.hidden=false;if(!user){window.setTargetState(initial());say('Entre ou crie uma conta para jogar.');return}say('☁️ Carregando progresso...');try{let snapshot=await getDoc(doc(db,'players',user.uid));if(!snapshot.exists()){await new Promise(resolve=>setTimeout(resolve,1200));snapshot=await getDoc(doc(db,'players',user.uid));if(!snapshot.exists()){say('Conta ainda não preparada. Clique em Sair e entre novamente.');return}}if(auth.currentUser?.uid!==user.uid)return;const data=snapshot.data();username=data.username||user.email.split('@')[0];resetVersion=data.resetVersion||0;window.setTargetState({...initial(),...(data.state||{}),name:username});loaded=true;window.cloudReady=true;window.currentTargetUid=user.uid;gate.hidden=true;const status=document.getElementById('authStatus');if(status)status.textContent='☁️ Conectado: '+username;window.targetToast?.('☁️ Bem-vindo, '+username+'!');unsubPlayer=onSnapshot(doc(db,'players',user.uid),snap=>{if(!snap.exists()||!loaded)return;const next=snap.data();if((next.resetVersion||0)!==resetVersion){resetVersion=next.resetVersion||0;clearTimeout(saveTimer);window.setTargetState({...initial(),...(next.state||{}),name:username});window.targetToast?.('♻️ Seu progresso foi atualizado pelo ADMIN.')}})}catch(e){say('Falha ao carregar: '+(e.code||e.message))}});
window.addEventListener('pagehide',()=>{if(loaded&&uid&&!saving)saveNow()});
