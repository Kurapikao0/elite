import { useEffect, useState } from 'react';
import type { EditableItem, SiteContent } from '../data/defaultContent';
import { CardModal, Link, SiteShell } from '../components/SiteShell';
import type { CardItem } from '../services/cards';

type CollectionKind = 'kings' | 'dukes' | 'admirals';

function Collection({ page, title, subtitle, items, kind }: { page: string; title: string; subtitle: string; items: EditableItem[]; kind: CollectionKind }) {
  const [selected, setSelected] = useState<EditableItem | null>(null);
  return (
    <SiteShell page={page}>
      <main className={`section-container ${kind === 'kings' ? 'kings-section' : ''}`}>
        <h1 className="section-title">{title}</h1>
        <p className="section-subtitle">{subtitle}</p>
        {kind === 'dukes' && <div className="strategic-header">مرسوم ملوكي: يُمنح الدوقات السيادة الكاملة لإدارة شؤون المقاطعات الاستراتيجية ودعم قرارات العرش العليا.</div>}
        {kind === 'admirals' && <div className="capital-section"><h3>عاصمة المملكة 🏛️</h3><p>الكتيبة الحاكمة: 『 ستورم 』 🌪️</p></div>}
        <div className={`${kind}-grid card-grid`}>
          {items.map((item) => (
            <button className={`${kind === 'kings' ? 'king' : kind === 'dukes' ? 'duke' : 'admiral'}-card content-card`} key={item.id} onClick={() => setSelected(item)}>
              <span className="item-avatar"><img src={item.image} alt={item.name} loading="lazy" /></span>
              <span className="guild-badge">{item.badge}</span>
              <strong className="item-name">{item.name}</strong>
              <span className="item-subtitle">{item.subtitle}</span>
              {kind === 'kings' && <p>{item.description}</p>}
            </button>
          ))}
        </div>
        {kind === 'kings' && <div className="back-home"><Link className="back-btn" to="/index.html">← العودة للرئيسية</Link></div>}
      </main>
      <CardModal item={selected} onClose={() => setSelected(null)} />
    </SiteShell>
  );
}

export function HomePage({ data, cards }: { data: SiteContent; cards: CardItem[] }) {
  const [disclosure, setDisclosure] = useState('');
  const [selected, setSelected] = useState<EditableItem | null>(null);
  return (
    <SiteShell page="/index.html">
      <section className="emperor-section">
        <div className="emperor-cover" style={{ backgroundImage: `linear-gradient(rgba(8,40,50,.15),rgba(6,21,27,.98)), url("${data.home.coverImage}")` }} />
        <div className="emperor-profile-container">
          <div className="wave-glow-avatar"><img src={data.home.founderImage} alt={data.home.founderName} /></div>
          <span className="emperor-founder-label">✦ {data.home.founderName} ✦</span>
          <span className="text-elite-normal">✧ {data.home.slogan} ✧</span>
          <h1 className="emperor-name"><span>{data.home.title}</span></h1>
          <div className="interactive-btn-group">
            <button className="btn-interactive btn-royal" onClick={() => setDisclosure(disclosure === 'royal' ? '' : 'royal')}>📜 السجل الإمبراطوري</button>
            <button className="btn-interactive btn-royal" onClick={() => setDisclosure(disclosure === 'about' ? '' : 'about')}>🛡️ عن إيليت</button>
            <button className="btn-interactive btn-royal" onClick={() => setDisclosure(disclosure === 'leaders' ? '' : 'leaders')}>قادة إيليت العليا</button>
            <Link to="/legends.html" className="btn-interactive btn-royal">👑 ملوك إيليت</Link>
          </div>
          {disclosure === 'royal' && <div className="info-disclosure-box"><h3>{data.home.royalTitle}</h3><p>{data.home.royalDescription}</p></div>}
          {disclosure === 'about' && <div className="info-disclosure-box"><h3>{data.home.aboutTitle}</h3><p>{data.home.aboutDescription}</p></div>}
          {disclosure === 'leaders' && <div className="leaders-disclosure-container leaders-visible"><div className="deputies-free-flow-stack">{data.leaders.map((person) => <button className="single-leader-row" key={person.id} onClick={() => setSelected(person)}><img className="leader-thumb" src={person.image} alt="" /><span><b>{person.title}</b><br />{person.name}</span></button>)}</div></div>}
        </div>
      </section>
      <div className="central-action-area">
        <Link to="/dukes.html" className="btn-dukes-mega">♟ مجلس دوقات المملكة الإستراتيجي</Link>
        <div className="custom-addons-container"><Link className="addon-glow-btn btn-addon-news" to="/news.html">أخبار المملكة الإمبراطورية</Link><Link className="addon-glow-btn btn-addon-fun" to="/fun.html">اكتشف هويتك الحقيقية</Link><a className="addon-glow-btn btn-addon-dev" href="https://wa.me/966556380237" target="_blank" rel="noreferrer">تواصل مع المطور</a></div>
      </div>
      <section className="section-container"><h2 className="section-title">إدارات وأقسام النخبة</h2><div className="grid-layout">{data.departments.map((department) => <article className="card" key={department.title}><i className={`fa-solid ${department.icon}`} /><h3>{department.title}</h3><p>{department.description}</p></article>)}</div></section>
      <section className="section-container public-cards"><h2 className="section-title">بطاقات المملكة</h2><div className="cards-public-grid">{cards.map(card => <article className="public-card" key={card.id}><img src={card.imageUrl} alt={card.title} loading="lazy"/><div><h3>{card.title}</h3><p>{card.description}</p></div></article>)}</div></section>
      <CardModal item={selected} onClose={() => setSelected(null)} />
    </SiteShell>
  );
}

