import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area, LineChart, Line, ReferenceLine
} from "recharts";

// ══════════════════════════════════════════════════════════════════
// DADOS REAIS DO DAVI — extraídos dos extratos Nubank jan–abr/2026
// ══════════════════════════════════════════════════════════════════

const RENDA_LIQUIDA = 3390;
const RENDA_BRUTA   = 3900;

const FIXOS_PRE = [ // até mai/2026
  { id:"cond",    label:"Condomínio",     valor:410,   cat:"moradia",     obs:"Vicente assume jun/26" },
  { id:"luz",     label:"Luz (RGE)",      valor:230,   cat:"moradia",     obs:"" },
  { id:"net",     label:"Internet",       valor:127,   cat:"moradia",     obs:"" },
  { id:"psico",   label:"Psicólogo",      valor:280,   cat:"saude",       obs:"" },
  { id:"spot",    label:"Spotify",        valor:32,    cat:"assinaturas", obs:"" },
  { id:"icloud",  label:"iCloud",         valor:5.90,  cat:"assinaturas", obs:"" },
  { id:"goog",    label:"Google One",     valor:5,     cat:"assinaturas", obs:"" },
  { id:"nflx",    label:"Netflix",        valor:59.90, cat:"assinaturas", obs:"" },
  { id:"ia",      label:"IA Tools (÷12)", valor:77,    cat:"assinaturas", obs:"Anual" },
];

const FIXOS_APE = [ // a partir jun/2026 (sem condomínio, Vicente assume)
  { id:"luz",     label:"Luz (RGE)",      valor:230,   cat:"moradia",     obs:"" },
  { id:"net",     label:"Internet",       valor:127,   cat:"moradia",     obs:"" },
  { id:"psico",   label:"Psicólogo",      valor:280,   cat:"saude",       obs:"" },
  { id:"spot",    label:"Spotify",        valor:32,    cat:"assinaturas", obs:"" },
  { id:"icloud",  label:"iCloud",         valor:5.90,  cat:"assinaturas", obs:"" },
  { id:"goog",    label:"Google One",     valor:5,     cat:"assinaturas", obs:"" },
  { id:"nflx",    label:"Netflix",        valor:59.90, cat:"assinaturas", obs:"" },
  { id:"ia",      label:"IA Tools (÷12)", valor:77,    cat:"assinaturas", obs:"Anual" },
];

const CATEGORIAS = [
  { id:"moradia",     label:"Moradia",         emoji:"🏠", cor:"#60a5fa", tipo:"essencial" },
  { id:"alimentacao", label:"Alimentação",      emoji:"🛒", cor:"#34d399", tipo:"essencial" },
  { id:"saude",       label:"Saúde",            emoji:"❤️", cor:"#f87171", tipo:"essencial" },
  { id:"transporte",  label:"Transporte",       emoji:"🚗", cor:"#a78bfa", tipo:"essencial" },
  { id:"imovel",      label:"Nápoles 407A",     emoji:"🏗️", cor:"#fbbf24", tipo:"essencial" },
  { id:"assinaturas", label:"Assinaturas",      emoji:"📱", cor:"#c084fc", tipo:"variavel"  },
  { id:"restaurante", label:"Restaurante",      emoji:"🍕", cor:"#f97316", tipo:"variavel"  },
  { id:"lazer",       label:"Lazer",            emoji:"🎮", cor:"#f472b6", tipo:"variavel"  },
  { id:"roupas",      label:"Roupas / Moda",    emoji:"👕", cor:"#fb7185", tipo:"risco"     },
  { id:"compulsivo",  label:"Compra impulsiva", emoji:"⚠️", cor:"#ef4444", tipo:"risco"     },
  { id:"outros",      label:"Outros / PIX",     emoji:"📦", cor:"#94a3b8", tipo:"variavel"  },
];

// Nápoles 407A
const N = {
  parcela_base: 927.98,
  incc: 0.006,
  inicio_ano: 2026, inicio_mes: 6,
  reforcos: [{ano:2026,mes:12},{ano:2027,mes:12},{ano:2028,mes:12}],
  financiamento: 204000,
  parcela_caixa_com: 960,
  parcela_caixa_sem: 1100,
  total_entrada: 50543,
  subsidio_rs: 20000,
  subsidio_fed: 557,
};

// Médias reais Nubank jan–abr/2026
const MEDIAS = [
  { cat:"Transporte",  med:459, cor:"#a78bfa", emoji:"🚗" },
  { cat:"Restaurante", med:421, cor:"#f97316", emoji:"🍕" },
  { cat:"Assinaturas", med:373, cor:"#c084fc", emoji:"📱" },
];

// ── Helpers ──────────────────────────────────────────────────────

