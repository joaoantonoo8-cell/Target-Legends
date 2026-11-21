import {firebaseConfig} from './firebase-config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,query,where,getDocs,getDoc,doc,setDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp,writeBatch,orderBy,limit,addDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let uid=null, name='', handle='', relationships=[],online=new Map(),lastSeenShots=new Map(),unsubRelations=null,unsubPresence=[],ticker=null,lastShot=0,firstConnection=true,unsubRoom=null,unsubChat=null,roomPlayers=new Map(),chatWorld=-1,lastPingAt=0;
const $=id=>document.getElementById(id);
const safeName=s=>String(s||'Jogador').slice(0,20);const handleRegex=/^[a-z0-9_]{3,20}$/;const worldNames=['Jardins de Âmbar','Baía dos Sinos','Cúpulas de Vitra','Arquipélago Suspenso','Observatório de Auralis'];
const isOnline=p=>p&&p.lastSeen?.toMillis&&Date.now()-p.lastSeen.toMillis()<80000;
const accepted=()=>relationships.filter(r=>r.status==='accepted');
const friendId=(a,b)=>[a,b].sort().join('_');
const friendUid=r=>r.members.find(x=>x!==uid);
function refreshBonus(){const n=accepted().filter(r=>{let p=online.get(friendUid(r));return isOnline(p)&&p.world===window.getSocialWorld?.()}).length;window.friendBonus=Math.min(5,n);window.socialState={friends:accepted().map(r=>friendUid(r)),online:[...online.values()].filter(isOnline)};renderGuns();}
function renderGuns(){
 const holder=$('friendGuns');if(!holder)return;holder.replaceChildren();
 const visible=[...roomPlayers.entries()].filter(([id,p])=>id!==uid&&isOnline(p)&&p.world===window.getSocialWorld?.()).slice(0,20);
 visible.forEach(([id,p],i)=>{const obj=document.createElement('div');obj.className='friend-avatar';obj.style.left=(8+(i%10)*9.3)+'%';obj.style.bottom=(8+Math.floor(i/10)*18)+'%';obj.title='Jogador conectado';const label=document.createElement('strong');label.textContent=safeName(p.username);const img=document.createElement('img');img.src='assets/gun-'+Math.max(0,Math.min(9,Number(p.weapon)||0))+'.png';img.alt='Arma de '+safeName(p.username);obj.append(label,img);holder.append(obj);});
 const count=$('roomCount');if(count)count.textContent='Mundo online: '+(visible.length+1)+' jogador(es)';
}
function subscribeRoom(){
 unsubRoom?.();unsubRoom=null;roomPlayers.clear();if(!uid)return;
 const w=Number(window.getSocialWorld?.()||0);
 unsubRoom=onSnapshot(query(collection(db,'presence'),where('world','==',w)),snap=>{
  const next=new Map();snap.docs.forEach(d=>{const p=d.data();if(!isOnline(p))return;next.set(d.id,p);if(d.id!==uid){const stamp=p.shotAt?.toMillis?.()||0,prev=lastSeenShots.get(d.id)||0;if(prev&&stamp>prev&&Date.now()-stamp<3500)showFriendShot(p);lastSeenShots.set(d.id,stamp)}});roomPlayers=next;renderGuns();refreshBonus();
 },e=>{const status=$('roomCount');if(status)status.textContent='Sala indisponível: '+(e.code||'erro');console.warn('Sala online:',e)});
 subscribeChat(w);
}
function subscribeChat(w){unsubChat?.();unsubChat=null;chatWorld=w;const chat=$('roomChatMessages');if(chat)chat.textContent='Carregando conversa...';
 unsubChat=onSnapshot(query(collection(db,'roomMessages'),where('world','==',w)),snap=>{if(chatWorld!==w)return;const root=$('roomChatMessages');if(!root)return;root.replaceChildren();const msgs=[...snap.docs].sort((a,b)=>(a.data().sentAt?.toMillis?.()||0)-(b.data().sentAt?.toMillis?.()||0)).slice(-35);if(!msgs.length){root.textContent='Seja o primeiro a falar neste mundo.';return;}msgs.forEach(d=>{const m=d.data(),line=document.createElement('div');line.className='room-message';const who=document.createElement('b');who.textContent=safeName(m.username)+': ';line.append(who,document.createTextNode(String(m.text||'').slice(0,180)));root.append(line)});root.scrollTop=root.scrollHeight},e=>{const root=$('roomChatMessages');if(root)root.textContent='Chat indisponível: '+e.code;console.warn('Chat:',e)});
}
async function sendRoomMessage(){const input=$('roomChatInput'),button=$('roomChatSend');if(!input||!uid)return;const text=input.value.trim();if(!text||text.length>180)return;button.disabled=true;try{await addDoc(collection(db,'roomMessages'),{uid,username:safeName(handle?'@'+handle:name),world:window.getSocialWorld?.()||0,text,sentAt:serverTimestamp()});input.value=''}catch(e){window.targetToast?.('Chat: '+(e.code||e.message))}finally{button.disabled=false}}
window.openRoomPanel=()=>{const p=$('roomPanel');if(p)p.classList.remove('hidden')};window.closeRoomPanel=()=>{$('roomPanel')?.classList.add('hidden')};window.sendRoomMessage=sendRoomMessage;
function showFriendShot(p){if(p.world!==window.getSocialWorld?.())return;const ar=$('arena');if(!ar)return;const dot=document.createElement('span');dot.className='friend-shot';dot.style.left=(Math.max(0,Math.min(1,Number(p.x)||.5))*100)+'%';dot.style.top=(Math.max(0,Math.min(1,Number(p.y)||.5))*100)+'%';ar.append(dot);setTimeout(()=>dot.remove(),700)}
function subscribePresence(){unsubPresence.forEach(fn=>fn());unsubPresence=[];online.clear();accepted().slice(0,35).forEach(r=>{const other=friendUid(r);unsubPresence.push(onSnapshot(doc(db,'presence',other),snap=>{if(snap.exists()){const data=snap.data(),stamp=data.shotAt?.toMillis?.()||0,prev=lastSeenShots.get(other)||0;if(prev&&stamp>prev&&Date.now()-stamp<3500)showFriendShot(data);lastSeenShots.set(other,stamp);online.set(other,data)}else online.delete(other);refreshBonus();if($('friendsPanel'))renderPanel()},err=>console.warn('Presença:',err.code)));});refreshBonus();}
async function ping(x=null,y=null){if(!uid||!window.cloudReady)return;const data={username:safeName(handle?'@'+handle:name),world:window.getSocialWorld?.()||0,weapon:window.getSocialWeapon?.()||0,lastSeen:serverTimestamp()};if(x!==null){data.x=Math.max(0,Math.min(1,Number(x)||0));data.y=Math.max(0,Math.min(1,Number(y)||0));data.shotAt=serverTimestamp();}try{await setDoc(doc(db,'presence',uid),data,{merge:true})}catch(e){console.warn('Presença não salva:',e.code)}}
window.socialShot=(x,y)=>{const now=Date.now();if(now-lastShot<950)return;lastShot=now;ping(x,y)};
async function claimHandle(){
 const input=$('handleInput'),msg=$('handleStatus');if(!input||!uid||handle)return;
 const desired=input.value.trim().replace(/^@/,'').toLowerCase();
 if(!handleRegex.test(desired)){msg.textContent='Use de 3 a 20 letras minúsculas, números ou _. ';return;}
 msg.textContent='Reservando @'+desired+'...';
 try{
  const me=doc(db,'players',uid),reserve=doc(db,'handles',desired),batch=writeBatch(db);
  batch.set(reserve,{uid,createdAt:serverTimestamp()});batch.update(me,{handle:desired,updatedAt:serverTimestamp()});
  await batch.commit();handle=desired;msg.textContent='Seu ID é @'+desired;renderHandleProfile();renderPanel();ping();
 }catch(e){msg.textContent=e.code==='permission-denied'||e.code==='already-exists'?'Esse ID já foi escolhido ou seu cadastro precisa das novas regras.':('Erro: '+(e.code||e.message));}
}
window.renderHandleProfile=renderHandleProfile;
function renderHandleProfile(){
 const root=$('handleProfile');if(!root)return;root.replaceChildren();
 const title=document.createElement('strong');title.textContent='Seu ID único no Target Legends';root.append(title);
 const desc=document.createElement('p');desc.className='small';desc.textContent=handle?'Seu ID: @'+handle+' · Esse ID fica reservado para você.':'Escolha um ID único para os outros te encontrarem. Ele é diferente do login e não poderá ser alterado depois.';root.append(desc);
 if(!handle){const input=document.createElement('input');input.id='handleInput';input.placeholder='Ex.: joao_legend';input.maxLength=20;const btn=document.createElement('button');btn.textContent='Criar ID';btn.onclick=claimHandle;root.append(input,btn)}
 const msg=document.createElement('p');msg.id='handleStatus';msg.className='small';root.append(msg);
}
window.socialWorldChanged=()=>{ping();subscribeRoom();refreshBonus();renderPanel()};
async function addFriend(){
 const input=$('findFriend'),status=$('friendSearchStatus');if(!input||!uid)return;
 const wanted=input.value.trim().replace(/^@/,'').toLowerCase();
 if(!handleRegex.test(wanted)){status.textContent='Digite o @ID exato do amigo.';return;}
 status.textContent='Procurando @'+wanted+'...';
 try{
  const reserved=await getDoc(doc(db,'handles',wanted));
  if(!reserved.exists()){status.textContent='ID não encontrado. O amigo precisa criar o ID no Perfil.';return;}
  const otherUid=reserved.data().uid;
  if(otherUid===uid){status.textContent='Você não pode adicionar a si mesmo.';return;}
  const other=await getDoc(doc(db,'players',otherUid));
  if(!other.exists()){status.textContent='Conta do jogador indisponível.';return;}
  const id=friendId(uid,otherUid);
  if(relationships.some(r=>r.id===id)){status.textContent='Já existe um pedido ou amizade.';return;}
  await setDoc(doc(db,'friendships',id),{members:[uid,otherUid].sort(),sender:uid,receiver:otherUid,status:'pending',senderName:handle?'@'+handle:name,receiverName:'@'+wanted,createdAt:serverTimestamp()});
  status.textContent='Pedido enviado para @'+wanted+'!';
 }catch(e){status.textContent='Erro: '+(e.code||e.message)}
}

