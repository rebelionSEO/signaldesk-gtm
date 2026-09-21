import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const evidence = [
  { id:'E1', kind:'Company', title:'PostHog homepage', url:'https://posthog.com/', finding:'PostHog presents a broad product platform for engineers rather than a single analytics tool.', use:'Supports the platform-comprehension hypothesis.' },
  { id:'E2', kind:'Company', title:'PostHog pricing', url:'https://posthog.com/pricing', finding:'Usage-based pricing and free allowances reduce the barrier to product-led evaluation.', use:'Shapes a low-friction activation experiment.' },
  { id:'E3', kind:'Company', title:'PostHog handbook', url:'https://posthog.com/handbook', finding:'The company publicly documents an unusually candid, engineer-led culture.', use:'Supports a transparent build-in-public creative mechanism.' },
  { id:'E4', kind:'Community clue', title:'Public developer discussions', url:'https://www.reddit.com/search/?q=posthog', finding:'Public discussions contain implementation questions and strong opinions, but they are directional clues rather than representative research.', use:'Provides questions to validate, not market conclusions.' },
  { id:'E13', kind:'Peer', title:'Mixpanel', url:'https://mixpanel.com/home/', finding:'Analytics, replay, experiments, and AI analysis create meaningful capability overlap.', use:'Compare the journey from behavioral question to action.' },
  { id:'E14', kind:'Peer', title:'Amplitude', url:'https://amplitude.com/', finding:'A broad analytics platform can struggle to make the next decision feel concrete.', use:'Differentiate through visible human judgment and rejected fixes.' },
  { id:'E15', kind:'Peer', title:'LaunchDarkly', url:'https://launchdarkly.com/', finding:'Feature flags, progressive rollout, rollback, and experiments offer a useful safe-release reference.', use:'Borrow the proof mechanism, not the positioning.' }
]

const ideas = [
  { title:'One bug. Show your work.', label:'NOW · PRODUCT PROOF', body:'Plant one realistic bug in a synthetic app. Let PostHog observe it, propose a change, and show every signal behind the recommendation. A human still decides what ships.', metric:'Qualified participants who activate a second product', cap:'$1,000 cash cap' },
  { title:'Break the hedgehog', label:'NEXT · COMMUNITY', body:'Invite developers to find where the workflow gets it wrong. Reward useful failures, publish the fixes, and turn skepticism into product evidence.', metric:'Useful failures reproduced and fixed', cap:'$2,500 cash cap' },
  { title:'Things we shipped. Things we should not have.', label:'LATER · EDITORIAL', body:'A candid teardown series about product decisions that looked clever until the data disagreed.', metric:'Technical readers reaching a product action', cap:'$750 cash cap' },
  { title:'Canary in the deployment', label:'LATER · FIELD TEST', body:'A small live challenge that makes safe release mechanics visible before asking anyone to believe a platform promise.', metric:'Teams completing the controlled release task', cap:'$1,500 cash cap' }
]

const peers = [
  ['Mixpanel','Direct competitor','Compare the path from a behavioral question to replay and experimentation. Win by exposing the failed hypothesis and inspected fix.','E13'],
  ['Amplitude','Direct competitor','Compare how a broad platform explains the next action. Win through visible human decisions and rejected recommendations.','E14'],
  ['LaunchDarkly','Creative reference','Study safe rollout and rollback as a proof mechanism. It is only a partial category comparison.','E15']
]

const scenarios = {
  flat:{label:'It falls flat',activation:20,pipeline:0,bookings:0},
  base:{label:'It goes to plan',activation:25,pipeline:18000,bookings:4500},
  great:{label:'It goes really well',activation:30,pipeline:36000,bookings:9000}
}

function money(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n) }