export function KingsPage({ data }: { data: SiteContent }) { return <Collection page="/legends.html" title="ملوك مملكة إيليت 👑" subtitle="الملوك الذين تحمل أسماؤهم ثقل الأبدية — قائدا العرش الأسمى في إيليت" items={data.kings} kind="kings" />; }
export function DukesPage({ data }: { data: SiteContent }) { return <Collection page="/dukes.html" title="المجلس الإستراتيجي لدوقات المملكة" subtitle="صفوة الحكام وأصحاب المقاطعات السيادية الكبرى في إمبراطورية النخبة" items={data.dukes} kind="dukes" />; }
export function AdmiralsPage({ data }: { data: SiteContent }) { return <Collection page="/admirals.html" title="مجلس الأدميرالات وقادة النقابات العسكرية" subtitle="القوة الضاربة والقبضة الحديدية لحماية أراضي التاج الإمبراطوري" items={data.admirals} kind="admirals" />; }

export function NewsPage({ data }: { data: SiteContent }) {
  return <SiteShell page="/news.html"><main className="section-container page-spacer"><h1 className="section-title">أخبار التاج الإمبراطوري 📜</h1><p className="section-subtitle">آخر مستجدات وأحداث إمبراطورية إيليت</p><article className="news-card"><small>{data.news.date}</small><h2>{data.news.title}</h2><p>{data.news.intro}</p><div className="guild-list">{data.news.guilds.map((guild) => <p key={guild}>{guild}</p>)}</div></article><section className="stats-box"><h2>الخلاصة الإمبراطورية 🏛️</h2><div className="stats-grid-2x2">{data.news.stats.map((stat) => <article className="stat-card-mini" key={stat.label}><i className={`fa-solid ${stat.icon}`} /><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div><Link className="back-btn" to="/index.html">العودة إلى الصفحة الرئيسية</Link></section></main></SiteShell>;
}

export function FunPage({ data }: { data: SiteContent }) {
  const [result, setResult] = useState('اضغط على الزر لمعرفة مصيرك...');
  const [rolling, setRolling] = useState(false);
  useEffect(() => { if (!rolling) return; const timer = window.setTimeout(() => { setResult(data.fun.titles[Math.floor(Math.random() * data.fun.titles.length)] ?? ''); setRolling(false); }, 400); return () => window.clearTimeout(timer); }, [rolling, data.fun.titles]);
  return <SiteShell page="/fun.html"><main className="fun-wrapper"><div className="fun-generator-box"><Link className="back-btn" to="/index.html">العودة للرئيسية</Link><div className="crystal-ball">🔮</div><h1>{data.fun.title}</h1><p>{data.fun.description}</p><button className="btn-roll" disabled={rolling} onClick={() => { setResult('جاري قراءة مصيرك...'); setRolling(true); }}>🎲 اسحب لقبك الحالي</button><div className="result-display" aria-live="polite">{result}</div></div></main></SiteShell>;
}