const fmt    = v => `R$ ${(+v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtI   = v => `R$ ${Math.round(+v||0).toLocaleString("pt-BR")}`;
const key2lbl= k => { if(!k)return""; const[y,m]=k.split("-"); return new Date(+y,+m-1).toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}); };
const mkKey  = (y,m) => `${y}-${String(m).padStart(2,"0")}`;
const hoje   = () => { const d=new Date(); return mkKey(d.getFullYear(),d.getMonth()+1); };

function isFaseApe(k){
  const[y,m]=k.split("-").map(Number);
  return y>2026||(y===2026&&m>=6);
}
function parcela(k){
  const[y,m]=k.split("-").map(Number);
  const d=(y-N.inicio_ano)*12+(m-N.inicio_mes);
  if(d<0)return 0;
  return N.parcela_base*Math.pow(1+N.incc,d);
}
function mesIdx(k){
  const[y,m]=k.split("-").map(Number);
  return Math.max(0,(y-N.inicio_ano)*12+(m-N.inicio_mes));
}
function fixosMes(k){
  return isFaseApe(k)?FIXOS_APE:FIXOS_PRE;
}
function totalFixosMes(k){
  return fixosMes(k).reduce((a,f)=>a+f.valor,0);
}

// Parser Nubank CSV real (Data,Valor,Identificador,Descrição)
function parseNubank(txt){
  const lines=txt.trim().split("\n");
  const out=[];
  for(let i=1;i<lines.length;i++){
    const p=lines[i].split(",");
    if(p.length<4)continue;
    const data=p[0].trim();
    const valor=parseFloat(p[1].trim());
    const desc=(p[3]||p[2]||"").trim().replace(/"/g,"");
    if(isNaN(valor)||valor>=0)continue;
    if(/pagamento de fatura|aplicação rdb|senff/i.test(desc))continue;
    const abs=Math.abs(valor);
    const pt=data.split("/");
    if(pt.length<3)continue;
    const[d,m,y]=pt;
    const k=mkKey(+y,+m);
    let cat="outros";
    const dl=desc.toLowerCase();
    if(/rge sul|rge energia/.test(dl)) cat="moradia";
    else if(/uber|99pop|taxi|ônibus|metrô|passagem/.test(dl)) cat="transporte";
    else if(/ifood|rappi|james delivery|mc donalds|mcdonalds|burger|subway|pizza|restaurante|bar |lanche|açaí/.test(dl)) cat="restaurante";
    else if(/netflix|spotify|amazon prime|apple\.com|google storage|kiwify|hotmart|claude|openai|chatgpt|adobe/.test(dl)) cat="assinaturas";
    else if(/farmácia|drogaria|remédio|médico|clínica|hospital|saúde/.test(dl)) cat="saude";
    else if(/supermercado|mercado|atacado|carrefour|pão de açúcar|stx |ksa |hortifruti/.test(dl)) cat="alimentacao";
    else if(/zara|renner|shein|riachuelo|c&a|hering|lojas americanas/.test(dl)) cat="roupas";
    out.push({id:`${k}-${i}`,k,data,descricao:desc,valor:abs,cat});
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════════

export default function App(){
  const[tab,setTab]=useState("home");
  const[mes,setMes]=useState(hoje());
  const[dados,setDados]=useState({});
  const[reserva,setReserva]=useState(0);
  const[pagos,setPagos]=useState(0);
  const[subsidioOk,setSubsidioOk]=useState(true);
  const[loading,setLoading]=useState(true);
  const[antiCompra,setAntiCompra]=useState(null);
  const[csvStatus,setCsvStatus]=useState("");

  // forms
  const[fg,setFg]=useState({descricao:"",valor:"",cat:"alimentacao"});
  const[fre,setFre]=useState("");
  const[fres,setFres]=useState("");

  const salvar=useCallback(async(nd,nr,np)=>{
    try{
      await window.storage.set("dv_dados",JSON.stringify(nd??dados));
      await window.storage.set("dv_reserva",String(nr??reserva));
      await window.storage.set("dv_pagos",String(np??pagos));
    }catch(e){}
  },[dados,reserva,pagos]);

  useEffect(()=>{(async()=>{
    try{
      const d=await window.storage.get("dv_dados");
      const r=await window.storage.get("dv_reserva");
      const p=await window.storage.get("dv_pagos");
      if(d)setDados(JSON.parse(d.value));
      if(r)setReserva(+r.value);
      if(p)setPagos(+p.value);
    }catch(e){}
    setLoading(false);
  })();},[]);

  // Computed
  const ape     = isFaseApe(mes);
  const fixos   = fixosMes(mes);
  const totFixo = totalFixosMes(mes);
  const parc    = ape?parcela(mes):0;
  const idx     = mesIdx(mes);
  const md      = dados[mes]||{gastos:[],renda_extra:0};
  const gastos  = md.gastos||[];
  const totVar  = gastos.reduce((a,g)=>a+(+g.valor),0);
  const renda   = RENDA_LIQUIDA+(md.renda_extra||0);
  const totMes  = totFixo+totVar;
  const sobra   = renda-totMes;
  const pctC    = ((totMes/renda)*100).toFixed(1);
  const pctI    = Math.min(100,(pagos/N.total_entrada)*100);
  const pctR    = Math.min(100,(reserva/8000)*100);
  const parcelaPaga = gastos.some(g=>g.cat==="imovel");
  const statusSobra = sobra>1000?"ok":sobra>400?"warn":"danger";
  const cor={ok:"#22c55e",warn:"#f59e0b",danger:"#ef4444"};

  const porCat=useMemo(()=>
    CATEGORIAS.map(c=>({
      ...c,
      total:gastos.filter(g=>g.cat===c.id).reduce((a,g)=>a+(+g.valor),0)
    })).filter(c=>c.total>0)
  ,[gastos]);

  const historico=useMemo(()=>
    Object.keys(dados).sort().slice(-6).map(k=>{
      const gs=dados[k].gastos||[];
      const tF=totalFixosMes(k);
      const tV=gs.reduce((a,g)=>a+(+g.valor),0);
      const r=RENDA_LIQUIDA+(dados[k].renda_extra||0);
      const naoEss=gs.filter(g=>["lazer","roupas","compulsivo"].includes(g.cat)).reduce((a,g)=>a+(+g.valor),0);
      return{mes:key2lbl(k),sobra:r-tF-tV,gastos:tF+tV,naoEss};
    })
  ,[dados]);

  const projecao=useMemo(()=>{
    const arr=[];
    for(let i=0;i<48;i++){
      const ano=N.inicio_ano+Math.floor((N.inicio_mes-1+i)/12);
      const m=((N.inicio_mes-1+i)%12)+1;
      const k=mkKey(ano,m);
      const p=N.parcela_base*Math.pow(1+N.incc,i);
      const isRef=N.reforcos.some(r=>r.ano===ano&&r.mes===m);
      const pago=(dados[k]?.gastos||[]).some(g=>g.cat==="imovel");
      arr.push({i,k,ano,m,p,isRef,pago,label:new Date(ano,m-1).toLocaleDateString("pt-BR",{month:"short",year:"2-digit"})});
    }
    return arr;
  },[dados]);

  const mesOptions=useMemo(()=>{
    const arr=[];
    for(let i=-3;i<60;i++){
      const d=new Date(2026,2+i);
      const k=mkKey(d.getFullYear(),d.getMonth()+1);
      arr.push({k,label:d.toLocaleDateString("pt-BR",{month:"short",year:"numeric"})});
    }
    return arr;
  },[]);

  // Actions
  const addGasto=()=>{
    if(!fg.descricao||!fg.valor)return;
    const g={...fg,id:Date.now(),data:new Date().toISOString()};
    const nd={...dados,[mes]:{...md,gastos:[...gastos,g]}};
    setDados(nd);salvar(nd);
    setFg({descricao:"",valor:"",cat:"alimentacao"});
    if(["compulsivo","lazer","roupas"].includes(g.cat))setAntiCompra(+g.valor);
  };

  const removeGasto=id=>{
    const nd={...dados,[mes]:{...md,gastos:gastos.filter(g=>g.id!==id)}};
    setDados(nd);salvar(nd);
  };

  const addRendaExtra=()=>{
    if(!fre)return;
    const nd={...dados,[mes]:{...md,renda_extra:(md.renda_extra||0)+(+fre)}};
    setDados(nd);salvar(nd);setFre("");
  };

  const addReserva=()=>{
    if(!fres)return;
    const nr=reserva+(+fres);
    setReserva(nr);salvar(dados,nr);setFres("");
  };

  const pagarParcelaNapoles=()=>{
    if(parcelaPaga)return;
    const np=pagos+parc;
    const g={descricao:`Parcela Nápoles ${key2lbl(mes)}`,valor:parc.toFixed(2),cat:"imovel",id:Date.now(),data:new Date().toISOString()};
    const nd={...dados,[mes]:{...md,gastos:[...gastos,g]}};
    setDados(nd);setPagos(np);salvar(nd,reserva,np);
  };

  const importCSV=async e=>{
    const file=e.target.files[0];
    if(!file)return;
    setCsvStatus("⏳ Importando...");
    try{
      const text=await file.text();
      const gs=parseNubank(text);
      const nd={...dados};
      gs.forEach(({k,...g})=>{
        if(!nd[k])nd[k]={gastos:[],renda_extra:0};
        if(!nd[k].gastos.find(x=>x.id===g.id))nd[k].gastos.push(g);
      });
      setDados(nd);salvar(nd);
      setCsvStatus(`✅ ${gs.length} lançamentos importados`);
    }catch(err){
      setCsvStatus("❌ Erro ao importar. Verifique o arquivo.");
    }
    e.target.value="";
    setTimeout(()=>setCsvStatus(""),4000);
  };

  if(loading) return(
    <div style={{background:"#060810",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#404660",fontFamily:"monospace",fontSize:13}}>
      carregando dados...
    </div>
  );

  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#060810",color:"#e8ecf8",minHeight:"100vh",maxWidth:480,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,select,button,textarea{font-family:inherit}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a1d2a}
        .card{background:#0c0f1a;border:1px solid #141828;border-radius:16px}
        .btn{border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .15s}
        .btn:active{transform:scale(.97)}
        .inp{background:#0f1220;border:1px solid #1e2235;border-radius:10px;color:#e8ecf8;padding:10px 12px;font-size:14px;width:100%;outline:none;font-family:inherit}
        .inp:focus{border-color:#4f6fff}
        select.inp option{background:#0c0f1a}
        .mono{font-family:'DM Mono',monospace}
        .tab-btn{flex:1;padding:10px 4px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:11px;font-weight:500;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .2s}
        .row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #0f1220}
        .row:last-child{border-bottom:none}
        .pbar{background:#10132a;border-radius:99px;overflow:hidden}
        .pfill{height:100%;border-radius:99px;transition:width .7s cubic-bezier(.34,1.56,.64,1)}
        .pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
        @keyframes up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        .up{animation:up .28s ease}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        .pulse{animation:pulse 2s infinite}
        .sec-title{font-size:10px;font-weight:600;color:#606890;text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px}
      `}</style>

      {/* ── OVERLAY ANTI-COMPRA ── */}
      {antiCompra!==null&&(
        <div className="overlay" onClick={()=>setAntiCompra(null)}>
          <div className="card up" style={{padding:24,maxWidth:340,textAlign:"center",border:"1px solid #ef444445"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:52,marginBottom:12}}>🛑</div>
            <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:8}}>Espera um segundo.</div>
            <div style={{fontSize:12,color:"#fbbf24",lineHeight:1.85,marginBottom:18,fontStyle:"italic"}}>
              {antiCompra>0&&<>Você acabou de gastar <strong style={{color:"#fff"}}>{fmtI(antiCompra)}</strong>.<br/></>}
              Sua parcela do Nápoles é <strong style={{color:"#fff"}}>R$ 928/mês</strong>.<br/>
              Sua reserva de emergência: <strong style={{color:"#fff"}}>{fmtI(reserva)}</strong>.<br/>
              Meta mínima: <strong style={{color:"#fff"}}>R$ 8.000</strong>.<br/><br/>
              Cada real desperdiçado agora atrasa o 407A.
            </div>
            <button className="btn" style={{background:"#1d4ed8",color:"#fff",padding:12,fontSize:13,width:"100%"}} onClick={()=>setAntiCompra(null)}>
              Entendido. Foco no 407A 🏠
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{padding:"18px 16px 0",background:"linear-gradient(180deg,#080b18 0%,#060810 100%)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:9,color:"#3b5bff",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Missão Nápoles 407A</div>
            <div style={{fontSize:20,fontWeight:700}}>Olá, Davi 👋</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
            <select className="inp" style={{width:"auto",fontSize:11,padding:"5px 8px"}} value={mes} onChange={e=>setMes(e.target.value)}>
              {mesOptions.map(o=><option key={o.k} value={o.k}>{o.label}</option>)}
            </select>
            <div style={{fontSize:9,color:ape?"#22c55e":"#f59e0b"}}>
              {ape?"✅ Parcela ativa":"⏳ Pré-apê"}
            </div>
          </div>
        </div>

        {/* Progress cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[
            {label:"🏗️ Entrada paga",pct:pctI,v:`${fmtI(pagos)} / ${fmtI(N.total_entrada)}`,c1:"#d97706",c2:"#fbbf24"},
            {label:"🛡️ Reserva emergência",pct:pctR,v:`${fmtI(reserva)} / R$ 8.000`,c1:"#15803d",c2:"#22c55e"},
          ].map(b=>(
            <div key={b.label} className="card" style={{padding:"10px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#606890",marginBottom:6}}>
                <span>{b.label}</span>
                <span className="mono" style={{color:b.c2}}>{b.pct.toFixed(1)}%</span>
              </div>
              <div className="pbar" style={{height:6}}>
                <div className="pfill" style={{width:`${b.pct}%`,background:`linear-gradient(90deg,${b.c1},${b.c2})`}}/>
              </div>
              <div className="mono" style={{fontSize:9,color:"#606890",marginTop:4}}>{b.v}</div>
            </div>
          ))}
        </div>

        {/* Saldo */}
        <div className="card" style={{padding:"12px 14px",marginBottom:14,borderColor:sobra>=0?"#12202a":"#2a1010"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:9,color:"#606890",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Saldo do mês</div>
              <div className="mono" style={{fontSize:28,fontWeight:700,color:cor[statusSobra]}}>
                {sobra>=0?"+":""}{fmtI(sobra)}
              </div>
              <div style={{fontSize:9,color:"#606890"}}>{pctC}% comprometido</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#4ade80"}} className="mono">+{fmtI(renda)}</div>
              <div style={{fontSize:9,color:"#606890",marginBottom:3}}>entrou</div>
              <div style={{fontSize:11,color:"#f87171"}} className="mono">−{fmtI(totMes)}</div>
              <div style={{fontSize:9,color:"#606890"}}>saiu</div>
            </div>
          </div>
          <div className="pbar" style={{height:3,marginTop:10}}>
            <div className="pfill" style={{width:`${Math.min(100,+pctC)}%`,background:cor[statusSobra]}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:9,color:"#606890"}}>
            <span>0%</span>
            <span style={{color:"#f59e0b"}}>⚠️ 30% Limite Caixa</span>
            <span style={{color:"#f87171"}}>100%</span>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{padding:"0 16px 100px",marginTop:8}}>

        {/* ════ HOME ════ */}
        {tab==="home"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Parcela Nápoles */}
            {ape&&(
              <div className="card" style={{padding:14,border:"1px solid #2a1e0050"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:9,color:"#f59e0b",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>🏗️ Parcela Nápoles</div>
                    <div className="mono" style={{fontSize:22,fontWeight:700,color:"#fff"}}>{fmt(parc)}</div>
                    <div style={{fontSize:9,color:"#606890"}}>Mês {idx+1} de 48 · INCC +{(idx*0.6).toFixed(1)}%</div>
                  </div>
                  <button
                    className={`btn ${!parcelaPaga?"pulse":""}`}
                    style={{background:parcelaPaga?"#0a2e14":"#f59e0b",color:parcelaPaga?"#4ade80":"#000",padding:"10px 14px",fontSize:12,opacity:parcelaPaga?.8:1}}
                    onClick={pagarParcelaNapoles}
                    disabled={parcelaPaga}>
                    {parcelaPaga?"✅ PAGO":"PAGUEI ✓"}
                  </button>
                </div>
              </div>
            )}

            {!ape&&(
              <div className="card" style={{padding:14,border:"1px solid #3b5bff20",background:"#080d18"}}>
                <div style={{fontSize:11,color:"#4f6fff",marginBottom:4}}>⏳ Parcelas do Nápoles começam em 10/06/2026</div>
                <div style={{fontSize:10,color:"#606890"}}>Use este período para zerar dívidas e montar reserva de emergência.</div>
              </div>
            )}

            {/* Balanço */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">📊 Balanço do mês — método Primo Pobre</div>
              {[
                {l:"Renda líquida CLT",v:fmtI(RENDA_LIQUIDA),c:"#4ade80"},
                (md.renda_extra||0)>0&&{l:"💪 Renda extra",v:`+${fmtI(md.renda_extra)}`,c:"#22c55e",b:true},
                {l:`Fixos (${fixos.length} itens)`,v:`−${fmtI(totFixo)}`,c:"#60a5fa"},
                ape&&{l:"Parcela Nápoles",v:`−${fmtI(parc)}`,c:"#fbbf24"},
                totVar>0&&{l:"Variáveis lançados",v:`−${fmtI(totVar)}`,c:"#fb923c"},
                {l:"= Sobra para viver",v:(sobra>=0?"+":"")+fmtI(sobra),c:cor[statusSobra],b:true,sep:true},
              ].filter(Boolean).map((r,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:r.sep?"10px 0 0":"5px 0",borderBottom:r.sep?"none":"1px solid #0f1220",borderTop:r.sep?"1px solid #1a1d2a":"none",fontSize:r.b?13:11}}>
                  <span style={{color:"#7080a0",fontWeight:r.b?600:400}}>{r.l}</span>
                  <span className="mono" style={{color:r.c,fontWeight:r.b?700:500}}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Médias reais Nubank */}
            <div className="card" style={{padding:14,border:"1px solid #1d4ed820"}}>
              <div className="sec-title" style={{color:"#60a5fa"}}>📈 Suas médias reais jan–abr/2026</div>
              {MEDIAS.map(m=>(
                <div key={m.cat} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#7080a0"}}>{m.emoji} {m.cat}</span>
                    <span className="mono" style={{color:m.cor,fontSize:10}}>{fmtI(m.med)}/mês</span>
                  </div>
                  <div className="pbar" style={{height:5}}>
                    <div className="pfill" style={{width:`${(m.med/RENDA_LIQUIDA)*100}%`,background:m.cor}}/>
                  </div>
                </div>
              ))}
              <div style={{fontSize:10,color:"#404660",marginTop:8,fontStyle:"italic"}}>Baseado nos extratos reais do seu Nubank</div>
            </div>

            {/* Renda extra */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">💪 Renda extra do mês</div>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="Freela, bico, venda..." type="number" value={fre} onChange={e=>setFre(e.target.value)} style={{flex:1}}/>
                <button className="btn" style={{background:"#1d4ed8",color:"#fff",padding:"0 16px",fontSize:14}} onClick={addRendaExtra}>+</button>
              </div>
              {(md.renda_extra||0)>0&&<div style={{fontSize:11,color:"#4ade80",marginTop:8}}>🚀 +{fmtI(md.renda_extra)} este mês!</div>}
            </div>

            {/* Reserva */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">🛡️ Reserva de emergência</div>
              <div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="Quanto guardou?" type="number" value={fres} onChange={e=>setFres(e.target.value)} style={{flex:1}}/>
                <button className="btn" style={{background:"#16a34a",color:"#fff",padding:"0 16px",fontSize:14}} onClick={addReserva}>+</button>
              </div>
              <div style={{fontSize:10,color:"#606890",marginTop:8}}>
                Meta: R$ 8.000 · Tem: {fmtI(reserva)} · Falta: <span style={{color:"#f87171"}}>{fmtI(Math.max(0,8000-reserva))}</span>
              </div>
            </div>

            <button className="btn" style={{background:"#120a0a",border:"1px solid #ef444430",color:"#f87171",padding:12,fontSize:12,width:"100%"}} onClick={()=>setAntiCompra(0)}>
              ⚠️ Tô com vontade de comprar algo... me para!
            </button>
          </div>
        )}

        {/* ════ GASTOS ════ */}
        {tab==="gastos"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Import CSV */}
            <div className="card" style={{padding:14,border:"1px solid #7c3aed30"}}>
              <div className="sec-title" style={{color:"#a78bfa"}}>📥 Importar CSV do Nubank</div>
              <label style={{display:"block",background:"#0f1220",border:"2px dashed #252840",borderRadius:10,padding:16,textAlign:"center",cursor:"pointer"}}>
                <div style={{fontSize:24,marginBottom:6}}>📂</div>
                <div style={{fontSize:12,color:"#606890"}}>Toque para selecionar o arquivo CSV</div>
                <div style={{fontSize:10,color:"#404660",marginTop:4}}>Exclui fatura, RDB e Senff automaticamente</div>
                <input type="file" accept=".csv" style={{display:"none"}} onChange={importCSV}/>
              </label>
              {csvStatus&&<div style={{fontSize:11,marginTop:8,color:csvStatus.startsWith("✅")?"#4ade80":"#f87171"}}>{csvStatus}</div>}
            </div>

            {/* Novo lançamento */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">+ Lançar gasto manual</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input className="inp" placeholder="Descrição (ex: pizza, uber, farmácia...)" value={fg.descricao} onChange={e=>setFg(p=>({...p,descricao:e.target.value}))}/>
                <input className="inp" placeholder="Valor (R$)" type="number" value={fg.valor} onChange={e=>setFg(p=>({...p,valor:e.target.value}))}/>
                <select className="inp" value={fg.cat} onChange={e=>setFg(p=>({...p,cat:e.target.value}))}>
                  {CATEGORIAS.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
                <button className="btn" style={{background:"#3b5bff",color:"#fff",padding:12,fontSize:14}} onClick={addGasto}>
                  Registrar gasto
                </button>
              </div>
            </div>

            {/* Fixos do mês */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">📌 Fixos — {ape?"fase apê (jun/26+)":"fase atual (até mai/26)"}</div>
              {fixos.map(f=>{
                const cat=CATEGORIAS.find(c=>c.id===f.cat);
                return(
                  <div key={f.id} className="row">
                    <span style={{fontSize:15}}>{cat?.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12}}>{f.label}</div>
                      {f.obs&&<div style={{fontSize:9,color:"#f59e0b"}}>{f.obs}</div>}
                    </div>
                    <span className="mono" style={{color:"#f87171",fontSize:12}}>{fmtI(f.valor)}</span>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #1a1d2a",fontWeight:700,fontSize:13}}>
                <span style={{color:"#7080a0"}}>Total fixos</span>
                <span className="mono" style={{color:"#f87171"}}>{fmtI(totFixo)}</span>
              </div>
            </div>

            {/* Variáveis */}
            <div className="card" style={{padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span className="sec-title" style={{marginBottom:0}}>🔄 Variáveis lançados</span>
                {gastos.length>0&&<span className="mono" style={{fontSize:11,color:"#fb923c"}}>{fmtI(totVar)}</span>}
              </div>
              {gastos.length===0
                ?<div style={{fontSize:12,color:"#606890",textAlign:"center",padding:20}}>
                  Nenhum lançamento ainda.<br/>
                  <span style={{fontSize:10,color:"#404660"}}>Importe o CSV do Nubank ou lance manualmente.</span>
                </div>
                :gastos.map(g=>{
                  const cat=CATEGORIAS.find(c=>c.id===g.cat);
                  return(
                    <div key={g.id} className="row">
                      <span style={{fontSize:15}}>{cat?.emoji||"📦"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:"#e8ecf8"}}>{g.descricao}</div>
                        <div style={{fontSize:9,color:cat?.tipo==="risco"?"#f87171":"#606890"}}>{cat?.label}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span className="mono" style={{color:"#f87171",fontSize:12}}>{fmt(+g.valor)}</span>
                        <button onClick={()=>removeGasto(g.id)} style={{background:"none",border:"none",color:"#505870",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}

        {/* ════ ANÁLISE ════ */}
        {tab==="analise"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Categorias */}
            {porCat.length>0&&(
              <div className="card" style={{padding:14}}>
                <div className="sec-title">Por categoria — {key2lbl(mes)}</div>
                <ResponsiveContainer width="100%" height={porCat.length*36+20}>
                  <BarChart data={porCat} layout="vertical" margin={{left:4,right:16}}>
                    <XAxis type="number" tick={{fontSize:9,fill:"#505870"}} tickFormatter={v=>fmtI(v)}/>
                    <YAxis type="category" dataKey="emoji" tick={{fontSize:16}} width={32}/>
                    <Tooltip formatter={v=>fmtI(v)} contentStyle={{background:"#0c0f1a",border:"1px solid #1e2235",borderRadius:8,fontSize:11}}/>
                    <Bar dataKey="total" radius={[0,6,6,0]}>
                      {porCat.map((c,i)=><Cell key={i} fill={c.cor}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Histórico */}
            {historico.length>1&&(
              <div className="card" style={{padding:14}}>
                <div className="sec-title">📈 Histórico de sobra mensal</div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={historico} margin={{left:4,right:4}}>
                    <defs>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={.25}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" tick={{fontSize:9,fill:"#505870"}}/>
                    <YAxis tick={{fontSize:9,fill:"#505870"}} tickFormatter={v=>fmtI(v)}/>
                    <Tooltip formatter={v=>fmtI(v)} contentStyle={{background:"#0c0f1a",border:"1px solid #1e2235",borderRadius:8,fontSize:11}}/>
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4"/>
                    <Area type="monotone" dataKey="sobra" name="Sobra" stroke="#22c55e" fill="url(#gS)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Vs médias reais */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">📊 Mês atual vs suas médias reais</div>
              {[
                {cat:"Transporte",key:"transporte",med:459,cor:"#a78bfa"},
                {cat:"Restaurante",key:"restaurante",med:421,cor:"#f97316"},
              ].map(c=>{
                const atual=gastos.filter(g=>g.cat===c.key).reduce((a,g)=>a+(+g.valor),0);
                const pct=Math.min(150,(atual/c.med)*100);
                const acima=atual>c.med;
                return(
                  <div key={c.cat} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
                      <span style={{color:"#7080a0"}}>{c.cat}</span>
                      <span>
                        <span className="mono" style={{color:acima?"#f87171":c.cor,fontSize:11}}>{fmtI(atual)}</span>
                        <span style={{fontSize:9,color:"#505870"}}> / ref. {fmtI(c.med)}</span>
                      </span>
                    </div>
                    <div className="pbar" style={{height:7}}>
                      <div className="pfill" style={{width:`${Math.min(100,pct)}%`,background:acima?"#ef4444":c.cor}}/>
                    </div>
                    {acima&&<div style={{fontSize:9,color:"#f87171",marginTop:3}}>+{fmtI(atual-c.med)} acima da sua média</div>}
                  </div>
                );
              })}
            </div>

            {/* Análise automática */}
            <div className="card" style={{padding:14,background:"#07091a",border:"1px solid #1d4ed820"}}>
              <div className="sec-title" style={{color:"#60a5fa"}}>💡 Análise automática</div>
              {[
                sobra<0           &&{icon:"🔴",msg:"NEGATIVO! Você gastou mais do que ganhou. Corte os não-essenciais agora."},
                sobra<500&&sobra>=0&&{icon:"🟡",msg:"Sobra muito baixa. Um imprevisto te desequilibra."},
                ape&&!parcelaPaga &&{icon:"🏗️",msg:`Parcela do Nápoles não registrada: ${fmt(parc)}`},
                reserva<3000      &&{icon:"🛡️",msg:`Reserva em ${fmtI(reserva)}. Meta mínima é R$ 3.000. Priorize isso!`},
                (md.renda_extra||0)>0&&{icon:"🚀",msg:`Renda extra de +${fmtI(md.renda_extra)} este mês! Excelente.`},
                sobra>1200        &&{icon:"🎉",msg:`Sobrou ${fmtI(sobra)}! Vai direto pra reserva de emergência.`},
                gastos.some(g=>g.cat==="compulsivo")&&{icon:"⚠️",msg:"Compras impulsivas registradas. Perceber é o primeiro passo!"},
              ].filter(Boolean).map((a,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:"1px solid #0f1220",fontSize:11}}>
                  <span>{a.icon}</span>
                  <span style={{color:"#8090b0",lineHeight:1.5}}>{a.msg}</span>
                </div>
              ))}
              {[sobra<0,sobra<500&&sobra>=0,ape&&!parcelaPaga,reserva<3000].every(v=>!v)&&sobra>0&&(
                <div style={{fontSize:11,color:"#4ade80",padding:"7px 0"}}>✅ Mês sob controle! Continue assim.</div>
              )}
            </div>
          </div>
        )}

        {/* ════ METAS ════ */}
        {tab==="metas"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Missão */}
            <div className="card" style={{padding:16,background:"linear-gradient(135deg,#081a0c,#060810)",border:"1px solid #22c55e25"}}>
              <div style={{fontSize:9,color:"#22c55e",textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Sua missão</div>
              <div style={{fontSize:14,fontWeight:700,lineHeight:1.5,color:"#fff",marginBottom:14}}>
                Receber as chaves do 407A em jan/2029 com financiamento aprovado e reserva de emergência 🏠
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {l:"Parcelas pagas",v:`${idx}/48`,pct:(idx/48)*100,c:"#fbbf24"},
                  {l:"Entrada paga",v:`${pctI.toFixed(0)}%`,pct:pctI,c:"#60a5fa"},
                  {l:"Reserva",v:`${pctR.toFixed(0)}%`,pct:pctR,c:"#22c55e"},
                  {l:"Meses p/ chaves",v:`~${Math.max(0,32-idx)}`,pct:(idx/32)*100,c:"#a78bfa"},
                ].map(k=>(
                  <div key={k.l} style={{background:"#060810",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:"#505870",marginBottom:4}}>{k.l}</div>
                    <div className="mono" style={{fontSize:18,fontWeight:700,color:k.c}}>{k.v}</div>
                    <div className="pbar" style={{height:3,marginTop:6}}>
                      <div className="pfill" style={{width:`${Math.min(100,k.pct)}%`,background:k.c}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Porta de Entrada RS */}
            <div className="card" style={{padding:14,border:`1px solid ${subsidioOk?"#22c55e30":"#ef444430"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div className="sec-title" style={{marginBottom:0}}>🏛️ Porta de Entrada RS</div>
                <span className="pill" style={{background:subsidioOk?"#0a2e14":"#2a0a0a",color:subsidioOk?"#4ade80":"#f87171",border:`1px solid ${subsidioOk?"#22c55e40":"#ef444440"}`}}>
                  {subsidioOk?"ATIVO":"SEM CCS"}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  {l:"Subsídio RS",v:"R$ 20.000",c:"#22c55e"},
                  {l:"Subsídio federal",v:"R$ 557",c:"#60a5fa"},
                  {l:"Protocolo",v:"22224",c:"#fbbf24"},
                ].map(k=>(
                  <div key={k.l} style={{background:"#060810",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:9,color:"#505870",marginBottom:3}}>{k.l}</div>
                    <div className="mono" style={{fontSize:12,fontWeight:700,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,color:"#7080a0"}}>CCS emitido?</span>
                <button className="btn" style={{background:subsidioOk?"#0a2e14":"#2a0a0a",color:subsidioOk?"#4ade80":"#f87171",border:`1px solid ${subsidioOk?"#22c55e40":"#ef444440"}`,padding:"4px 12px",fontSize:11}} onClick={()=>setSubsidioOk(!subsidioOk)}>
                  {subsidioOk?"✅ Sim, emitido":"❌ Não ainda"}
                </button>
              </div>
              {!subsidioOk&&(
                <div style={{marginTop:10,padding:"8px 10px",background:"#150a0a",borderRadius:8,fontSize:11,color:"#f87171",lineHeight:1.6}}>
                  ⚠️ Sem CCS, os R$ 20.000 não entram no financiamento. Você precisaria colocar esse valor do próprio bolso ou financiar R$ 224.557 (parcela ~R$ 1.100/mês).
                </div>
              )}
            </div>

            {/* Projeção parcelas */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">📈 Evolução das parcelas — 48 meses</div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={projecao.filter((_,i)=>i%2===0)} margin={{left:4,right:4}}>
                  <defs>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={.25}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{fontSize:8,fill:"#505870"}}/>
                  <YAxis tick={{fontSize:8,fill:"#505870"}} tickFormatter={v=>fmtI(v)}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#0c0f1a",border:"1px solid #1e2235",borderRadius:8,fontSize:11}}/>
                  <Area type="monotone" dataKey="p" name="Parcela" stroke="#fbbf24" fill="url(#gP)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12}}>
                {[
                  {l:"Parcela jun/26",v:fmt(N.parcela_base),c:"#4ade80"},
                  {l:"Parcela dez/29",v:fmt(N.parcela_base*Math.pow(1.006,47)),c:"#f87171"},
                  {l:"Caixa c/subsídio",v:fmt(N.parcela_caixa_com),c:"#22c55e"},
                ].map(k=>(
                  <div key={k.l} style={{background:"#060810",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#505870",marginBottom:3}}>{k.l}</div>
                    <div className="mono" style={{fontSize:11,fontWeight:700,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cenários pós-chaves */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">🔮 Cenários pós-chaves (jan/2029)</div>
              {[
                {titulo:"✅ Com subsídio Porta de Entrada",fin:"R$ 204.000",parc:fmt(N.parcela_caixa_com),pct:"28%",ok:true},
                {titulo:"❌ Sem subsídio",fin:"R$ 224.557",parc:fmt(N.parcela_caixa_sem),pct:"32%",ok:false},
              ].map((c,i)=>(
                <div key={i} style={{padding:12,background:"#060810",borderRadius:10,marginBottom:8,border:`1px solid ${c.ok?"#22c55e25":"#ef444425"}`}}>
                  <div style={{fontSize:11,fontWeight:600,color:c.ok?"#22c55e":"#f87171",marginBottom:8}}>{c.titulo}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[
                      {l:"Financiamento",v:c.fin},
                      {l:"Parcela/mês",v:c.parc},
                      {l:"% da renda",v:c.pct},
                    ].map(k=>(
                      <div key={k.l}>
                        <div style={{fontSize:9,color:"#505870",marginBottom:2}}>{k.l}</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700,color:c.ok?"#e8ecf8":"#f87171"}}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Datas críticas */}
            <div className="card" style={{padding:14,border:"1px solid #f59e0b20"}}>
              <div className="sec-title" style={{color:"#fbbf24"}}>📅 Calendário de compromissos</div>
              {[
                {data:"10/06/2026",ev:`1ª Parcela: ${fmt(N.parcela_base)}`,alerta:true},
                {data:"31/12/2026",ev:`1º Reforço: ${fmt(2000*Math.pow(1.006,6))}`},
                {data:"31/12/2027",ev:`2º Reforço: ${fmt(2000*Math.pow(1.006,18))}`},
                {data:"31/07/2028",ev:"Prazo previsto entrega da obra"},
                {data:"31/12/2028",ev:`3º Reforço: ${fmt(2000*Math.pow(1.006,30))}`},
                {data:"Jan/2029",  ev:"🔑 Chaves + Início financiamento Caixa"},
              ].map((d,i)=>(
                <div key={i} className="row" style={{fontSize:11}}>
                  <span className="mono" style={{color:d.alerta?"#f87171":"#f59e0b",fontSize:9,minWidth:72,flexShrink:0}}>{d.data}</span>
                  <span style={{color:"#8090b0"}}>{d.ev}</span>
                </div>
              ))}
            </div>

            {/* Checklist mensal */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">✅ Checklist do mês</div>
              {[
                {l:ape?"Parcela do Nápoles paga":"Organizar finanças (parcelas começam jun/26)",done:ape?parcelaPaga:totMes<renda},
                {l:"Não gastou mais do que ganhou",done:sobra>=0},
                {l:"Sem compras impulsivas",done:!gastos.some(g=>g.cat==="compulsivo")},
                {l:"Adicionou à reserva de emergência",done:reserva>0},
                {l:"Fez renda extra",done:(md.renda_extra||0)>0},
                {l:"Sobrou mais de R$ 800",done:sobra>=800},
              ].map((item,i)=>(
                <div key={i} className="row">
                  <div style={{width:20,height:20,borderRadius:"50%",background:item.done?"#16a34a":"#0f1220",border:`1px solid ${item.done?"#22c55e":"#1e2235"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,color:"#fff"}}>
                    {item.done?"✓":""}
                  </div>
                  <span style={{fontSize:12,color:item.done?"#e8ecf8":"#505870"}}>{item.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ CONFIG ════ */}
        {tab==="config"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Dados do imóvel */}
            <div className="card" style={{padding:14,border:"1px solid #3b5bff20",background:"#080b18"}}>
              <div className="sec-title" style={{color:"#4f6fff"}}>⚙️ Dados do sistema</div>
              {[
                {l:"Seu nome",v:"Davi da Silva Ramos"},
                {l:"Renda líquida CLT",v:fmtI(RENDA_LIQUIDA)},
                {l:"Renda bruta",v:fmtI(RENDA_BRUTA)},
                {l:"Imóvel",v:"Nápoles 407A — Canoas/RS"},
                {l:"Vaga",v:"110"},
                {l:"Área",v:"70,92 m²"},
                {l:"Valor total",v:fmt(275100)},
                {l:"Entrada total",v:fmt(N.total_entrada)},
                {l:"Financiamento Caixa",v:fmt(N.financiamento)},
                {l:"Subsídio Porta de Entrada",v:fmt(N.subsidio_rs)},
                {l:"Subsídio federal MCMV",v:fmt(N.subsidio_fed)},
                {l:"Prazo obra",v:"31/07/2028 + 180 dias"},
                {l:"Chaves previstas",v:"Jan/2029"},
              ].map((r,i)=>(
                <div key={i} className="row" style={{fontSize:11}}>
                  <span style={{color:"#606890",flex:1}}>{r.l}</span>
                  <span className="mono" style={{color:"#e8ecf8",fontSize:11}}>{r.v}</span>
                </div>
              ))}
            </div>

            {/* Fixos cadastrados */}
            <div className="card" style={{padding:14}}>
              <div className="sec-title">📌 Todos os fixos cadastrados</div>

              <div style={{fontSize:10,color:"#4f6fff",marginBottom:8,marginTop:-4}}>Fase atual (até mai/26) — Total: {fmtI(FIXOS_PRE.reduce((a,f)=>a+f.valor,0))}</div>
              {FIXOS_PRE.map(f=>{
                const cat=CATEGORIAS.find(c=>c.id===f.cat);
                return(
                  <div key={f.id} className="row" style={{fontSize:11}}>
                    <span style={{fontSize:13}}>{cat?.emoji}</span>
                    <div style={{flex:1}}>
                      <span>{f.label}</span>
                      {f.obs&&<span style={{fontSize:9,color:"#f59e0b",marginLeft:6}}>{f.obs}</span>}
                    </div>
                    <span className="mono" style={{color:"#f87171",fontSize:11}}>{fmtI(f.valor)}</span>
                  </div>
                );
              })}

              <div style={{fontSize:10,color:"#22c55e",margin:"12px 0 8px"}}>Fase apê (jun/26+) — Total: {fmtI(FIXOS_APE.reduce((a,f)=>a+f.valor,0))}</div>
              {FIXOS_APE.map(f=>{
                const cat=CATEGORIAS.find(c=>c.id===f.cat);
                return(
                  <div key={f.id} className="row" style={{fontSize:11}}>
                    <span style={{fontSize:13}}>{cat?.emoji}</span>
                    <span style={{flex:1}}>{f.label}</span>
                    <span className="mono" style={{color:"#f87171",fontSize:11}}>{fmtI(f.valor)}</span>
                  </div>
                );
              })}
            </div>

            {/* Reset */}
            <div className="card" style={{padding:14,border:"1px solid #ef444420"}}>
              <div className="sec-title" style={{color:"#f87171"}}>🗑️ Dados armazenados</div>
              <div style={{fontSize:11,color:"#606890",marginBottom:12}}>
                Meses com dados: {Object.keys(dados).length}<br/>
                Reserva: {fmtI(reserva)}<br/>
                Pagos no imóvel: {fmtI(pagos)}
              </div>
              <button className="btn" style={{background:"#120a0a",color:"#f87171",border:"1px solid #ef444430",padding:10,fontSize:12,width:"100%"}} onClick={async()=>{
                if(confirm("Apagar TODOS os dados? Isso não pode ser desfeito.")) {
                  setDados({});setReserva(0);setPagos(0);
                  await window.storage.set("dv_dados","{}");
                  await window.storage.set("dv_reserva","0");
                  await window.storage.set("dv_pagos","0");
                }
              }}>
                Apagar todos os dados
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#080b18",borderTop:"1px solid #141828",display:"flex",padding:"8px 0 14px"}}>
        {[
          {id:"home",   emoji:"🏠",l:"Home"},
          {id:"gastos", emoji:"➕",l:"Gastos"},
          {id:"analise",emoji:"📊",l:"Análise"},
          {id:"metas",  emoji:"🎯",l:"Metas"},
          {id:"config", emoji:"⚙️",l:"Config"},
        ].map(t=>(
          <button key={t.id} className="tab-btn" style={{color:tab===t.id?"#4f6fff":"#505870"}} onClick={()=>setTab(t.id)}>
            <span style={{fontSize:20}}>{t.emoji}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?700:400}}>{t.l}</span>
            {tab===t.id&&<div style={{width:4,height:4,background:"#4f6fff",borderRadius:"50%"}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