function StrategyPopup(){
  const [visible,setVisible]=useState(false)
  useEffect(()=>{
    let dismissed=false
    try{ dismissed=sessionStorage.getItem('signaldesk:showcase-popup:dismissed')==='yes' }catch{}
    const timer=setTimeout(()=>{ if(!dismissed)setVisible(true) },900)
    return()=>clearTimeout(timer)
  },[])
  function dismiss(){
    try{ sessionStorage.setItem('signaldesk:showcase-popup:dismissed','yes') }catch{}
    setVisible(false)
  }
  useEffect(()=>{
    if(!visible)return
    const close=e=>{ if(e.key==='Escape')dismiss() }
    window.addEventListener('keydown',close)
    return()=>window.removeEventListener('keydown',close)
  },[visible])
  if(!visible)return null
  return <aside className="strategy-popup" aria-labelledby="strategy-popup-title">
    <button className="popup-close" onClick={dismiss} aria-label="Dismiss strategy joke">×</button>
    <div className="popup-copy"><p>THIS GOT OUT OF HAND</p><h2 id="strategy-popup-title">Well, this strategy<br/>escalated quickly.</h2><span>One hunch. Four experiments. Somehow, a canary.</span><small>Let’s start with the small test.</small></div>
    <img src="/ron-burgundy-strategy.png" alt="Ron Burgundy reacting in his office"/>
  </aside>
}

