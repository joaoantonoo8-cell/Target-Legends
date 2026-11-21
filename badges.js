import {firebaseConfig} from './firebase-config.js';
import {OWNER_UID} from './owner-uid.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,onSnapshot} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
const cache=new Map();
const LABELS={owner:['👑','DONO','badge-owner'],admin:['🛡️','ADMIN','badge-admin'],youtuber:['▶','YOUTUBER','badge-youtuber'],verified:['✔','VERIFICADO','badge-verified']};
async function fetchBadge(uid){
 if(!uid || !auth.currentUser)return null;
 if(uid===OWNER_UID)return 'owner';
 const existing=cache.get(uid);if(existing && Date.now()-existing.time<30000)return existing.value;
 try{
  const role=await getDoc(doc(db,'roles',uid));
  let value=role.data()?.admin===true?'admin':null;
  if(!value){const verified=await getDoc(doc(db,'verifications',uid));const b=verified.data()?.badge;if(b==='youtuber'||b==='verified')value=b;}
  cache.set(uid,{value,time:Date.now()});return value;
 }catch(e){console.warn('Selo:',e.code||e.message);return null;}
}
function pill(kind){const x=LABELS[kind];if(!x)return null;const span=document.createElement('span');span.className='target-verified-badge '+x[2];span.textContent=x[0]+' '+x[1];span.title='Selo concedido pelo jogo';return span;}
window.targetBadgeFor=async (uid,node)=>{
 if(!node?.isConnected)return;
 const kind=await fetchBadge(uid);
 if(!node.isConnected||!kind)return;
 node.querySelectorAll('.target-verified-badge').forEach(x=>x.remove());const b=pill(kind);if(b)node.append(b);
};
let off=[];
onAuthStateChanged(auth,user=>{
 off.forEach(f=>f());off=[];cache.clear();
 if(!user)return;
 const update=()=>{const p=document.getElementById('playerlabel');if(!p)return;window.targetBadgeFor(user.uid,p)};
 const observe=new MutationObserver(()=>{if(document.getElementById('playerlabel')){update();observe.disconnect()}});
 observe.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observe.disconnect(),3000);
 update();
 if(user.uid!==OWNER_UID){
 off.push(onSnapshot(doc(db,'roles',user.uid),()=>{cache.delete(user.uid);update()},()=>{}));
 off.push(onSnapshot(doc(db,'verifications',user.uid),()=>{cache.delete(user.uid);update()},()=>{}));
 }
});
