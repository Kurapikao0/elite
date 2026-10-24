import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadContent } from './services/content';
import { loadCards, type CardItem } from './services/cards';
import starterCards from './data/cards.json';
import { defaultContent, type SiteContent } from './data/defaultContent';
import { HomePage, KingsPage, DukesPage, AdmiralsPage, NewsPage, FunPage } from './pages/PublicPages';
import { AdminPage } from './pages/AdminPage';
import './styles.css';
import '../assets/css/style.css';
import '../assets/css/home.css';

const legacyScript = document.querySelector<HTMLScriptElement>('script[src="assets/js/main.js"]');
legacyScript?.remove();
for (const legacyNode of Array.from(document.body.children)) {
	if (legacyNode.id !== 'root' && legacyNode.tagName !== 'SCRIPT') legacyNode.remove();
}

function App(){const [content,setContent]=useState<SiteContent>(defaultContent);const [cards,setCards]=useState<CardItem[]>(starterCards);useEffect(()=>{let alive=true;void loadContent().then(data=>{if(alive)setContent(data)});void loadCards().then(data=>{if(alive)setCards(data)});return()=>{alive=false}},[]);const page=window.location.pathname.split('/').pop()??'';if(page==='legends.html')return <KingsPage data={content}/>;if(page==='dukes.html')return <DukesPage data={content}/>;if(page==='admirals.html')return <AdmiralsPage data={content}/>;if(page==='news.html')return <NewsPage data={content}/>;if(page==='fun.html')return <FunPage data={content}/>;if(page==='admin.html')return <AdminPage content={content} onChange={setContent} cards={cards} onCardsChange={setCards}/>;return <HomePage data={content} cards={cards}/>;}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
