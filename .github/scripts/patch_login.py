from pathlib import Path

p = Path('/tmp/index.html')
s = p.read_text(encoding='utf-8')

patch = r'''
<style id="falaLoginV11Css">
#loginScreen{position:absolute;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:22px;background:radial-gradient(circle at 50% 12%,rgba(59,130,246,.22),transparent 36%),linear-gradient(180deg,#0a1020,#090d16 68%);overflow:auto}
#loginScreen.hidden{display:none}.fl-card{width:100%;max-width:360px;background:rgba(15,23,42,.78);border:1px solid rgba(255,255,255,.11);border-radius:26px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 35px rgba(59,130,246,.12);backdrop-filter:blur(18px)}
.fl-brand{text-align:center;margin-bottom:20px}.fl-logo{width:74px;height:74px;margin:0 auto 10px;border-radius:20px;display:grid;place-items:center;font-size:34px;background:linear-gradient(135deg,#2563eb,#7c3aed);box-shadow:0 10px 28px rgba(59,130,246,.35)}.fl-brand h1{font-size:1.55rem}.fl-brand p{color:#94a3b8;font-size:.82rem;margin-top:4px}
.fl-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:5px;background:rgba(255,255,255,.05);border-radius:13px;margin-bottom:16px}.fl-tab{border:0;border-radius:10px;padding:10px;background:transparent;color:#94a3b8;font-weight:700}.fl-tab.active{background:rgba(59,130,246,.18);color:#fff}
.fl-field{margin-bottom:12px}.fl-field label{display:block;font-size:.72rem;color:#cbd5e1;margin:0 0 6px 3px;font-weight:700}.fl-input-wrap{display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:rgba(255,255,255,.045);padding:0 12px}.fl-input-wrap:focus-within{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.09)}.fl-input{width:100%;border:0;outline:0;background:transparent;color:#fff;padding:13px 2px;font-size:.92rem}.fl-eye{border:0;background:transparent;color:#94a3b8;font-size:1rem;padding:6px}.fl-actions{display:flex;justify-content:flex-end;margin:-2px 0 12px}.fl-link{border:0;background:transparent;color:#60a5fa;font-size:.75rem;font-weight:700}.fl-primary,.fl-guest{width:100%;border:0;border-radius:13px;padding:13px;font-weight:800;font-size:.9rem}.fl-primary{color:white;background:linear-gradient(135deg,#3b82f6,#7c3aed);box-shadow:0 8px 24px rgba(59,130,246,.25)}.fl-guest{margin-top:9px;color:#cbd5e1;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1)}.fl-msg{min-height:18px;margin:9px 2px 0;font-size:.74rem;text-align:center;color:#94a3b8}.fl-msg.ok{color:#86efac}.fl-msg.err{color:#fca5a5}.fl-note{text-align:center;color:#64748b;font-size:.63rem;line-height:1.4;margin-top:12px}
@media(max-width:360px){#loginScreen{padding:14px}.fl-card{padding:19px;border-radius:22px}.fl-logo{width:64px;height:64px}}
</style>
<div id="loginScreen" aria-label="Login Fala+">
  <div class="fl-card">
    <div class="fl-brand"><div class="fl-logo">🗣️</div><h1>Fala+</h1><p>Entre para continuar seu aprendizado</p></div>
    <div class="fl-tabs"><button id="flTabLogin" class="fl-tab active" type="button">Entrar</button><button id="flTabCreate" class="fl-tab" type="button">Criar conta</button></div>
    <div id="flNameField" class="fl-field" style="display:none"><label for="flName">Nome</label><div class="fl-input-wrap"><span>👤</span><input id="flName" class="fl-input" autocomplete="name" placeholder="Seu nome"></div></div>
    <div class="fl-field"><label for="flEmail">E-mail</label><div class="fl-input-wrap"><span>✉️</span><input id="flEmail" class="fl-input" type="email" inputmode="email" autocomplete="email" placeholder="voce@email.com"></div></div>
    <div class="fl-field"><label for="flPassword">Senha</label><div class="fl-input-wrap"><span>🔒</span><input id="flPassword" class="fl-input" type="password" autocomplete="current-password" placeholder="Sua senha"><button id="flEye" class="fl-eye" type="button">👁️</button></div></div>
    <div class="fl-actions"><button id="flForgot" class="fl-link" type="button">Esqueci minha senha</button></div>
    <button id="flSubmit" class="fl-primary" type="button">Entrar</button>
    <button id="flGuest" class="fl-guest" type="button">Continuar como visitante</button>
    <div id="flMsg" class="fl-msg"></div>
    <div class="fl-note">Conta local neste APK. Não reutilize uma senha importante.</div>
  </div>
</div>
<script id="falaLoginV11Js">
(function(){
'use strict';
const $=id=>document.getElementById(id), screen=$('loginScreen'); if(!screen)return;
let mode='login';
const msg=(t,c='')=>{const m=$('flMsg');m.textContent=t;m.className='fl-msg '+c};
function setMode(v){mode=v;const create=v==='create';$('flTabLogin').classList.toggle('active',!create);$('flTabCreate').classList.toggle('active',create);$('flNameField').style.display=create?'block':'none';$('flSubmit').textContent=create?'Criar conta':'Entrar';$('flPassword').autocomplete=create?'new-password':'current-password';msg('')}
function accounts(){try{return JSON.parse(localStorage.getItem('fala.accounts')||'{}')}catch(e){return {}}}
function saveAccounts(v){localStorage.setItem('fala.accounts',JSON.stringify(v))}
async function hash(v){if(window.crypto?.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=2166136261;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return String(h>>>0)}
function enter(profile){localStorage.setItem('fala.session',JSON.stringify(profile));screen.classList.add('hidden');window.falaUser=profile;window.dispatchEvent(new CustomEvent('fala:login',{detail:profile}))}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
$('flTabLogin').onclick=()=>setMode('login');$('flTabCreate').onclick=()=>setMode('create');
$('flEye').onclick=()=>{const p=$('flPassword');p.type=p.type==='password'?'text':'password'};
$('flGuest').onclick=()=>enter({name:'Visitante',email:'',guest:true});
$('flForgot').onclick=()=>msg('Nesta versão local, crie uma nova conta com outro e-mail.','');
$('flSubmit').onclick=async()=>{const email=$('flEmail').value.trim().toLowerCase(),pass=$('flPassword').value,name=$('flName').value.trim();if(!validEmail(email))return msg('Digite um e-mail válido.','err');if(pass.length<6)return msg('A senha precisa ter pelo menos 6 caracteres.','err');const a=accounts(),hp=await hash(pass);if(mode==='create'){if(!name)return msg('Digite seu nome.','err');if(a[email])return msg('Já existe uma conta com esse e-mail.','err');a[email]={name,email,password:hp};saveAccounts(a);msg('Conta criada com sucesso. Entrando...','ok');setTimeout(()=>enter({name,email,guest:false}),250)}else{if(!a[email]||a[email].password!==hp)return msg('E-mail ou senha incorretos.','err');enter({name:a[email].name,email,guest:false})}};
$('flPassword').addEventListener('keydown',e=>{if(e.key==='Enter')$('flSubmit').click()});
window.falaLogout=function(){localStorage.removeItem('fala.session');window.falaUser=null;screen.classList.remove('hidden');setMode('login');$('flPassword').value='';msg('Sessão encerrada.','ok')};
try{const sess=JSON.parse(localStorage.getItem('fala.session')||'null');if(sess&&sess.name)enter(sess)}catch(e){}
})();
</script>
'''

if 'falaLoginV11Js' not in s:
    s = s.replace('</body>', patch + '\n</body>', 1)

p.write_text(s, encoding='utf-8')
