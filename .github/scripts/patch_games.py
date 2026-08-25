from pathlib import Path

p = Path('/tmp/index.html')
s = p.read_text(encoding='utf-8')

patch = r'''
<style id="falaGamesArenaV10Css">
#gameScreen{background:linear-gradient(180deg,rgba(245,158,11,.08),rgba(13,17,23,.98) 42%)}
#gameContentContainer{padding:18px!important;overflow-y:auto!important;justify-content:flex-start!important;align-items:stretch!important;gap:12px}
.fg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.fg-stat,.fg-card{background:rgba(255,255,255,.05);border:1px solid rgba(245,158,11,.25);border-radius:14px}.fg-stat{padding:9px;text-align:center}.fg-stat b{display:block;font-size:1rem}.fg-stat span{font-size:.62rem;color:#94a3b8}.fg-card{padding:16px;text-align:left}.fg-badge{display:inline-block;color:#fbbf24;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);padding:5px 9px;border-radius:999px;font-size:.7rem;font-weight:800}.fg-q{font-weight:750;font-size:1.05rem;line-height:1.45;margin:12px 0 14px;color:#fff}.fg-options{display:grid;gap:9px}.fg-option{min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;padding:12px;text-align:left;font-weight:650}.fg-option.correct{border-color:#22c55e;background:rgba(34,197,94,.14)}.fg-option.wrong{border-color:#ef4444;background:rgba(239,68,68,.14)}.fg-result{margin-top:10px;padding:10px;border-radius:10px;text-align:center;font-weight:700}.fg-result.correct{color:#86efac;background:rgba(34,197,94,.1)}.fg-result.wrong{color:#fca5a5;background:rgba(239,68,68,.1)}
</style>
<script id="falaGamesArenaV10Js">
(function(){
'use strict';
const $=id=>document.getElementById(id);
const pools={
'en-US':[
['Tradução para Good morning',['Boa tarde','Bom dia','Boa noite'],1],['Complete: Thank ____ very much',['you','me','he'],0],['O que significa Water?',['Água','Fogo','Terra'],0],['Tradução para How are you?',['Quem é você?','Como vai você?','Onde estás?'],1],['Complete: Where is ___ airport?',['the','a','an'],0],['O que significa Apple?',['Maçã','Banana','Carro'],0],['Tradução para I love programming',['Eu odeio jogos','Eu amo programar','Eu estudo inglês'],1],['Complete: Open ___ door please',['the','at','on'],0],['O que significa Book?',['Livro','Caneta','Mesa'],0],['Tradução para See you tomorrow',['Até logo','Até amanhã','Boa noite'],1]],
'es-ES':[['Qué significa Buenos días?',['Boa tarde','Bom dia','Boa noite'],1],['Completa: Por ________',['favor','gracias','hola'],0],['Qué significa Agua?',['Água','Comida','Fogo'],0],['Traducción de Gracias',['Por favor','Obrigado','Adeus'],1]],
'fr-FR':[['Que signifie Merci?',['Olá','Obrigado','Adeus'],1],['Traduction de Bonjour',['Bom dia','Boa noite','Tchau'],0]],
'de-DE':[['Was bedeutet Guten Morgen?',['Bom dia','Boa noite','Tchau'],0],['Bedeutung von Danke',['Por favor','Obrigado','Sim'],1]],
'it-IT':[['Cosa significa Buongiorno?',['Boa tarde','Bom dia','Adeus'],1]],
'ja-JP':[['O que significa Arigatou?',['Obrigado','Olá','Desculpa'],0]]};
const modes=['Quiz','Desafio rápido','Memória','Acerte de primeira','Sequência XP','Relâmpago'];
let num=0,xp=0,streak=0,current=null,locked=false;
function lang(){return $('globalLang')?.value||window.currentLang||'en-US'}
function ensure(){let g=$('gameScreen');if(!g){g=document.createElement('div');g.id='gameScreen';g.className='screen';g.innerHTML='<header><button class="back-btn" onclick="goToHome()">←</button><span id="gameHeaderTitle" style="font-weight:700;color:#f59e0b">🎮 Arena de Mini-Games (50+)</span><div style="width:36px"></div></header><div class="lesson-content" id="gameContentContainer"></div><footer><button class="action-btn" onclick="generateNewGameChallenge()" style="background:linear-gradient(135deg,#f59e0b,#d97706)">Próximo Mini-Jogo ⚡</button></footer>';document.querySelector('.app-container')?.appendChild(g)}return g}
function pick(){const pool=pools[lang()]||pools['en-US'];const q=pool[Math.floor(Math.random()*pool.length)];return [modes[(num-1)%modes.length]+': '+q[0],q[1],q[2]]}
window.startAIGame=function(){const g=ensure();document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));g.classList.add('active');num=0;xp=0;streak=0;window.generateNewGameChallenge()};
window.generateNewGameChallenge=function(){ensure();const c=$('gameContentContainer');if(!c)return;locked=false;num++;current=pick();if($('gameHeaderTitle'))$('gameHeaderTitle').textContent='🎮 Mini-Game #'+num+' • Arena 50+';c.innerHTML='<div class="fg-stats"><div class="fg-stat"><b>'+num+'</b><span>JOGO</span></div><div class="fg-stat"><b>'+xp+'</b><span>XP</span></div><div class="fg-stat"><b>'+streak+'</b><span>SEQUÊNCIA</span></div></div><div class="fg-card"><span class="fg-badge">DESAFIO IA</span><div class="fg-q"></div><div class="fg-options"></div><div id="fgResult"></div></div>';c.querySelector('.fg-q').textContent=current[0];const box=c.querySelector('.fg-options');current[1].forEach((t,i)=>{const b=document.createElement('button');b.className='fg-option';b.textContent=t;b.onclick=()=>window.checkGameAnswer(i,current[2]);box.appendChild(b)})};
window.checkGameAnswer=function(sel,correct){if(locked)return;locked=true;const bs=[...document.querySelectorAll('.fg-option')];bs.forEach((b,i)=>{if(i===correct)b.classList.add('correct');if(i===sel&&sel!==correct)b.classList.add('wrong');b.disabled=true});const r=$('fgResult');if(sel===correct){xp+=15;streak++;r.className='fg-result correct';r.textContent='🎉 Resposta correta! +15 XP'}else{streak=0;r.className='fg-result wrong';r.textContent='❌ Resposta incorreta. A correta ficou destacada.'}};
ensure();
})();
</script>
'''

if 'falaGamesArenaV10Js' not in s:
    s = s.replace('</body>', patch + '\n</body>', 1)

p.write_text(s, encoding='utf-8')
