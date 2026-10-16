import React, { useMemo, useState } from 'react';
import { supabase } from './supabase';
import { ArrowRight, Gift, Heart, Sparkles, Star, TreePine, Trophy } from 'lucide-react';

const FINAL_MESSAGE = 'Cảm ơn bạn vì đã góp mặt trong một trong những kỷ niệm đẹp nhất của Huutri. Nếu trong thời gian qua Huutri có vô tình làm bạn buồn hay chưa hài lòng điều gì, mong bạn bỏ qua cho mình nhé. Cảm ơn vì đã xuất hiện trong hành trình của mình. 💗';

// Display only. Real prize selection and persistence happen on the server.
const DEMO_PRIZES = [
  { label: 'Nụ hôn lốc xoáy 💋', amount: 0, message: 'Một nụ hôn lốc xoáy từ Huutri đang chờ ní nhận nè 💋' },
  { label: '6.868 VNĐ', amount: 6868, message: 'Chúc mừng “Lộc phát lộc phát” nha ní! 🍀' },
  { label: '2.205 VNĐ', amount: 2205, message: 'Chúc mừng ní quay trúng số ngày sinh nhật của Huutri. Hãy nhớ kĩ nhé :3' },
  { label: '9.999 VNĐ', amount: 9999, message: 'Coi bộ hôm nay hên đó ní, mua vé số điiiii :)))' },
  { label: '8.386 VNĐ', amount: 8386, message: '8386 nha ní! ✨' }
];

const money = n => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0
}).format(n);

