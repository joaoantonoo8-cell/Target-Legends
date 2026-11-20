import { firebaseConfig } from './firebase-config.js';
const gate=document.getElementById('loginGate');
const notice=document.getElementById('loginError');
const nameInput=document.getElementById('loginUsername');
const passInput=document.getElementById('loginPassword');
const enter=document.getElementById('loginEnter');
const create=document.getElementById('loginCreate');
let auth, db, currentUser=null, saveTimer, loading=false, sessionId=0;
const say=(message)=>{notice.textContent=message};
const buttons=(busy)=>{enter.disabled=busy;create.disabled=busy};
const normalize=(value)=>value.trim().toLowerCase();
const valid=(value)=>/^[a-zA-Z0-9_]{3,20}$/.test(value);
// Email técnico interno para Firebase Auth. Não é um e-mail de contato.
const internalEmail=(username)=>`${normalize(username)}@players.ultimate-target.example.com`;
const initial=()=>({name:'Jogador',money:0,rebirth:0,hits:0,combo:0,level:1,xp:0,totalxp:0,weapon:0,world:0,upgrades:{power:0,luck:0,xp:0,pet:0},pets:[],equipped:[],achieved:[],claimed:[],finalClaimed:false,mutations:[],settings:{sound:true}});
window.cloudSave=()=>{};
window.cloudRanking=()=>{const el=document.getElementById('onlineRanking');if(el)el.textContent='🏆 Ranking global em preparação: será liberado quando a pontuação for validada no servidor.'};
window.cloudLogout=async()=>{if(auth)await auth.signOut()};
try{
  if(!firebaseConfig.apiKey || firebaseConfig.apiKey==='COLE_AQUI')throw new Error('Preencha firebase-config.js.');
  const [{initializeApp},{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut},{getFirestore,doc,getDoc,setDoc,serverTimestamp}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
  ]);
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app);db=getFirestore(app);
  const login=async(signup)=>{
    const username=nameInput.value.trim(),password=passInput.value;
    if(!valid(username))return say('Use de 3 a 20 letras, números ou _.');
    if(password.length<6)return say('A senha precisa ter pelo menos 6 caracteres.');
    buttons(true);say('Aguarde...');
    try{
      if(signup){
        const result=await createUserWithEmailAndPassword(auth,internalEmail(username),password);
        // O estado inicial é criado somente para a conta recém-registrada.
        const state=initial();state.name=username;
        await setDoc(doc(db,'players',result.user.uid),{state,username,updatedAt:serverTimestamp()});
      }else await signInWithEmailAndPassword(auth,internalEmail(username),password);
      say('Carregando sua conta...');
    }catch(e){
      const errors={'auth/email-already-in-use':'Esse nome já está em uso. Escolha outro.','auth/invalid-credential':'Nome de usuário ou senha incorretos.','auth/weak-password':'Escolha uma senha mais forte.','auth/network-request-failed':'Sem conexão. Confira sua internet.','permission-denied':'O Firestore bloqueou o salvamento. Confira as regras.'};
      say(errors[e.code]||`Erro: ${e.code||e.message}`);
    }finally{buttons(false)}
  };
  enter.onclick=()=>login(false);create.onclick=()=>login(true);
  passInput.addEventListener('keydown',e=>{if(e.key==='Enter')login(false)});
  window.cloudSave=(state)=>{
    if(!currentUser||loading||!window.cloudReady)return;
    const uid=currentUser.uid,token=sessionId,snapshot=JSON.parse(JSON.stringify(state));
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      if(!currentUser||currentUser.uid!==uid||sessionId!==token)return;
      try{await setDoc(doc(db,'players',uid),{state:snapshot,username:snapshot.name,updatedAt:serverTimestamp()})}
      catch(e){window.targetToast?.('Não foi possível salvar na nuvem: '+e.code)}
    },900);
  };
  onAuthStateChanged(auth,async(user)=>{
    clearTimeout(saveTimer);const token=++sessionId;
    currentUser=user;window.cloudReady=false;gate.hidden=false;
    if(!user){window.setTargetState(initial());say('Entre ou crie sua conta para jogar.');return}
    loading=true;say('☁️ Carregando progresso...');
    try{
      const snapshot=await getDoc(doc(db,'players',user.uid));
      if(sessionId!==token)return;
      if(!snapshot.exists()){
        // Se a conta Auth existir sem documento, nunca usar save de outra pessoa.
        const state=initial();state.name=user.email.split('@')[0];
        await setDoc(doc(db,'players',user.uid),{state,username:state.name,updatedAt:serverTimestamp()});
        window.setTargetState(state);
      }else{
        const data=snapshot.data();
        const state=data.state||initial();
        state.name=data.username||user.email.split('@')[0];
        window.setTargetState(state);
      }
      if(sessionId!==token)return;
      window.cloudReady=true;gate.hidden=true;
      const status=document.getElementById('authStatus');if(status)status.textContent='Conectado: '+window.getTargetState().name;
      window.targetToast?.('☁️ Bem-vindo, '+window.getTargetState().name+'!');
    }catch(e){say('Não foi possível carregar a conta: '+(e.code||e.message))}
    finally{loading=false}
  });
}catch(e){say('Firebase indisponível: '+e.message)}