function App(){
  const [tab,setTab]=useState('bet')
  const [scenario,setScenario]=useState('base')
  const [accounts,setAccounts]=useState(100)
  const [cash,setCash]=useState(1000)
  const selected=scenarios[scenario]
  const scale=accounts/100
  const pipeline=Math.round(selected.pipeline*scale)
  const bookings=Math.round(selected.bookings*scale)
  const total=cash+1000
  const level=bookings<=0?0:bookings<total?1:bookings<2*total?2:3
  const labels=['Uh-oh','Meh','Interesting','Worth another round']

  function reset(){ setScenario('base'); setAccounts(100); setCash(1000) }
  function download(){
    const text=`# One bug. Show your work.\n\nIndependent PostHog GTM thesis by Signaldesk.\n\n## Hypothesis\nPostHog may not need more generic demos. It may need memorable proof that its expanding platform can observe a real product problem, propose a change, and measure the result without losing developer trust.\n\n## Proposed experiment\nPlant one realistic bug in a synthetic app. Show the signals, the recommendation, the rejected alternatives, and the measured result. A human decides what ships.\n\n## Illustrative base case\n- Qualified accounts exposed: ${accounts}\n- Cash cap: ${money(cash)}\n- Modeled incremental pipeline: ${money(pipeline)}\n- Modeled bookings: ${money(bookings)}\n\nThese figures are planning assumptions, not PostHog data, industry benchmarks, or permission to spend.\n`
    const url=URL.createObjectURL(new Blob([text],{type:'text/markdown'})); const a=document.createElement('a'); a.href=url; a.download='signaldesk-posthog-case-study.md'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500)
  }

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="Signaldesk PostHog case study"><span className="mark">S</span><b>signaldesk</b><em>× PostHog</em></a><div className="header-actions"><button className="quiet" onClick={reset}>Reset</button><button onClick={download}>Download brief ↓</button></div></header>
    <section className="intro" id="top"><div><p className="eyebrow">INDEPENDENT PORTFOLIO THESIS · PUBLIC EVIDENCE</p><h1>One bug.<br/><span>Show your work.</span></h1><p className="lede">A proposed PostHog experiment that makes the product do the explaining. No inside access. No invented certainty. Just one strange, measurable bet.</p></div><aside className="note"><span>THE SHORT VERSION</span><b>Less pitch.<br/>More proof.</b><p>If the expanding platform is hard to understand, give developers a real problem and let them inspect how the system reasons through it.</p></aside></section>

    <nav className="tabs" aria-label="Case study sections">{[['bet','The bet'],['evidence','What we know'],['ideas','Other ideas'],['impact','Commercial impact']].map(([id,label])=><button className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav>

    {tab==='bet'&&<><StrategyPopup/><section className="page bet">
      <div className="thesis"><p className="eyebrow">THE WORKING THESIS</p><h2>PostHog may not need another generic demo.</h2><p>It may need memorable proof that the platform can observe a real product problem, propose a change, and measure the result without losing developer trust.</p><div className="chips"><span>Outside-in hypothesis</span><span>14-day discovery pilot</span><span>Human approval required</span></div></div>
      <div className="steps">{[['01','PLANT ONE BUG','A synthetic app. One agreed problem. No customer data.'],['02','SHOW THE WORK','Reveal the signals, the proposed fix, and what the system rejected.'],['03','COUNT SOMETHING','Track task completion, second-product use, and paid behavior.']].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div>
      <div className="decision"><div><p className="eyebrow">WHAT MAKES THIS A GTM BET</p><h2>The stunt earns its keep only if behavior changes.</h2></div><dl><div><dt>Primary signal</dt><dd>Qualified participants who activate a second product</dd></div><div><dt>Stop rule</dt><dd>Stop if tracking fails, the cash cap is reached, or developer trust worsens.</dd></div><div><dt>What it proves</dt><dd>Whether inspected product proof improves multi-product comprehension.</dd></div></dl></div>
    </section></>}

    {tab==='evidence'&&<section className="page evidence-page">
      <div className="section-head"><div><p className="eyebrow">FACTS, HUNCHES, MISSING PIECES</p><h2>A clue is not a conclusion.</h2></div><p>Every source supports a narrow claim. Competitive pages establish product overlap—not commercial performance.</p></div>
      <div className="peer-grid">{peers.map(([name,role,body,id])=><article key={name}><small>{role}</small><h3>{name}</h3><p>{body}</p><a href={evidence.find(e=>e.id===id).url} target="_blank" rel="noreferrer">Source {id} ↗</a></article>)}</div>
      <div className="sources"><h2>Evidence ledger</h2>{evidence.map(e=><details key={e.id}><summary><span>{e.id}</span><b>{e.title}</b><em>{e.kind}</em></summary><div><p>{e.finding}</p><strong>How it is used</strong><p>{e.use}</p><a href={e.url} target="_blank" rel="noreferrer">Open original source ↗</a></div></details>)}</div>
    </section>}

    {tab==='ideas'&&<section className="page ideas-page"><div className="section-head"><div><p className="eyebrow">CONTROLLED WEIRDNESS</p><h2>Four ideas. One gets to go first.</h2></div><p>Each concept needs a behavior, a bounded test, a stop rule, and evidence that earns the next investment.</p></div><div className="idea-list">{ideas.map((idea,i)=><article className={i===0?'featured':''} key={idea.title}><span>{idea.label}</span><h3>{idea.title}</h3><p>{idea.body}</p><footer><small>{idea.metric}</small><b>{idea.cap}</b></footer></article>)}</div></section>}

    {tab==='impact'&&<section className="page impact-page">
      <div className="section-head"><div><p className="eyebrow">ILLUSTRATIVE MODEL · NOT RESULTS</p><h2>Is this worth a shot?</h2></div><p>Change the inputs. The figures show sensitivity, not PostHog performance or an industry benchmark.</p></div>
      <div className="controls"><label>What if…<select value={scenario} onChange={e=>setScenario(e.target.value)}>{Object.entries(scenarios).map(([id,x])=><option value={id} key={id}>{x.label}</option>)}</select></label><label>Qualified accounts exposed<input type="number" min="10" max="1000" step="10" value={accounts} onChange={e=>setAccounts(Math.max(10,Number(e.target.value)||10))}/></label><label>Cash cap<input type="number" min="0" max="100000" step="250" value={cash} onChange={e=>setCash(Math.max(0,Number(e.target.value)||0))}/></label></div>
      <div className="impact-numbers"><article><span>Cash required</span><b>{money(cash)}</b><small>{money(total)} including illustrative team time</small></article><article><span>Potential extra pipeline</span><b>{money(pipeline)}</b><small>{money(bookings)} modeled bookings · 90 days</small></article></div>
      <div className="meter"><div><p className="eyebrow">THE SCREW-O-METER</p><h3>{labels[level]}</h3><span>{selected.label}</span></div><ol>{labels.map((x,i)=><li className={i===level?'selected':''} key={x}>{i===level?'▲ ':''}{x}</li>)}</ol><p>{level===0?'No incremental bookings in this scenario. Learn cheaply or change the idea.':level===1?'Some upside, but less than modeled cost. Keep it small.':level===2?'Enough upside to investigate. Run the smallest credible version first.':'This looks worth testing. Real results must earn another round.'}</p></div>
      <details className="math"><summary>Show the boring-but-useful assumptions</summary><div><p>Baseline activation: 20%. Scenario activation: {selected.activation}%. Activated-to-opportunity: 30%. Opportunity win rate: 25%. Opportunity value: $12,000. Internal time: $1,000.</p><p>Pipeline is opportunity value, not revenue. Bookings are modeled contract value, not recognized revenue or profit. Margin, retention, sales overhead, and uncertainty are excluded.</p></div></details>
    </section>}

    <footer className="footer"><div><b>signaldesk</b><span>Evidence-led GTM decisions</span></div><p>Independent portfolio work. Built from public sources. Assumptions are labeled; nothing here represents PostHog’s internal strategy or results.</p></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
