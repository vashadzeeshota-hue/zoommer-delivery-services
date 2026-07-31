import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle, BarChart3, Bell, Bike, Box, Check, CheckCircle2, ChevronDown,
  ClipboardList, Clock3, Handshake, LayoutDashboard, Mail, Map, MapPin,
  Menu, PackageCheck, RefreshCw, Search, Settings, SlidersHorizontal, Truck,
  UserRound, Users, X, Zap
} from "lucide-react";
import "./styles.css";

const seedOrders = [
  { id:"ZMG-DEMO-0124", customer:"მიმღები 01", phone:"000 00 00 01", city:"ბათუმი", address:"სატესტო მისამართი №1", service:"express", status:"new", time:"10:41", weight:"1.20 კგ", size:"20 × 15 × 10 სმ", payment:"წინასწარ", cod:"0.00 ₾" },
  { id:"ZMG-DEMO-0123", customer:"მიმღები 02", phone:"000 00 00 02", city:"თბილისი", address:"სატესტო მისამართი №2", service:"postal", status:"new", time:"10:42", weight:"0.80 კგ", size:"18 × 12 × 8 სმ", payment:"COD", cod:"149.00 ₾" },
  { id:"ZMG-DEMO-0125", customer:"მიმღები 03", phone:"000 00 00 03", city:"ქუთაისი", address:"სატესტო მისამართი №3", service:"internal", status:"assigned", time:"10:39", weight:"2.40 კგ", size:"30 × 22 × 12 სმ", payment:"წინასწარ", cod:"0.00 ₾" },
  { id:"ZMG-DEMO-0126", customer:"მიმღები 04", phone:"000 00 00 04", city:"თბილისი", address:"სატესტო მისამართი №4", service:"postal", status:"completed", time:"10:38", weight:"1.10 კგ", size:"22 × 16 × 9 სმ", payment:"წინასწარ", cod:"0.00 ₾" },
  { id:"ZMG-DEMO-0127", customer:"მიმღები 05", phone:"000 00 00 05", city:"რუსთავი", address:"სატესტო მისამართი №5", service:"express", status:"exception", time:"10:37", weight:"0.55 კგ", size:"16 × 10 × 7 სმ", payment:"COD", cod:"89.00 ₾" },
  { id:"ZMG-DEMO-0128", customer:"მიმღები 06", phone:"000 00 00 06", city:"თბილისი", address:"სატესტო მისამართი №6", service:"internal", status:"new", time:"10:36", weight:"3.20 კგ", size:"38 × 26 × 15 სმ", payment:"წინასწარ", cod:"0.00 ₾" },
  { id:"ZMG-DEMO-0129", customer:"მიმღები 07", phone:"000 00 00 07", city:"ზუგდიდი", address:"სატესტო მისამართი №7", service:"postal", status:"assigned", time:"10:35", weight:"0.95 კგ", size:"20 × 14 × 8 სმ", payment:"COD", cod:"219.00 ₾" },
  { id:"ZMG-DEMO-0130", customer:"მიმღები 08", phone:"000 00 00 08", city:"თბილისი", address:"სატესტო მისამართი №8", service:"express", status:"transit", time:"10:34", weight:"1.85 კგ", size:"28 × 19 × 10 სმ", payment:"წინასწარ", cod:"0.00 ₾" },
  { id:"ZMG-DEMO-0131", customer:"მიმღები 09", phone:"000 00 00 09", city:"გორი", address:"სატესტო მისამართი №9", service:"postal", status:"new", time:"10:33", weight:"0.70 კგ", size:"17 × 11 × 8 სმ", payment:"წინასწარ", cod:"0.00 ₾" },
];

const services = {
  postal: { label:"საფოსტო", icon:Mail, eta:"2–4 დღე", price:"5.00 ₾" },
  express: { label:"ექსპრესი", icon:Zap, eta:"1 დღე", price:"12.00 ₾" },
  internal: { label:"შიდა კურიერი", icon:Bike, eta:"დღეს", price:"10.00 ₾" }
};
const statuses = {
  new:["ახალი","orange"], assigned:["რეგისტრირებული","blue"], transit:["კურიერი გზაშია","blue"],
  completed:["მიწოდება დასრულდა","green"], exception:["შეფერხება","red"]
};
const nav = [
  [LayoutDashboard,"დღის ორდერები"], [ClipboardList,"შეკვეთები"], [PackageCheck,"რეგისტრაციები"],
  [Users,"კურიერები"], [Handshake,"პარტნიორები"], [Map,"რუკა"], [BarChart3,"ანგარიშები"],
  [AlertTriangle,"გამონაკლისები"], [Settings,"პარამეტრები"]
];