async function accept(id){try{await updateDoc(doc(db,'friendships',id),{status:'accepted',acceptedAt:serverTimestamp()})}catch(e){window.targetToast?.('Erro ao aceitar: '+e.code)}}
async function remove(id){if(!confirm('Remover este pedido ou amizade?'))return;try{await deleteDoc(doc(db,'friendships',id))}catch(e){window.targetToast?.('Erro: '+e.code)}}
window.renderSocialPanel=renderPanel;
function renderPanel(){const root=$('friendsPanel');if(!root)return;root.replaceChildren();const intro=document.createElement('p');intro.textContent='Cada amigo online no mesmo mundo dá +100% de moedas, até +500% (5 amigos). As armas e nomes aparecem na arena.';root.append(intro);const bonus=document.createElement('div');bonus.className='friend-brief';bonus.textContent='Bônus de amizade atual: +'+((window.friendBonus||0)*100)+'%';root.append(bonus);
const search=document.createElement('div');search.className='friend-row';const input=document.createElement('input');input.id='findFriend';input.placeholder='@ID único do jogador';input.maxLength=20;const btn=document.createElement('button');btn.textContent='Enviar pedido';btn.onclick=addFriend;search.append(input,btn);root.append(search);const stat=document.createElement('p');stat.id='friendSearchStatus';stat.className='small';root.append(stat);
const title=document.createElement('h3');title.textContent='Pedidos e amigos ('+relationships.length+')';root.append(title);
if(!relationships.length){const p=document.createElement('p');p.textContent='Ainda não há amigos. Peça o @ID de alguém!';root.append(p)}
relationships.forEach(r=>{const other=friendUid(r),isIncoming=r.receiver===uid,p=online.get(other);const card=document.createElement('div');card.className='friend-card';const info=document.createElement('div');const n=document.createElement('b');n.textContent=safeName(r.sender===uid?r.receiverName:r.senderName);const desc=document.createElement('div');desc.className='small';desc.textContent=r.status==='accepted'?(isOnline(p)?'Online · '+(worldNames[p.world]||'Mundo desconhecido')+(p.world===window.getSocialWorld?.()?' · Juntos':''):'Offline'):(isIncoming?'Pedido recebido':'Pedido enviado');info.append(n,desc);window.targetBadgeFor?.(other,n);const actions=document.createElement('div');if(r.status==='accepted'&&isOnline(p)){const join=document.createElement('button');join.className='friend-join';join.textContent=p.world===window.getSocialWorld?.()?'Mesmo mundo':'Entrar no mundo';join.disabled=p.world===window.getSocialWorld?.();join.onclick=()=>window.socialJoinWorld?.(p.world);actions.append(join)}if(r.status==='pending'&&isIncoming){const yes=document.createElement('button');yes.textContent='Aceitar';yes.onclick=()=>accept(r.id);actions.append(yes)}const no=document.createElement('button');no.textContent=r.status==='pending'?'Cancelar':'Remover';no.onclick=()=>remove(r.id);actions.append(no);card.append(info,actions);root.append(card)})}
onAuthStateChanged(auth,user=>{unsubRelations?.();unsubRelations=null;unsubRoom?.();unsubRoom=null;unsubChat?.();unsubChat=null;roomPlayers.clear();unsubPresence.forEach(f=>f());unsubPresence=[];online.clear();relationships=[];window.friendBonus=0;clearInterval(ticker);uid=user?.uid||null;if(!user){renderGuns();$('roomCount')&&($('roomCount').textContent='Entre para jogar online');return;}name=user.email?.split('@')[0]||'Jogador';handle='';getDoc(doc(db,'players',uid)).then(snap=>{if(auth.currentUser?.uid!==uid)return;name=snap.data()?.username||name;handle=snap.data()?.handle||'';renderHandleProfile();ping();subscribeRoom();}).catch(console.warn);firstConnection=true;unsubRelations=onSnapshot(query(collection(db,'friendships'),where('members','array-contains',uid)),snap=>{relationships=snap.docs.map(d=>({id:d.id,...d.data()}));subscribePresence();renderPanel()},e=>{console.warn('Amigos:',e);window.targetToast?.('Amigos: '+e.code)});ticker=setInterval(()=>{ping();refreshBonus()},25000);setTimeout(()=>{ping();subscribeRoom()},1600)});

window.addEventListener('beforeunload',()=>{unsubRoom?.();unsubChat?.();});
