
(function(){
  'use strict';

  /* 主题 */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('bondbook-theme'); } catch(e){}
  if (saved) root.setAttribute('data-theme', saved);
  var tt = document.getElementById('themeToggle');
  if (tt) tt.addEventListener('click', function(){
    var cur = root.getAttribute('data-theme');
    var isDark = cur === 'dark' || (!cur && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('bondbook-theme', next); } catch(e){}
  });

  /* 侧栏开关（移动端） */
  var sb = document.getElementById('sidebar');
  var tg = document.getElementById('tocToggle');
  if (tg && sb) {
    tg.addEventListener('click', function(e){ e.stopPropagation(); sb.classList.toggle('open'); });
    document.addEventListener('click', function(e){
      if (sb.classList.contains('open') && !sb.contains(e.target) && e.target !== tg) sb.classList.remove('open');
    });
  }

  /* 阅读进度 + 回到顶部 */
  var bar = document.getElementById('progress');
  var bt = document.getElementById('backTop');
  function onScroll(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (bar) bar.style.width = p + '%';
    if (bt) bt.classList.toggle('show', h.scrollTop > 500);
    highlight();
  }
  if (bt) bt.addEventListener('click', function(e){ e.preventDefault(); window.scrollTo({top:0, behavior:'smooth'}); });

  /* 当前小节高亮 */
  var subs = Array.prototype.slice.call(document.querySelectorAll('.toc-sublink'));
  var targets = subs.map(function(a){ return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
  function highlight(){
    if (!subs.length) return;
    var best = -1;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t && t.getBoundingClientRect().top <= 120) best = i;
    }
    subs.forEach(function(a, i){ a.classList.toggle('active', i === best); });
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  /* 侧栏自动滚到当前章（34 章时必要） */
  var act = document.querySelector('.toc-link.active');
  if (act && toc0()) {
    var box = toc0();
    var top = act.offsetTop - box.clientHeight / 3;
    if (top > 0) box.scrollTop = top;
  }
  function toc0(){ return document.getElementById('toc'); }

  /* 侧栏搜索：章节 + 全书小节 */
  var input = document.getElementById('tocSearch');
  var toc = document.getElementById('toc');
  var index = window.__SEARCH_INDEX__ || [];
  var original = toc ? toc.innerHTML : '';
  if (input && toc) {
    var timer;
    input.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(function(){
        var q = input.value.trim().toLowerCase();
        if (!q) { toc.innerHTML = original; rebind(); return; }
        var hits = index.filter(function(it){
          return it.t.toLowerCase().indexOf(q) >= 0 || it.c.toLowerCase().indexOf(q) >= 0;
        }).slice(0, 60);
        if (!hits.length) {
          toc.innerHTML = '<div class="toc-part-label">没有匹配：' + esc(q) + '</div>';
          return;
        }
        var html = '<div class="toc-part"><div class="toc-part-label">' + hits.length + ' 条结果</div>';
        hits.forEach(function(it){
          html += '<a class="toc-link" href="' + it.u + '">' +
            '<span class="toc-num">' + (it.k === 'ch' ? '章' : '§') + '</span>' +
            '<span class="toc-text">' + esc(it.t) +
            (it.k === 'h' ? '<br><span style="font-size:10.5px;opacity:.6">' + esc(it.c) + '</span>' : '') +
            '</span></a>';
        });
        toc.innerHTML = html + '</div>';
      }, 120);
    });
    input.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { input.value = ''; toc.innerHTML = original; rebind(); input.blur(); }
    });
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function rebind(){
    subs = Array.prototype.slice.call(document.querySelectorAll('.toc-sublink'));
    targets = subs.map(function(a){ return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
    highlight();
  }

  /* 键盘翻页 */
  document.addEventListener('keydown', function(e){
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === '/') { e.preventDefault(); if (input) input.focus(); return; }
    var sel = e.key === 'ArrowLeft' ? '.cn-prev' : e.key === 'ArrowRight' ? '.cn-next' : null;
    if (!sel) return;
    var a = document.querySelector(sel);
    if (a) location.href = a.getAttribute('href');
  });

  /* Mermaid：有网则渲染，无网保留源码 */
  if (document.querySelector('.mermaid')) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.onload = function(){
      try {
        var dark = root.getAttribute('data-theme') === 'dark' ||
          (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        window.mermaid.initialize({ startOnLoad:false, theme: dark ? 'dark' : 'neutral' });
        window.mermaid.run({ querySelector:'.mermaid' }).then(function(){
          document.querySelectorAll('.mermaid-wrap').forEach(function(w){ w.classList.add('rendered'); });
        });
      } catch(e){}
    };
    document.head.appendChild(s);
  }
})();