function App(){
  const [orders,setOrders]=useState(seedOrders);
  const [dataSource,setDataSource]=useState("demo");
  const [selectedId,setSelectedId]=useState(seedOrders[0].id);
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [serviceFilter,setServiceFilter]=useState("all");
  const [activeService,setActiveService]=useState(seedOrders[0].service);
  const [team,setTeam]=useState("City Express • ბათუმი");
  const [toast,setToast]=useState("");
  const selected=orders.find(o=>o.id===selectedId) || orders[0];
  useEffect(()=>{
    let active=true;
    fetch("/api/orders")
      .then(response=>{
        if(!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then(data=>{
        if(active && Array.isArray(data.orders) && data.orders.length){
          setOrders(data.orders);
          setSelectedId(data.orders[0].id);
          setActiveService(data.orders[0].service);
          setDataSource("neon");
        }
      })
      .catch(()=>setDataSource("demo"));
    return ()=>{active=false};
  },[]);
  const filtered=useMemo(()=>orders.filter(o=>{
    const q=query.toLowerCase();
    return (!q || `${o.id} ${o.customer} ${o.phone} ${o.city}`.toLowerCase().includes(q))
      && (statusFilter==="all" || o.status===statusFilter)
      && (serviceFilter==="all" || o.service===serviceFilter);
  }),[orders,query,statusFilter,serviceFilter]);
  const counts={new:orders.filter(o=>o.status==="new").length, assigned:orders.filter(o=>o.status==="assigned").length, transit:orders.filter(o=>o.status==="transit").length, completed:342, exception:orders.filter(o=>o.status==="exception").length};
  const register=async()=>{
    const previous=orders;
    setOrders(rows=>rows.map(o=>o.id===selected.id?{...o,service:activeService,status:"assigned"}:o));
    try{
      if(dataSource==="neon"){
        const response=await fetch("/api/orders",{
          method:"PATCH",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({orderId:selected.id,service:activeService,partnerTeam:team})
        });
        if(!response.ok) throw new Error("Assignment failed");
      }
      setToast(`${selected.id} წარმატებით დარეგისტრირდა`);
    }catch{
      setOrders(previous);
      setToast("რეგისტრაცია ვერ შესრულდა — სცადეთ ხელახლა");
    }
    window.setTimeout(()=>setToast(""),3000);
  };
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><strong>ZOOMMER</strong><span>DELIVERY</span></div>
      <nav>{nav.map(([Icon,label],i)=><button className={i===0?"active":""} key={label}><Icon/><span>{label}</span></button>)}</nav>
      <div className="sidebar-user"><div className="avatar">ნ</div><div><strong>ნინო ქავთარაძე</strong><span>ოპერატორი</span></div></div>
    </aside>
    <main>
      <header>
        <button className="icon-btn menu"><Menu/></button>
        <label className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ძებნა შეკვეთის ნომრით, მიმღებით, ტელეფონით..."/></label>
        <button className="icon-btn notify"><Bell/><i>5</i></button>
        <div className="profile"><div className="avatar">ნ</div><div><strong>ნინო ქავთარაძე</strong><span>ოპერატორი</span></div><ChevronDown/></div>
      </header>
      <section className="workspace">
        <div className="content">
          <section className="summary">
            <Summary icon={Box} label="ახალი ორდერი" value={counts.new} tone="orange"/>
            <Summary icon={UserRound} label="რეგისტრირებული" value={counts.assigned} tone="blue"/>
            <Summary icon={Truck} label="კურიერი გზაში" value={counts.transit} tone="blue"/>
            <Summary icon={CheckCircle2} label="მიწოდებულია" value={counts.completed} tone="green"/>
            <Summary icon={AlertTriangle} label="შეფერხება" value={counts.exception} tone="red"/>
          </section>
          <section className="queue">
            <div className="queue-title"><div><h1>დღის ორდერები</h1><span>Zoommer.ge-დან მიღებული მიწოდებები · {dataSource==="neon"?"Neon სინქრონიზებულია":"დემო რეჟიმი"}</span></div><button className="refresh" onClick={()=>window.location.reload()}><RefreshCw/> სინქრონიზაცია</button></div>
            <div className="filters">
              <div className="segmented">
                {[["all","ყველა"],["new","ახალი"],["assigned","რეგისტრირებული"],["exception","შეფერხება"]].map(([v,l])=><button className={statusFilter===v?"on":""} onClick={()=>setStatusFilter(v)} key={v}>{l}</button>)}
              </div>
              <label><SlidersHorizontal/><select value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)}><option value="all">ყველა სერვისი</option><option value="postal">საფოსტო</option><option value="express">ექსპრესი</option><option value="internal">შიდა კურიერი</option></select></label>
              <span className="result-count">{filtered.length} ორდერი</span>
            </div>
            <div className="table-wrap"><table>
              <thead><tr><th></th><th>შეკვეთის ნომერი</th><th>მიმღები</th><th>დანიშნულება</th><th>სერვისი</th><th>წყარო</th><th>სტატუსი</th><th>დრო</th></tr></thead>
              <tbody>{filtered.map(o=>{const S=services[o.service], I=S.icon, st=statuses[o.status]; return <tr className={selected.id===o.id?"selected":""} onClick={()=>{setSelectedId(o.id);setActiveService(o.service)}} key={o.id}>
                <td><span className="checkbox">{selected.id===o.id&&<Check/>}</span></td><td><strong className="order-id">{o.id}</strong></td>
                <td><strong>{o.customer}</strong><small>{o.phone}</small></td><td><strong>{o.city}</strong><small>{o.address}</small></td>
                <td><span className="service"><I/>{S.label}</span></td><td><span className="source">zoommer.ge</span></td>
                <td><span className={`status ${st[1]}`}><i/>{st[0]}</span></td><td>{o.time}</td>
              </tr>})}</tbody>
            </table></div>
            <div className="pagination"><span>ნაჩვენებია 1–{filtered.length} / {orders.length}</span><div><button>‹</button><button className="current">1</button><button>2</button><button>3</button><button>›</button></div></div>
          </section>
        </div>
        <aside className="inspector">
          <div className="inspector-head"><div><span>შეკვეთა</span><strong>{selected.id}</strong></div><button className="icon-btn"><X/></button></div>
          <div className="tabs"><button className="active">დეტალები</button><button>ისტორია</button></div>
          <Info icon={UserRound} title="მიმღები"><strong>{selected.customer}</strong><span>{selected.phone}</span></Info>
          <Info icon={MapPin} title="მისამართი"><strong>{selected.city}</strong><span>{selected.address}</span></Info>
          <Info icon={Box} title="პაკეტის ინფორმაცია"><div className="package-grid"><span>წონა <b>{selected.weight}</b></span><span>ზომები <b>{selected.size}</b></span><span>გადახდა <b>{selected.payment}</b></span><span>COD <b>{selected.cod}</b></span></div></Info>
          <section className="service-choice"><h3>სერვისის არჩევა</h3><div className="service-cards">{Object.entries(services).map(([key,s])=>{const I=s.icon; return <button className={activeService===key?"active":""} onClick={()=>setActiveService(key)} key={key}>{activeService===key&&<i><Check/></i>}<I/><strong>{s.label}</strong><span>{s.eta}</span><b>{s.price}</b></button>})}</div></section>
          <section className="assignment"><label>კურიერი / გუნდი</label><div className="select-like"><Users/><select value={team} onChange={e=>setTeam(e.target.value)}><option>City Express • ბათუმი</option><option>საქართველოს ფოსტა • ბათუმი</option><option>Zoommer შიდა გუნდი • თბილისი</option></select></div></section>
          <section className="sla"><div><Clock3/><span>ფასი და SLA</span></div><p><span>მიწოდების ვადა <b>{services[activeService].eta}</b></span><span>ჯამური ფასი <b>{services[activeService].price}</b></span></p></section>
          <button className="primary" onClick={register}><PackageCheck/> პაკეტის რეგისტრაცია / მინიჭება</button>
          <section className="activity"><h3>ბოლო აქტივობები</h3><div className="timeline"><p><i/><time>10:41</time><span>შეკვეთა მიღებულია<br/><small>zoommer.ge</small></span></p><p><i/><time>10:42</time><span>მონაცემები გადამოწმებულია<br/><small>ნინო ქავთარაძე</small></span></p></div></section>
        </aside>
      </section>
    </main>
    {toast&&<div className="toast"><CheckCircle2/>{toast}</div>}
  </div>
}
function Summary({icon:Icon,label,value,tone}){return <div className="summary-item"><span className={`summary-icon ${tone}`}><Icon/></span><div><small>{label}</small><strong>{value}</strong></div></div>}
function Info({icon:Icon,title,children}){return <section className="info"><Icon/><div><h3>{title}</h3>{children}</div></section>}

createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
