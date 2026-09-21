'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {X} from 'lucide-react';

const dismissalKey='signaldesk:posthog-bet-joke:dismissed';
let dismissedInMemory=false;

export function PostHogBetPopup(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   let dismissed=dismissedInMemory;
   try{dismissed ||= window.sessionStorage.getItem(dismissalKey)==='yes';}catch{/* Session storage is optional for this display preference. */}
   if(!dismissed)setVisible(true);
  },1200);
  return()=>window.clearTimeout(timer);
 },[]);
 function dismiss(){dismissedInMemory=true;try{window.sessionStorage.setItem(dismissalKey,'yes');}catch{/* Keep the in-memory preference if storage is unavailable. */}setVisible(false);}
 useEffect(()=>{
  if(!visible)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){dismissedInMemory=true;try{window.sessionStorage.setItem(dismissalKey,'yes');}catch{}setVisible(false);}};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[visible]);
 if(!visible)return null;
 return <aside className="hog-bet-popup" aria-labelledby="hog-bet-popup-title"><button className="hog-popup-close" onClick={dismiss} aria-label="Dismiss strategy joke"><X size={17}/></button><h2 id="hog-bet-popup-title">Well, this strategy<br/>escalated quickly.</h2><div className="hog-popup-body"><div><p>One hunch.<br/>Four experiments.<br/>Somehow, a canary.</p><small>Let’s start with the small test.</small></div><Image unoptimized src="/images/ron-burgundy-strategy.png" alt="Ron Burgundy reacting in his office" width={148} height={112}/></div></aside>;
}
