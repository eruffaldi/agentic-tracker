(function(){
  "use strict";
  var DATA = JSON.parse(document.getElementById('data').textContent);
  var SUPPORTED_SCHEMA_MAJOR = 1;
  var metaCode = document.querySelector('meta[name="tracker-code-version"]');
  var CODE_VERSION = metaCode ? metaCode.getAttribute('content') : 'unknown';
  function schemaOk(d){
    var v = String(d.schema_version || '');
    return parseInt(v.split('.')[0], 10) === SUPPORTED_SCHEMA_MAJOR;
  }
  function versionLine(){
    return 'code v'+CODE_VERSION+' \u00b7 data v'+(DATA.data_version||'?')+' \u00b7 schema '+(DATA.schema_version||'?');
  }
  var VC = { Anthropic:'#A8480B', OpenAI:'#0B6E63', Google:'#4838A0', 'xAI':'#8E2A55' };
  var BIG = { frontier:1, flagship:1 };
  var BENCH_ORDER = ['deepswe','tb40','tb21','swe_pro','programbench','swe_verified','tb20'];
  var state = { view:'timeline', bench:'deepswe', vendor:'all' };
  var DAY = 864e5;

  function d2n(s){ var p=s.split('-'); return Date.UTC(+p[0],+p[1]-1,+p[2]); }
  function fmtMo(n){ return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(n).getUTCMonth()]; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function shortName(n){ return String(n).replace(' / Mythos 5.1','').replace(' / Mythos 5',''); }
  function col(v){ return VC[v] || '#63707E'; }
  function host(u){ try{ return String(u).replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,''); }catch(e){ return u; } }

  function withScore(b){
    return DATA.models.filter(function(m){ return m.scores && m.scores[b] && typeof m.scores[b].value === 'number'; });
  }
  function copilotPrice(m){
    return (m.copilot && m.copilot.available && typeof m.copilot.output === 'number') ? m.copilot.output : null;
  }
  function outPrice(m){
    var cp = copilotPrice(m);
    if(cp !== null) return { v:cp, basis:'copilot' };
    if(typeof m.price_out === 'number') return { v:m.price_out, basis:'vendor' };
    return null;
  }
  function vendors(){
    var seen = [];
    DATA.models.forEach(function(m){ if(seen.indexOf(m.vendor)<0) seen.push(m.vendor); });
    return seen;
  }
  function srcById(id){ return (DATA.sources||[]).filter(function(s){ return s.id===id; })[0]; }

  /* ---------- controls ---------- */
  function buildControls(){
    var vw = document.getElementById('view-seg'); vw.innerHTML='';
    [['timeline','over time'],['copilot','price vs score']].forEach(function(v){
      var btn=document.createElement('button'); btn.textContent=v[1];
      btn.setAttribute('aria-pressed', v[0]===state.view);
      btn.onclick=function(){ state.view=v[0]; render(); };
      vw.appendChild(btn);
    });
    var bs = document.getElementById('bench-seg'); bs.innerHTML='';
    BENCH_ORDER.forEach(function(b){
      if(!DATA.benchmarks[b] || withScore(b).length < 3) return;
      var def = DATA.benchmarks[b];
      var btn=document.createElement('button');
      btn.textContent = def.name.replace('Terminal-Bench','TB').replace('SWE-bench','SWE') + (def.name.indexOf('Terminal')===0 ? ' '+def.version : '');
      btn.title = def.what_it_measures;
      btn.setAttribute('aria-pressed', b===state.bench);
      btn.onclick=function(){ state.bench=b; render(); };
      bs.appendChild(btn);
    });
    var vs = document.getElementById('vendor-seg'); vs.innerHTML='';
    ['all'].concat(vendors()).forEach(function(v){
      var btn=document.createElement('button');
      btn.textContent = v==='all' ? 'all labs' : v;
      btn.setAttribute('aria-pressed', v===state.vendor);
      btn.onclick=function(){ state.vendor=v; render(); };
      vs.appendChild(btn);
    });
  }

  /* ---------- descent matching ---------- */
  function descentPairs(b){
    var pool = withScore(b), out = [];
    pool.forEach(function(m){
      if(BIG[m.tier] || m.anchor || m.availability==='restricted') return;
      var mine = m.scores[b].value, t = d2n(m.released), best = null;
      pool.forEach(function(o){
        if(!BIG[o.tier] || o.availability==='restricted') return;
        if(d2n(o.released) >= t || o.scores[b].value > mine) return;
        if(!best || d2n(o.released) > d2n(best.released)) best = o;
      });
      if(best) out.push({ now:m, then:best, days: Math.round((t-d2n(best.released))/DAY) });
    });
    return out.sort(function(a,c){ return d2n(c.now.released)-d2n(a.now.released); });
  }

  /* ---------- point + label helpers ---------- */
  function pt(m, cx, cy, extra){
    var c = col(m.vendor), big = BIG[m.tier];
    var t = '<title>'+esc(shortName(m.name))+' \u2014 '+esc(extra)+'</title>';
    return big
      ? '<rect x="'+(cx-4.5)+'" y="'+(cy-4.5)+'" width="9" height="9" rx="1" fill="'+c+'" opacity="'+(m.availability==='restricted'?0.45:1)+'">'+t+'</rect>'
      : '<circle cx="'+cx+'" cy="'+cy+'" r="5" fill="var(--panel)" stroke="'+c+'" stroke-width="2.2">'+t+'</circle>';
  }
  function labels(items, W){
    var placed=[], s=[];
    items.slice().sort(function(a,b){ return b.v-a.v; }).forEach(function(it){
      var label = shortName(it.m.name).replace('Claude ','').replace('Gemini ','');
      var anchor = it.x > W*0.72 ? 'end' : 'start';
      var lx = anchor==='end' ? it.x-8 : it.x+8, ly = it.y+3.5;
      var tries=[0,-11,11,-22,22,-33,33];
      for(var i=0;i<tries.length;i++){
        var yy=ly+tries[i], ok=true;
        for(var j=0;j<placed.length;j++){
          if(Math.abs(placed[j].y-yy)<10 && Math.abs(placed[j].x-lx)<76){ ok=false; break; }
        }
        if(ok){ ly=yy; break; }
      }
      placed.push({x:lx,y:ly});
      s.push('<text class="plab" x="'+lx+'" y="'+ly+'" text-anchor="'+anchor+'" fill="'+col(it.m.vendor)+'">'+esc(label)+'</text>');
    });
    return s.join('');
  }

  /* ---------- chart ---------- */
  function render(){
    buildControls();
    var b = state.bench, def = DATA.benchmarks[b];
    var narrow = window.innerWidth < 620;
    var W = narrow ? 380 : 760, H = narrow ? 520 : 430;
    var L = narrow ? 30 : 36, R = narrow ? 12 : 16, T = 16, B = 40;
    var s = ['<svg id="chart" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg">'];

    var all = state.view === 'copilot'
      ? withScore(b).filter(function(m){ return copilotPrice(m) !== null; })
      : withScore(b);
    var shown = all.filter(function(m){ return state.vendor==='all' || m.vendor===state.vendor; });

    if(all.length < 2){
      s.push('<text class="axlab" x="'+L+'" y="40">Not enough models with both a '+esc(def.name)+' score and a Copilot rate.</text></svg>');
      document.getElementById('chart').outerHTML = s.join('');
      document.getElementById('caption').textContent = '';
      renderLedger(b); renderCards(b);
      return;
    }

    var ys = all.map(function(m){ return m.scores[b].value; });
    var y0 = Math.floor((Math.min.apply(null,ys)-5)/5)*5, y1 = Math.ceil((Math.max.apply(null,ys)+5)/5)*5;
    function Y(v){ return T + (1-(v-y0)/(y1-y0))*(H-T-B); }
    var step = (y1-y0) > 45 ? 10 : 5;
    for(var v=y0; v<=y1; v+=step){
      s.push('<line class="gl" x1="'+L+'" y1="'+Y(v)+'" x2="'+(W-R)+'" y2="'+Y(v)+'"/>');
      s.push('<text class="axlab" x="'+(L-6)+'" y="'+(Y(v)+3.5)+'" text-anchor="end">'+v+'</text>');
    }

    var items = [], caption, X;

    if(state.view === 'timeline'){
      var xs = all.map(function(m){ return d2n(m.released); });
      var x0 = Math.min.apply(null,xs) - 8*DAY, x1 = Math.max.apply(null,xs) + 10*DAY;
      X = function(t){ return L + (t-x0)/(x1-x0)*(W-L-R); };
      for(var mo=0; mo<=9; mo++){
        var tt = Date.UTC(2026,mo,1); if(tt<x0||tt>x1) continue;
        s.push('<line class="gl" x1="'+X(tt)+'" y1="'+T+'" x2="'+X(tt)+'" y2="'+(H-B)+'"/>');
        s.push('<text class="axlab" x="'+X(tt)+'" y="'+(H-B+15)+'" text-anchor="middle">'+fmtMo(tt)+'</text>');
      }
      s.push('<line class="ax" x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'"/>');
      s.push('<text class="axlab" x="'+L+'" y="'+(H-B+31)+'">release date, 2026 \u2014 y axis is '+esc(def.name+' '+(def.version||''))+'</text>');

      descentPairs(b).forEach(function(p){
        if(state.vendor!=='all' && p.now.vendor!==state.vendor && p.then.vendor!==state.vendor) return;
        s.push('<line class="descent" x1="'+X(d2n(p.then.released))+'" y1="'+Y(p.then.scores[b].value)+
               '" x2="'+X(d2n(p.now.released))+'" y2="'+Y(p.now.scores[b].value)+'" stroke="'+col(p.now.vendor)+'"/>');
      });
      shown.forEach(function(m){
        var cx=X(d2n(m.released)), cy=Y(m.scores[b].value);
        var sc=m.scores[b];
        s.push(pt(m, cx, cy, sc.value+' on '+m.released+' \u2014 '+(sc.harness||'')+
          (typeof sc.cost_per_task==='number'?' \u2014 $'+sc.cost_per_task.toFixed(2)+'/task':'')+
          (sc.confidence==='low'?' \u2014 vendor self-report':'')));
        items.push({m:m, x:cx, y:cy, v:m.scores[b].value});
      });
      caption = 'Dashed lines connect each budget-tier release back to the last flagship it overtook. Squares are frontier and flagship tiers, circles are mid and efficient tiers.';
    } else {
      var ps = all.map(copilotPrice);
      var lo = Math.log10(Math.min.apply(null,ps)*0.7), hi = Math.log10(Math.max.apply(null,ps)*1.4);
      X = function(p){ return L + (Math.log10(p)-lo)/(hi-lo)*(W-L-R); };
      [0.5,1,2,5,10,20,50].forEach(function(p){
        if(Math.log10(p)<lo || Math.log10(p)>hi) return;
        s.push('<line class="gl" x1="'+X(p)+'" y1="'+T+'" x2="'+X(p)+'" y2="'+(H-B)+'"/>');
        s.push('<text class="axlab" x="'+X(p)+'" y="'+(H-B+15)+'" text-anchor="middle">$'+p+'</text>');
      });
      s.push('<line class="ax" x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'"/>');
      s.push('<text class="axlab" x="'+L+'" y="'+(H-B+31)+'">Copilot output price per 1M tokens, log scale \u2014 y axis is '+esc(def.name+' '+(def.version||''))+'</text>');

      var sorted = all.slice().sort(function(a,c){ return copilotPrice(a)-copilotPrice(c); });
      var front = [], bestSoFar = -Infinity;
      sorted.forEach(function(m){ if(m.scores[b].value > bestSoFar){ bestSoFar = m.scores[b].value; front.push(m); } });
      if(front.length > 1){
        s.push('<polyline class="front" points="'+front.map(function(m){ return X(copilotPrice(m))+','+Y(m.scores[b].value); }).join(' ')+'"/>');
      }
      shown.forEach(function(m){
        var cx=X(copilotPrice(m)), cy=Y(m.scores[b].value);
        s.push(pt(m, cx, cy, m.scores[b].value+' \u2014 Copilot $'+m.copilot.output+' per 1M output'));
        items.push({m:m, x:cx, y:cy, v:m.scores[b].value});
      });
      caption = 'Only models GitHub Copilot actually offers, priced at Copilot\u2019s rate card rather than the vendor\u2019s. The dashed line is the value frontier: for anything below and right of it, something cheaper already scores higher.';
    }

    s.push(labels(items, W));
    s.push('</svg>');
    document.getElementById('chart').outerHTML = s.join('');
    document.getElementById('caption').textContent = caption;
    renderLedger(b);
    renderCards(b);
  }

  /* ---------- ledger ---------- */
  function renderLedger(b){
    var rows = descentPairs(b).filter(function(p){ return state.vendor==='all' || p.now.vendor===state.vendor; });
    var body = document.getElementById('ledger-body');
    if(!rows.length){ body.innerHTML='<tr><td data-l="none" class="then">No budget-tier model on this benchmark has yet overtaken an earlier flagship.</td></tr>'; return; }
    body.innerHTML = rows.map(function(p){
      var s1=p.now.scores[b], s2=p.then.scores[b];
      var pn = outPrice(p.now), pt2 = outPrice(p.then), price = '\u2014';
      if(pn && pt2){
        var ratio = pt2.v/pn.v;
        price = '$'+pn.v+' vs $'+pt2.v+' ('+ (ratio>=1
          ? ratio.toFixed(1)+'\u00d7 cheaper'
          : (1/ratio).toFixed(1)+'\u00d7 dearer') +')';
        var mixed = (pn.basis!=='copilot'||pt2.basis!=='copilot');
        price += '<span class="src">'+(mixed
          ? 'vendor rate \u2014 not sold through Copilot'
          : 'Copilot output rate, per 1M')+'</span>';
      }
      return '<tr>'+
        '<td class="now" data-l="now">'+esc(shortName(p.now.name))+' <span class="num">'+s1.value+'</span>'+
          '<span class="src"><a href="'+esc(s1.source)+'" target="_blank" rel="noopener">'+esc(host(s1.source))+'</a> \u00b7 '+esc(s1.harness||'')+
            (typeof s1.cost_per_task==='number' ? ' \u00b7 $'+s1.cost_per_task.toFixed(2)+'/task' : '')+'</span></td>'+
        '<td class="then" data-l="beats">'+esc(shortName(p.then.name))+' <span class="num">'+s2.value+'</span>'+
          '<span class="src"><a href="'+esc(s2.source)+'" target="_blank" rel="noopener">'+esc(host(s2.source))+'</a>'+
            (typeof s2.cost_per_task==='number' ? ' \u00b7 $'+s2.cost_per_task.toFixed(2)+'/task' : '')+'</span></td>'+
        '<td class="gap" data-l="later">'+p.days+' days</td>'+
        '<td class="num" data-l="price">'+price+'</td></tr>';
    }).join('');
  }

  /* ---------- cards ---------- */
  function renderCards(b){
    var pairs = descentPairs(b);
    var lags = pairs.map(function(p){ return p.days; }).sort(function(a,c){return a-c;});
    var median = lags.length ? lags[Math.floor(lags.length/2)] : null;
    var ratios = [], cpOnly = [];
    pairs.forEach(function(p){
      var a = outPrice(p.now), b2 = outPrice(p.then);
      if(!a || !b2) return;
      ratios.push(b2.v/a.v);
      if(a.basis==='copilot' && b2.basis==='copilot') cpOnly.push(b2.v/a.v);
    });
    var maxR = cpOnly.length ? Math.max.apply(null,cpOnly)
             : (ratios.length ? Math.max.apply(null,ratios) : null);
    var inWin = DATA.models.filter(function(m){ return !m.anchor; }).length;
    var days = Math.round((d2n(DATA.window.to)-d2n(DATA.window.from))/DAY);

    var bestVal = null;
    withScore(b).filter(function(m){ return copilotPrice(m)!==null; }).forEach(function(m){
      var r = m.scores[b].value / copilotPrice(m);
      if(!bestVal || r > bestVal.r) bestVal = {m:m, r:r};
    });

    var cards = [
      ['~'+(median!==null?median:'\u2014')+' days','Median lag between a flagship shipping and a budget-tier model matching it on '+DATA.benchmarks[b].name+'. Shorter lag means the budget tier is catching up faster.'],
      [(maxR?maxR.toFixed(0)+'\u00d7':'\u2014'),'Largest gap in that ledger between what Copilot charges per million output tokens for the budget model and for the flagship it beat.'],
      [inWin+' releases','Across '+vendors().length+' labs in '+days+' days \u2014 about one every '+Math.round(days/inWin)+' days. Any model choice you freeze today has a short half-life.'],
      [bestVal ? shortName(bestVal.m.name) : '\u2014','Most score per Copilot output dollar on '+DATA.benchmarks[b].name+': '+(bestVal? bestVal.m.scores[b].value+' at $'+copilotPrice(bestVal.m)+' per 1M out' : 'no Copilot model has a score here')+'.']
    ];
    document.getElementById('cards').innerHTML = cards.map(function(c){
      return '<div class="card"><span class="big">'+esc(c[0])+'</span><p>'+esc(c[1])+'</p></div>';
    }).join('');
  }

  /* ---------- Copilot price table ---------- */
  function renderCopilot(){
    var meta = DATA.copilot_meta || {};
    var reg = srcById(meta.source);
    var plans = meta.plans ? Object.keys(meta.plans).map(function(k){ return k+' '+meta.plans[k]; }).join(', ') : '';
    var missing = DATA.models.filter(function(m){
      return m.copilot && m.copilot.available === false && !m.anchor && m.availability !== 'restricted';
    }).map(function(m){ return shortName(m.name); });
    document.getElementById('cp-intro').innerHTML =
      esc(meta.billing||'') +
      (reg ? ' <a href="'+esc(reg.url)+'" target="_blank" rel="noopener" style="color:var(--muted)">'+esc(host(reg.url))+' \u00b7 checked '+esc(reg.accessed)+'</a>' : '') +
      (missing.length ? '<br><br><strong style="color:var(--ink)">Not sold through Copilot:</strong> '+esc(missing.join(', '))+
        '. The catalogue trails the release timeline, so this table is what you can buy, not what exists.' : '');

    var rows = DATA.models.filter(function(m){ return m.copilot && m.copilot.available; })
      .map(function(m){ return {name:shortName(m.name), vendor:m.vendor, c:m.copilot, tracked:true}; });
    (DATA.copilot_catalog_extra||[]).forEach(function(e){
      rows.push({name:e.name, vendor:e.vendor, c:{category:e.category,input:e.input,output:e.output,long_context:null}, tracked:false});
    });
    rows.sort(function(a,b){ return a.c.output - b.c.output; });

    document.getElementById('cp-body').innerHTML = rows.map(function(r){
      var lc = (r.c.long_context && typeof r.c.long_context.output === 'number')
        ? '$'+r.c.long_context.output+'<span class="src">above '+Math.round(r.c.long_context.threshold/1000)+'K input tokens</span>'
        : '\u2014';
      var sub = r.tracked ? '' : '<span class="src">catalogue only, not benchmarked here</span>';
      if(r.c.price_confidence && r.c.price_confidence!=='high')
        sub += '<span class="src">rate not yet in the Copilot pricing table \u2014 provider list rate</span>';
      if(r.c.deprecation)
        sub += '<span class="src">retires '+esc(r.c.deprecation.date)+' \u2192 '+esc(r.c.deprecation.replacement)+'</span>';
      if(r.c.promo) sub += '<span class="src">'+esc(r.c.promo)+'</span>';
      var bucket = esc(r.c.category||'') + (r.c.release_status && r.c.release_status!=='GA'
        ? '<span class="src">'+esc(r.c.release_status)+'</span>' : '');
      return '<tr'+(r.tracked?'':' class="dim"')+'>'+
        '<td class="now" data-l="model" style="color:'+col(r.vendor)+'">'+esc(r.name)+sub+'</td>'+
        '<td data-l="bucket" class="then">'+bucket+'</td>'+
        '<td class="num" data-l="output">$'+r.c.output+'</td>'+
        '<td class="num" data-l="long ctx">'+lc+'</td></tr>';
    }).join('');
  }

  /* ---------- lanes ---------- */
  function renderLanes(){
    var byMonth = {};
    DATA.models.filter(function(m){ return !m.anchor; }).forEach(function(m){
      var k = m.released.slice(0,7); (byMonth[k] = byMonth[k] || []).push(m);
    });
    document.getElementById('lanes').innerHTML = Object.keys(byMonth).sort().map(function(k){
      var dd = new Date(d2n(k+'-01'));
      var chips = byMonth[k].sort(function(a,b){return a.released<b.released?-1:1;}).map(function(m){
        var r = m.availability==='restricted' || m.availability==='preview';
        return '<span class="chip'+(r?' restricted':'')+'" style="border-color:'+col(m.vendor)+';color:'+col(m.vendor)+'">'+esc(shortName(m.name))+'</span>';
      }).join('');
      return '<div class="lane"><div class="mo">'+fmtMo(d2n(k+'-01'))+' '+dd.getUTCFullYear()+'</div><div class="rel">'+chips+'</div></div>';
    }).join('');
  }

  /* ---------- sources ---------- */
  function renderSources(){
    var list = DATA.sources || [];
    document.getElementById('src-intro').textContent =
      list.length + ' sources, each last checked on the date shown. Every score in the JSON carries its own source URL, harness and confidence level alongside the number.';
    var ORDER = ['vendor-docs','vendor-announcement','vendor-blog','standardized-eval','aggregator','press','third-party-timeline','reference'];
    var LABEL = {'vendor-docs':'Vendor documentation','vendor-announcement':'Vendor announcements','vendor-blog':'Vendor blogs',
      'standardized-eval':'Standardized evaluations, one harness for every model','aggregator':'Leaderboard aggregators',
      'press':'Press and analysis','third-party-timeline':'Third-party timelines','reference':'Reference'};
    var groups = {};
    list.forEach(function(s){ (groups[s.type] = groups[s.type] || []).push(s); });
    var keys = ORDER.filter(function(k){ return groups[k]; }).concat(Object.keys(groups).filter(function(k){ return ORDER.indexOf(k)<0; }));
    document.getElementById('sources').innerHTML = keys.map(function(k){
      return '<div class="srcgroup"><h3>'+esc(LABEL[k]||k)+'</h3><ol>'+groups[k].map(function(s){
        return '<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a>, '+esc(s.publisher)+
               ' \u00b7 checked '+esc(s.accessed)+'<span class="use">'+esc(s.use||'')+'</span></li>';
      }).join('')+'</ol></div>';
    }).join('');
  }

  /* ---------- conflicts + footer ---------- */
  function renderRest(){
    document.getElementById('conflicts').innerHTML = (DATA.conflicts||[]).map(function(c){
      var vals = c.values && c.values.length ? ' <span class="num">'+c.values.join(' / ')+'</span>' : '';
      var who = c.model==='all' ? 'Across the board' : shortName(c.model);
      var bn = c.benchmark ? ', '+((DATA.benchmarks[c.benchmark]||{}).name || c.benchmark) : '';
      var links = (c.sources||[]).map(function(u){ return '<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(host(u))+'</a>'; }).join(' \u00b7 ');
      return '<li><strong>'+esc(who)+esc(bn)+'</strong>'+vals+' \u2014 '+esc(c.note)+(links?'<span class="src">'+links+'</span>':'')+'</li>';
    }).join('');
    document.getElementById('stamp-date').textContent = DATA.window.from+' \u2192 '+DATA.window.to+'  \u00b7  '+versionLine();
    document.getElementById('foot').textContent =
      versionLine()+'. '+DATA.models.length+' records across '+vendors().length+' labs, generated '+DATA.generated_at+
      '. Scores carry their harness and confidence in the source JSON; vendor-run figures typically sit above standardized third-party runs on the same benchmark version. Treat gaps under three points as noise.';
  }

  document.getElementById('apply').onclick = function(){
    var raw = document.getElementById('paste').value.trim(), msg = document.getElementById('msg');
    if(!raw){ msg.textContent='Nothing pasted.'; return; }
    try{
      var next = JSON.parse(raw);
      if(!next.models || !next.benchmarks) throw new Error('missing models or benchmarks');
      if(!schemaOk(next)) throw new Error('schema '+next.schema_version+' not supported by code v'+CODE_VERSION+' (needs '+SUPPORTED_SCHEMA_MAJOR+'.x)');
      DATA = next;
      if(!DATA.benchmarks[state.bench]) state.bench = Object.keys(DATA.benchmarks)[0];
      drawAll();
      msg.textContent = 'Redrawn: data v'+(DATA.data_version||'?')+', '+DATA.models.length+' records, generated '+(DATA.generated_at||'unknown')+'.';
    }catch(e){ msg.textContent = 'Could not parse that: '+e.message; }
  };

  function drawAll(){ render(); renderCopilot(); renderLanes(); renderSources(); renderRest(); }
  var rt;
  window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(render,150); });
  drawAll();
})();