function prizeMessage(label, amount) {
  if (amount === 0 || (label || '').toLowerCase().includes('hôn')) return 'Một nụ hôn lốc xoáy từ Huutri đang chờ ní nhận nè 💋';
  if (amount === 6868) return 'Chúc mừng “Lộc phát lộc phát” nha ní! 🍀';
  if (amount === 2205) return 'Chúc mừng ní quay trúng số ngày sinh nhật của Huutri. Hãy nhớ kĩ nhé :3';
  if (amount === 9999) return 'Coi bộ hôm nay hên đó ní, mua vé số điiiii :)))';
  if (amount === 8386) return '8386 nha ní! ✨';
  return 'Kết quả đã được lưu lại. Cảm ơn ní nha!';
}

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [photoTheme, setPhotoTheme] = useState('tree');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [thanks, setThanks] = useState('');
  const [prize, setPrize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [participantId, setParticipantId] = useState(null);
  const [wallItems, setWallItems] = useState([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [wallTheme, setWallTheme] = useState('tree');

  const demoMode = !supabase;
  const finalMessage = useMemo(() => FINAL_MESSAGE, []);

  async function continueToWish(e) {
    e.preventDefault();
    setNotice('');
    if (name.trim().length < 2) return setNotice('Bạn nhập tên giúp mình nhé.');
    if (!/^[0-9+\s().-]{9,16}$/.test(phone.trim())) return setNotice('Số điện thoại chưa đúng định dạng.');
    setScreen('wish');
  }

  async function submitWish(e) {
    e.preventDefault();
    setNotice('');
    if (message.trim().length < 3) return setNotice('Viết cho mình ít nhất vài lời nha.');
    setBusy(true);
    try {
      if (supabase) {
        // Public writes go through the Edge Function; the browser never gets service-role access.
        const { data, error } = await supabase.functions.invoke('submit-wish', {
          body: { name: name.trim(), phone: phone.trim(), message: message.trim(), theme: photoTheme }
        });
        if (error) throw error;
        if (!data?.spin_token) throw new Error(data?.error || 'Máy chủ chưa trả mã lượt quay.');
        setParticipantId(data.spin_token); // opaque, one-person spin token; not a database ID
      } else {
        setParticipantId('demo-' + Date.now());
      }
      setThanks('Lời chúc của bạn đã được cất giữ thật cẩn thận.');
      setScreen('thanks');
    } catch (err) {
      setNotice(err?.message || 'Chưa gửi được lời chúc. Bạn thử lại nhé.');
    } finally {
      setBusy(false);
    }
  }

  async function spin() {
    if (busy || prize !== null) return;
    setBusy(true);
    setNotice('');
    try {
      let chosen, index;
      if (supabase) {
        if (!participantId || participantId.startsWith('demo-')) throw new Error('Thiếu mã lượt quay hợp lệ.');
        const { data, error } = await supabase.functions.invoke('spin-prize', { body: { spin_token: participantId } });
        if (error) throw error;
        if (typeof data?.amount_vnd !== 'number') throw new Error(data?.error || 'Chưa có kết quả quay.');
        const matchedPrize = DEMO_PRIZES.find(p => p.amount === data.amount_vnd);
        chosen = { ...(matchedPrize || { amount: data.amount_vnd, label: money(data.amount_vnd), message: prizeMessage(data.prize_label, data.amount_vnd) }), ...(data.prize_label ? { label: data.prize_label } : {}), ...(data.message ? { message: data.message } : {}) };
        index = Math.max(0, DEMO_PRIZES.findIndex(p => p.amount === data.amount_vnd));
      } else {
        index = Math.floor(Math.random() * DEMO_PRIZES.length);
        chosen = DEMO_PRIZES[index];
      }
      setRotation(v => v + 1440 + (360 - (index * (360 / DEMO_PRIZES.length))) + 30);
      window.setTimeout(() => { setPrize(chosen); setBusy(false); }, 1800);
    } catch (err) {
      setNotice(err?.message || 'Không thể quay lúc này.');
      setBusy(false);
    }
  }

  async function openWall() {
    setScreen('wall'); setWallLoading(true); setNotice('');
    try {
      if (supabase) {
        const { data, error } = await supabase.functions.invoke('public-wishes', { body: {} });
        if (error) throw error;
        setWallItems(data?.wishes || []);
      } else {
        setWallItems([
          { display_name: 'Một người bạn', message: 'Chúc Huutri tốt nghiệp thật vui, chặng đường mới luôn rực rỡ nha!', visual_theme: 'tree' },
          { display_name: 'Ní thân thương', message: '8386 nha ní ✨', visual_theme: 'trophy' }
        ]);
      }
    } catch (err) { setNotice(err?.message || 'Chưa tải được cây lời chúc.'); }
    finally { setWallLoading(false); }
  }

  function restart() {
    setName(''); setPhone(''); setMessage(''); setPrize(null); setNotice('');
    setParticipantId(null); setScreen('welcome');
  }

  return (
    <main className="site-shell">
      {screen !== 'final-message' && <nav className="topbar">
        <a className="brand" href="#" onClick={e => {e.preventDefault(); restart();}}>
          <span className="brand-mark"><Sparkles size={17}/></span>
          <span>MY GRADUATION</span>
        </a>
        <button className="wall-nav" onClick={openWall}>Cây lời chúc ↗</button><span className="top-note">A NEW CHAPTER BEGINS</span>
      </nav>}

      {screen === 'welcome' && <section className="hero page-enter">
        <div className="hero-copy">
          <span className="eyebrow"><Star size={14}/> A DAY TO REMEMBER</span>
          <h1>Một chặng đường<br/><em>đã khép lại.</em></h1>
          <p className="lead">Và một hành trình mới đang chờ phía trước. Nếu bạn không thể đến dự lễ tốt nghiệp, hãy để lại cho mình vài dòng nhé.</p>
          <form className="paper-form" onSubmit={continueToWish}>
            <label>Họ và tên<input value={name} onChange={e => setName(e.target.value)} placeholder="Tên của bạn" maxLength={80} required /></label>
            <label>Số điện thoại<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Để mình biết lời chúc từ ai" inputMode="tel" maxLength={20} required /></label>
            <p className="privacy-note">Thông tin chỉ dùng để lưu lời chúc và liên hệ trao quà nếu có.</p>
            {notice && <p className="notice">{notice}</p>}
            <button className="primary-btn" type="submit">Gửi lời chúc <ArrowRight size={17}/></button>
          </form>
        </div>
        <div className="hero-art">
          <div className="sun-disc"></div>
          <div className="photo-placeholder"><span className="photo-corner">MEMORIES</span><div className="cap-illustration">✦</div><p>YOUR PHOTO<br/><small>Thay bằng ảnh của bạn</small></p></div>
          <div className="sticker sticker-one"><Heart size={17} fill="currentColor"/> made with love</div>
          <div className="sticker sticker-two">CLASS OF<br/><b>2026</b></div>
          <span className="art-caption">The best is yet to come.</span>
        </div>
      </section>}

      {screen === 'wish' && <section className="inner-page page-enter">
        <button className="back-link" onClick={() => setScreen('welcome')}>← Quay lại</button>
        <span className="eyebrow"><Heart size={14}/> A NOTE FOR THE GRADUATE</span>
        <h2>Gửi mình vài <em>điều đẹp đẽ.</em></h2>
        <p className="lead narrow">Cảm ơn {name.trim()} đã ghé qua. Một lời chúc, một kỷ niệm hay một câu trêu đùa đều đáng quý cả.</p>
        <div className="theme-picker">
          <button className={photoTheme === 'tree' ? 'theme active' : 'theme'} onClick={() => setPhotoTheme('tree')} type="button"><span>🌳</span>Cây lời chúc</button>
          <button className={photoTheme === 'trophy' ? 'theme active' : 'theme'} onClick={() => setPhotoTheme('trophy')} type="button"><span>🏆</span>Chiếc cúp</button>
          <button className={photoTheme === 'stars' ? 'theme active' : 'theme'} onClick={() => setPhotoTheme('stars')} type="button"><span>✨</span>Bầu trời sao</button>
        </div>
        <form className="wish-form" onSubmit={submitWish}>
          <div className={`wish-art ${photoTheme}`}>
            <span className="art-emoji">{photoTheme === 'tree' ? '🌳' : photoTheme === 'trophy' ? '🏆' : '🌌'}</span>
            <span className="art-words">{photoTheme === 'tree' ? 'Let your wishes grow' : photoTheme === 'trophy' ? 'A little celebration' : 'Written in the stars'}</span>
          </div>
          <label>Lời nhắn của bạn<textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Chúc mừng tốt nghiệp nha... hoặc kể mình nghe một kỷ niệm 💌" rows={5} maxLength={1200} required /></label>
          <div className="form-foot"><span>{message.length}/1200 ký tự</span><button className="primary-btn" disabled={busy} type="submit">{busy ? 'Đang gửi…' : 'Gửi lời chúc'} <ArrowRight size={17}/></button></div>
          {notice && <p className="notice">{notice}</p>}
        </form>
      </section>}

      {screen === 'wall' && <section className="inner-page wall-page page-enter">
        <button className="back-link" onClick={() => { setNotice(''); setScreen('welcome'); }}>← Về trang đầu</button>
        <span className="eyebrow"><Heart size={14}/> OUR LITTLE MEMORY GARDEN</span>
        <h2>Những lời chúc <em>được treo lại.</em></h2>
        <p className="lead narrow">Mỗi lời nhắn là một chiếc lá nhỏ trong kỷ niệm tốt nghiệp của Huutri.</p>
        <div className="theme-picker wall-picker">
          <button className={wallTheme === 'tree' ? 'theme active' : 'theme'} onClick={() => setWallTheme('tree')}><TreePine size={18}/> Cây lời chúc</button>
          <button className={wallTheme === 'trophy' ? 'theme active' : 'theme'} onClick={() => setWallTheme('trophy')}><Trophy size={18}/> Cúp kỷ niệm</button>
        </div>
        <div className={'memory-display ' + wallTheme}>
          <div className="memory-symbol">{wallTheme === 'tree' ? <TreePine size={106} strokeWidth={1.15}/> : <Trophy size={100} strokeWidth={1.15}/>}</div>
          <div className="memory-caption">{wallTheme === 'tree' ? 'Mỗi lời chúc là một chiếc lá' : 'Một chiếc cúp dành cho những người thương'}</div>
          <div className="hanging-wishes">{wallLoading ? <p>Đang gom những lời chúc về đây…</p> : wallItems.length ? wallItems.map((item, i) => <article className={'hanging-note note-' + (i % 6)} key={item.id || (item.display_name + '-' + i)}><span className="note-pin">✦</span><strong>{item.display_name || item.participants?.display_name || 'Một người bạn'}</strong><p>{item.message}</p></article>) : <p className="empty-wall">Chưa có lời chúc nào được treo lên. Ní là người mở đầu nhé! 💌</p>}</div>
        </div>
        {notice && <p className="notice">{notice}</p>}
        <button className="secondary-btn wall-refresh" onClick={openWall}>Làm mới lời chúc</button>
      </section>}

      {screen === 'thanks' && <section className="inner-page thanks-page page-enter">
        <div className="thanks-seal"><Heart size={29} fill="currentColor"/></div>
        <span className="eyebrow">MESSAGE RECEIVED</span>
        <h2>Cảm ơn bạn <em>thật nhiều!</em></h2>
        <p className="thanks-quote">“{thanks}”</p>
        <p className="lead narrow">Lời chúc của bạn đã được treo lên cây kỷ niệm của Huutri.</p>
        <div className="wheel-card">
          <span className="eyebrow"><Gift size={14}/> A LITTLE GIFT FOR YOU</span>
          <h3>Một món quà nhỏ, gửi bạn lấy may.</h3>
          <p className="muted">{demoMode ? 'Chế độ demo: kết quả không phải phần thưởng thật và không được lưu.' : 'Mỗi người có một lượt quay. Máy chủ quyết định và lưu kết quả; quà sẽ được chủ website kiểm tra trước khi chuyển.'}</p>
          <div className="wheel-wrap">
            <div className="wheel-pointer"></div>
            <div className="wheel" style={{transform: `rotate(${rotation}deg)`}}>
              {DEMO_PRIZES.map((p, i) => <div className="wheel-label" key={i} style={{transform: `rotate(${i*(360/DEMO_PRIZES.length)+36}deg) translateY(-79px) rotate(-${i*(360/DEMO_PRIZES.length)+36}deg)`}}>{p.amount === 0 ? '💋' : p.amount.toLocaleString('vi-VN')}</div>)}
              <div className="wheel-center">🎓</div>
            </div>
          </div>
          {prize === null ? <button className="primary-btn center-btn" onClick={spin} disabled={busy}>{busy ? 'Đang quay…' : 'Quay món quà'} <Sparkles size={17}/></button> :
            <div className="prize-result"><span>{demoMode ? 'KẾT QUẢ DEMO — KHÔNG CÓ GIÁ TRỊ THANH TOÁN' : 'PHẦN QUÀ ĐÃ ĐƯỢC MÁY CHỦ GHI NHẬN'}</span><strong>{prize.label}</strong><p>{prize.message}</p><button className="secondary-btn" onClick={() => setScreen('final-message')}>Hoàn tất</button></div>}
          {notice && <p className="notice">{notice}</p>}
        </div>
      </section>}

      {screen === 'final-message' ? <section className="final-message-page page-enter"><p>{finalMessage}</p></section> : <footer className="footer"><span>MADE WITH <Heart size={12} fill="currentColor"/> FOR THE PEOPLE WHO MATTER</span><span>CLASS OF 2026</span></footer>}
    </main>
  );
}
