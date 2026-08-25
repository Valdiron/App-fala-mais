from pathlib import Path

p = Path('/tmp/index.html')
s = p.read_text(encoding='utf-8')

patch = r'''
<style id="falaProfileV12Css">
#falaProfileBtn{position:absolute;right:16px;top:16px;z-index:1500;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:linear-gradient(135deg,rgba(59,130,246,.28),rgba(124,58,237,.28));color:#fff;display:grid;place-items:center;font-size:20px;box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(12px)}
#falaProfileScreen{position:absolute;inset:0;z-index:9000;display:none;flex-direction:column;background:radial-gradient(circle at 50% 0%,rgba(124,58,237,.22),transparent 34%),linear-gradient(180deg,#0a1020,#090d16 72%);color:#f8fafc;overflow:hidden}
#falaProfileScreen.active{display:flex}.fp-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.09)}.fp-head h2{font-size:1rem}.fp-close{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:18px}.fp-body{flex:1;overflow:auto;padding:20px}.fp-avatar{width:92px;height:92px;margin:6px auto 10px;border-radius:50%;display:grid;place-items:center;font-size:2rem;font-weight:900;background:linear-gradient(135deg,#2563eb,#7c3aed);border:3px solid rgba(255,255,255,.18);box-shadow:0 0 30px rgba(124,58,237,.35)}.fp-name{text-align:center;font-size:1.25rem;font-weight:800}.fp-email{text-align:center;color:#94a3b8;font-size:.78rem;margin-top:3px}.fp-badge{display:block;width:max-content;margin:9px auto 18px;padding:5px 10px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.22);color:#86efac;font-size:.68rem;font-weight:800}.fp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px}.fp-stat{padding:12px 8px;text-align:center;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09)}.fp-stat b{display:block;font-size:1.05rem}.fp-stat span{display:block;margin-top:3px;color:#94a3b8;font-size:.62rem}.fp-card{border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);padding:15px;margin-bottom:12px}.fp-card h3{font-size:.8rem;margin-bottom:12px;color:#cbd5e1}.fp-field{margin-bottom:11px}.fp-field label{display:block;color:#94a3b8;font-size:.68rem;font-weight:700;margin:0 0 5px 2px}.fp-input,.fp-select{width:100%;padding:12px;border-radius:11px;border:1px solid rgba(255,255,255,.1);outline:0;background:rgba(255,255,255,.05);color:#fff}.fp-select option{color:#111}.fp-save,.fp-logout{width:100%;padding:13px;border-radius:12px;font-weight:800;border:0}.fp-save{background:linear-gradient(135deg,#3b82f6,#7c3aed);color:#fff}.fp-logout{margin-top:9px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#fca5a5}.fp-msg{text-align:center;min-height:18px;margin-top:8px;color:#86efac;font-size:.72rem}
</style>
<button id="falaProfileBtn" type="button" aria-label="Abrir perfil">👤</button>
<div id="falaProfileScreen" aria-label="Perfil Fala+">
  <div class="fp-head"><button id="fpClose" class="fp-close" type="button">←</button><h2>Meu Perfil</h2><div style="width:36px"></div></div>
  <div class="fp-body">
    <div id="fpAvatar" class="fp-avatar">U</div><div id="fpNameTitle" class="fp-name">Usuário</div><div id="fpEmailTitle" class="fp-email"></div><span id="fpBadge" class="fp-badge">MEMBRO FALA+</span>
    <div class="fp-stats"><div class="fp-stat"><b id="fpXp">0</b><span>XP</span></div><div class="fp-stat"><b id="fpLessons">0</b><span>LIÇÕES</span></div><div class="fp-stat"><b id="fpGames">0</b><span>JOGOS</span></div></div>
    <div class="fp-card"><h3>Dados do perfil</h3><div class="fp-field"><label>Nome</label><input id="fpName" class="fp-input" maxlength="40" placeholder="Seu nome"></div><div class="fp-field"><label>E-mail</label><input id="fpEmail" class="fp-input" disabled></div><div class="fp-field"><label>Idioma preferido</label><select id="fpLang" class="fp-select"><option value="en-US">English</option><option value="pt-BR">Português</option><option value="es-ES">Español</option><option value="fr-FR">Français</option><option value="de-DE">Deutsch</option><option value="it-IT">Italiano</option><option value="ja-JP">日本語</option></select></div><button id="fpSave" class="fp-save" type="button">Salvar alterações</button><div id="fpMsg" class="fp-msg"></div></div>
    <div class="fp-card"><h3>Conta</h3><button id="fpLogout" class="fp-logout" type="button">Sair da conta</button></div>
  </div>
</div>
<script id="falaProfileV12Js">
(function(){
'use strict';
const $=id=>document.getElementById(id);const screen=$('falaProfileScreen'),btn=$('falaProfileBtn');if(!screen||!btn)return;
function session(){try{return JSON.parse(localStorage.getItem('fala.session')||'null')}catch(e){return null}}
function initials(n){return (n||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U'}
function stat(keys){for(const k of keys){const v=localStorage.getItem(k);if(v!==null&&!isNaN(Number(v)))return Number(v)}return 0}
function render(){const u=session()||window.falaUser||{name:'Visitante',email:'',guest:true};const name=u.name||'Visitante';$('fpNameTitle').textContent=name;$('fpEmailTitle').textContent=u.email||'Sessão de visitante';$('fpAvatar').textContent=initials(name);$('fpName').value=name;$('fpEmail').value=u.email||'';$('fpBadge').textContent=u.guest?'VISITANTE':'MEMBRO FALA+';$('fpXp').textContent=stat(['fala.xp','score','fala.score']);$('fpLessons').textContent=stat(['fala.lessons','lessonsCompleted']);$('fpGames').textContent=stat(['fala.games','gamesPlayed']);const gl=$('globalLang');$('fpLang').value=localStorage.getItem('fala.profile.lang')||(gl?.value||'en-US')}
function open(){render();screen.classList.add('active')}
function close(){screen.classList.remove('active')}
btn.onclick=open;$('fpClose').onclick=close;
$('fpSave').onclick=()=>{let u=session()||window.falaUser||{guest:true,email:''};const name=$('fpName').value.trim();if(!name){$('fpMsg').textContent='Digite um nome válido.';return}u.name=name;localStorage.setItem('fala.session',JSON.stringify(u));window.falaUser=u;const lang=$('fpLang').value;localStorage.setItem('fala.profile.lang',lang);const gl=$('globalLang');if(gl){gl.value=lang;if(typeof window.changeLanguage==='function')window.changeLanguage()}$('fpMsg').textContent='Perfil atualizado ✓';render();window.dispatchEvent(new CustomEvent('fala:profile-updated',{detail:u}))};
$('fpLogout').onclick=()=>{close();if(typeof window.falaLogout==='function')window.falaLogout();else{localStorage.removeItem('fala.session');location.reload()}};
window.addEventListener('fala:login',()=>{btn.style.display='grid';render()});
try{const s=session();btn.style.display=s?'grid':'none'}catch(e){btn.style.display='none'}
window.falaOpenProfile=open;
})();
</script>
'''

if 'falaProfileV12Js' not in s:
    s = s.replace('</body>', patch + '\n</body>', 1)

p.write_text(s, encoding='utf-8')
