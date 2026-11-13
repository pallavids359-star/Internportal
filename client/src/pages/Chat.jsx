import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import { useApp } from '../context';
import { Avatar, Loading } from '../components/ui';

export default function Chat() {
  const { user, isAdmin, toast } = useApp();
  const [channels, setChannels] = useState(null);
  const loc = useLocation();
  const [ch, setCh] = useState(loc.state?.ch || 'general');
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState({});
  const box = useRef(null);
  const chRef = useRef(ch); chRef.current = ch;

  useEffect(() => { api('/messages/channels').then(setChannels); }, []);
  useEffect(() => { api('/messages/' + encodeURIComponent(ch)).then(setMsgs); setUnread((u) => ({ ...u, [ch]: 0 })); }, [ch]);
  useEffect(() => {
    const s = getSocket();
    const on = (m) => { if (m.channel === chRef.current) setMsgs((x) => [...x, m]); else setUnread((u) => ({ ...u, [m.channel]: (u[m.channel] || 0) + 1 })); };
    s?.on('message', on);
    return () => s?.off('message', on);
  }, []);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs]);
  if (!channels) return <Loading />;

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim(); if (!t) return;
    setText('');
    try {
      // announcements go through REST so everyone also gets a notification
      if (ch === 'announcements') await api('/messages/announcements', { method: 'POST', body: { text: t } });
      else {
        const s = getSocket();
        if (s?.connected) s.emit('message:send', { channel: ch, text: t }, (r) => r?.error && toast(r.error));
        else await api('/messages/' + encodeURIComponent(ch), { method: 'POST', body: { text: t } });
      }
    } catch (x) { toast(x.message); }
  };
  const cur = channels.find((c) => c.id === ch);
  const label = (c) => (c.kind === 'announce' ? '📣 ' : c.kind === 'dm' ? '' : '# ') + c.name;
  const canPost = ch !== 'announcements' || isAdmin;
  const groups = [['Channels', channels.filter((c) => c.kind !== 'dm')], ['Direct messages', channels.filter((c) => c.kind === 'dm')]];

  return (
    <div className="card chat">
      <div className="ch-list">{groups.map(([g, list]) => <div key={g}><div className="ch-sub">{g}</div>
        {list.map((c) => <button key={c.id} className={'ch' + (c.id === ch ? ' on' : '')} onClick={() => setCh(c.id)}>
          {c.kind === 'dm' && <Avatar sm name={c.name} />}<span style={{ flex: 1 }}>{label(c)}</span>{unread[c.id] > 0 && <span className="count" style={{ background: '#ef4444', color: '#fff', borderRadius: 99, fontSize: 11, padding: '1px 7px' }}>{unread[c.id]}</span>}</button>)}</div>)}</div>
      <div className="ch-main">
        <div className="ch-head">{cur ? label(cur) : ''}</div>
        <div className="msgs" ref={box}>
          {msgs.map((m) => { const mine = m.from?._id === user._id; return (
            <div key={m._id} className={'msg' + (mine ? ' mine' : '')}><Avatar sm name={m.from?.name} />
              <div><div className="h"><b>{m.from?.name}</b> · {new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div><div className="b">{m.text}</div></div></div>); })}
          {!msgs.length && <div className="empty">No messages yet. Say hello!</div>}
        </div>
        {canPost ? <form className="composer" onSubmit={send}><input value={text} onChange={(e) => setText(e.target.value)} placeholder={'Message ' + (cur ? label(cur) : '') + '…'} /><button className="btn">Send</button></form>
          : <div className="composer muted small">Only admins can post announcements.</div>}
      </div>
    </div>
  );
}
