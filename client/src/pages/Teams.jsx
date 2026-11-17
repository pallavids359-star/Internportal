import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../context';
import { ProfileModal } from '../components/ProfileForm';
import { useApi, Avatar, Loading, Modal } from '../components/ui';
import Icon from '../components/Icon';

function StarRating({ rating }) {
  if (!rating || rating <= 0) {
    return <span className="team-no-rating">Not rated yet</span>;
  }
  return (
    <div className="team-rating-badge" title={`Rating: ${rating} / 5`}>
      <span className="team-star-icon">★</span>
      <span className="team-star-num">{Number(rating).toFixed(1)}</span>
      <span className="team-star-denom">/ 5</span>
    </div>
  );
}

export default function Teams() {
  const { isAdmin, isLeader, user, toast } = useApp();
  const navigate = useNavigate();
  const [teams, reloadTeams] = useApi('/teams');
  const [users, reloadUsers] = useApi('/users');
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);

  if (!teams || !users) return <Loading />;

  const reload = () => { reloadTeams(); reloadUsers(); };
  const run = async (fn, msg) => {
    try {
      await fn();
      if (msg) toast(msg);
      reload();
    } catch (e) {
      toast(e.message);
    }
  };

  const members = (t) => users.filter((u) => {
    const tid = u.team?._id || u.team;
    return tid === t._id && ['intern', 'leader'].includes(u.role);
  });
  const unassigned = users.filter((u) => !u.team && ['intern', 'leader'].includes(u.role));

  // Determine currently selected team
  const selectedTeam = useMemo(() => {
    if (!teams.length) return null;
    if (activeTeamId === 'unassigned') return null;
    return teams.find((t) => t._id === activeTeamId) || teams[0];
  }, [teams, activeTeamId]);

  const currentMembers = selectedTeam ? members(selectedTeam) : [];

  // Filtered members for search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return currentMembers;
    const q = searchQuery.toLowerCase();
    return currentMembers.filter((u) =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.college && u.college.toLowerCase().includes(q))
    );
  }, [currentMembers, searchQuery]);

  // Average rating for selected team
  const avgRating = useMemo(() => {
    const rated = currentMembers.filter((m) => m.rating > 0);
    return rated.length
      ? (rated.reduce((acc, m) => acc + m.rating, 0) / rated.length).toFixed(1)
      : null;
  }, [currentMembers]);

  // Actions
  const create = async (fd) => {
    const r = await api('/teams', { method: 'POST', body: Object.fromEntries(fd) });
    setModal(null);
    reload();
    setActiveTeamId(r._id);
    toast('Team created');
  };

  const editTeam = async (fd) => {
    const name = fd.get('name');
    const focus = fd.get('focus');
    const color = fd.get('color');
    await api('/teams/' + modal.team._id, { method: 'PATCH', body: { name, focus, color } });
    setModal(null);
    reload();
    toast('Team updated');
  };

  const deleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    run(async () => {
      await api('/teams/' + teamId, { method: 'DELETE' });
      setActiveTeamId(null);
    }, 'Team deleted');
  };

  const rate = async (fd) => {
    await api('/users/' + modal.user._id, {
      method: 'PATCH',
      body: { rating: +fd.get('rating'), feedback: fd.get('feedback') },
    });
    setModal(null);
    reload();
    toast('Rating saved');
  };

  const moveMember = (userId, newTeamId) => {
    run(async () => {
      await api('/users/' + userId, { method: 'PATCH', body: { team: newTeamId } });
    }, 'Intern reassigned to team');
  };

  const makeLeader = (teamId, userId, userName) => {
    run(async () => {
      await api('/teams/' + teamId, { method: 'PATCH', body: { leader: userId } });
    }, `${userName} is now team leader`);
  };

  const addUnassigned = (userId, teamId) => {
    run(async () => {
      await api('/users/' + userId, { method: 'PATCH', body: { team: teamId } });
    }, 'Intern added to team');
  };

  return (
    <>
      {/* Top action toolbar */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div>
          <span className="muted">
            Select a team button below to view interns, manage roles, and track team progress.
          </span>
        </div>
        <div className="spacer" />
        {isAdmin && (
          <button className="btn" onClick={() => setModal({ kind: 'team' })}>
            + New team
          </button>
        )}
      </div>

      {/* 4 Team Selector Buttons */}
      <div className="team-nav-grid">
        {teams.map((t, idx) => {
          const teamMems = members(t);
          const isSelected = selectedTeam?._id === t._id;
          return (
            <button
              key={t._id}
              type="button"
              className={'team-tab-btn' + (isSelected ? ' active' : '')}
              onClick={() => {
                setActiveTeamId(t._id);
                setSearchQuery('');
              }}
              style={{ '--team-color': t.color || '#d4b26a' }}
            >
              <div className="team-tab-top">
                <span className="team-tab-num">#{idx + 1}</span>
                <span className="team-tab-count">
                  <Icon e="users" size={13} /> {teamMems.length} {teamMems.length === 1 ? 'intern' : 'interns'}
                </span>
              </div>
              <div className="team-tab-mid">
                <div className="team-tab-title">
                  <span
                    className="team-color-dot"
                    style={{ background: t.color || '#d4b26a', color: t.color || '#d4b26a' }}
                  />
                  <span>{t.name}</span>
                </div>
                {t.focus && <div className="team-tab-focus">{t.focus}</div>}
              </div>
              <div className="team-tab-bot">
                <span className="team-tab-lead">
                  {t.leader?.name ? (
                    <>Lead: <b>{t.leader.name}</b></>
                  ) : (
                    <span className="muted">No leader yet</span>
                  )}
                </span>
                {isSelected && <span className="team-tab-active-dot" title="Active" />}
              </div>
            </button>
          );
        })}

        {/* Unassigned button if any exist */}
        {isAdmin && unassigned.length > 0 && (
          <button
            type="button"
            className={'team-tab-btn team-tab-unassigned' + (activeTeamId === 'unassigned' ? ' active' : '')}
            onClick={() => {
              setActiveTeamId('unassigned');
              setSearchQuery('');
            }}
          >
            <div className="team-tab-top">
              <span className="team-tab-num warning">Pending</span>
              <span className="team-tab-count warning">{unassigned.length} waiting</span>
            </div>
            <div className="team-tab-mid">
              <div className="team-tab-title">
                <span className="team-color-dot" style={{ background: '#f59e0b', color: '#f59e0b' }} />
                <span>Unassigned Interns</span>
              </div>
              <div className="team-tab-focus">Requires team allocation</div>
            </div>
            <div className="team-tab-bot">
              <span className="team-tab-lead muted">Tap to assign</span>
              {activeTeamId === 'unassigned' && <span className="team-tab-active-dot" />}
            </div>
          </button>
        )}
      </div>

      {/* Selected Team Detail View */}
      {selectedTeam && (
        <div className="team-detail-view">
          {/* Team Hero Banner */}
          <div className="team-hero" style={{ '--team-color': selectedTeam.color || '#d4b26a' }}>
            <div className="team-hero-accent" style={{ background: selectedTeam.color || '#d4b26a' }} />
            <div className="team-hero-left">
              <div className="team-hero-title-row">
                <span
                  className="team-color-badge"
                  style={{ background: selectedTeam.color || '#d4b26a', color: selectedTeam.color || '#d4b26a' }}
                />
                <h2>{selectedTeam.name}</h2>
                {selectedTeam.focus && <span className="pill p-brand">{selectedTeam.focus}</span>}
              </div>

              {/* Leader Spotlight */}
              <div className="team-leader-showcase">
                {selectedTeam.leader ? (
                  <>
                    <Avatar sm name={selectedTeam.leader.name} />
                    <div>
                      <div className="team-leader-tag">Team Leader</div>
                      <div className="team-leader-name">{selectedTeam.leader.name}</div>
                    </div>
                  </>
                ) : (
                  <div className="team-no-leader">
                    <span>No leader assigned yet. Promote an intern with <b>Make leader</b> below.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hero Right: Stats & Actions */}
            <div className="team-hero-right">
              <div className="team-hero-stats">
                <div className="team-stat-box">
                  <div className="team-stat-val">{currentMembers.length}</div>
                  <div className="team-stat-lbl">Members</div>
                </div>
                <div className="team-stat-box">
                  <div className="team-stat-val">{avgRating ? avgRating : '—'}</div>
                  <div className="team-stat-lbl">Avg Score</div>
                </div>
              </div>

              <div className="team-hero-actions">
                <button
                  type="button"
                  className="btn ghost team-chat-btn"
                  onClick={() => navigate('/chat', { state: { ch: 'team:' + selectedTeam._id } })}
                  title="Open Team Chat room"
                >
                  <Icon e="chat" size={15} /> Team Chat
                </button>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setModal({ kind: 'edit-team', team: selectedTeam })}
                      title="Edit team name, focus or color"
                    >
                      <Icon e="pen" size={14} /> Edit
                    </button>
                    {currentMembers.length === 0 && (
                      <button
                        type="button"
                        className="btn red sm"
                        onClick={() => deleteTeam(selectedTeam._id)}
                        title="Delete empty team"
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Members List Card */}
          <div className="card team-members-card">
            <div className="team-members-header">
              <div className="team-members-title">
                <h3>
                  Team Interns <span className="pill p-grey">{filteredMembers.length}</span>
                </h3>
                <span className="muted small">Interns currently assigned to {selectedTeam.name}</span>
              </div>
              <div className="team-members-controls">
                <input
                  className="search"
                  placeholder="Filter interns by name, college..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: 220 }}
                />
                {isAdmin && unassigned.length > 0 && (
                  <select
                    className="search team-add-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) addUnassigned(e.target.value, selectedTeam._id);
                      e.target.value = '';
                    }}
                  >
                    <option value="" disabled>+ Add intern to this team...</option>
                    {unassigned.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.college || u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List of Intern Rows */}
            <div className="team-members-list">
              {filteredMembers.map((u) => {
                const isTeamLeader = selectedTeam.leader?._id === u._id;
                return (
                  <div className={'team-member-row' + (isTeamLeader ? ' is-leader' : '')} key={u._id}>
                    {/* Intern avatar & details */}
                    <div className="team-member-who">
                      <div className={'team-av-wrap' + (isTeamLeader ? ' leader-ring' : '')}>
                        <Avatar name={u.name} photo={u.profile && u.profile.photo} />
                        {isTeamLeader && <span className="team-leader-badge-dot" title="Leader" />}
                      </div>
                      <div className="team-member-details">
                        <div className="team-member-name">
                          <span>{u.name}</span>
                          {isTeamLeader && <span className="pill p-brand">Leader</span>}
                        </div>
                        <div className="team-member-meta">
                          {u.college && <span className="team-college">{u.college}</span>}
                          {u.college && u.email && <span className="team-dot-sep">•</span>}
                          <span className="team-email">{u.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Score */}
                    <div className="team-member-rating-col">
                      <StarRating rating={u.rating} />
                      {u.feedback && (
                        <div className="team-member-feedback" title={u.feedback}>
                          💬 "{u.feedback}"
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="team-member-actions">
                      {isAdmin && (
                        <>
                          <div className="team-move-wrap" title="Move intern to another team">
                            <span className="team-move-lbl">Team:</span>
                            <select
                              className="search team-move-select"
                              value={selectedTeam._id}
                              onChange={(e) => moveMember(u._id, e.target.value)}
                            >
                              {teams.map((o) => (
                                <option key={o._id} value={o._id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {!isTeamLeader && (
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => makeLeader(selectedTeam._id, u._id, u.name)}
                              title="Set as team leader"
                            >
                              Make leader
                            </button>
                          )}
                        </>
                      )}
                      {(isAdmin || isLeader) && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setModal({ kind: 'profile', id: u._id })}
                        >
                          Profile
                        </button>
                      )}
                      {(isAdmin || (isLeader && u._id !== user._id)) && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => setModal({ kind: 'rate', user: u })}
                        >
                          Rate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {!filteredMembers.length && (
                <div className="empty" style={{ padding: '48px 20px' }}>
                  {searchQuery ? 'No interns matched your search.' : 'No members in this team yet.'}
                  {isAdmin && unassigned.length > 0 && !searchQuery && (
                    <div style={{ marginTop: 12 }}>
                      <span className="muted small">
                        Choose an intern from the <b>+ Add intern to this team</b> dropdown above.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unassigned Interns View */}
      {activeTeamId === 'unassigned' && (
        <div className="card team-members-card">
          <div className="team-members-header">
            <div>
              <h3>
                Unassigned Interns <span className="pill p-amber">{unassigned.length}</span>
              </h3>
              <span className="muted small">
                These interns are waiting to be placed into a team. Assign them using the dropdowns below.
              </span>
            </div>
          </div>

          <div className="team-members-list">
            {unassigned.map((u) => (
              <div className="team-member-row" key={u._id}>
                <div className="team-member-who">
                  <Avatar name={u.name} photo={u.profile && u.profile.photo} />
                  <div className="team-member-details">
                    <div className="team-member-name">
                      <b>{u.name}</b>
                    </div>
                    <div className="team-member-meta">
                      {u.college && <span className="team-college">{u.college}</span>}
                      {u.college && u.email && <span className="team-dot-sep">•</span>}
                      <span className="team-email">{u.email}</span>
                    </div>
                  </div>
                </div>

                <div className="team-member-actions">
                  <select
                    className="search team-move-select"
                    defaultValue=""
                    onChange={(e) => addUnassigned(u._id, e.target.value)}
                  >
                    <option value="" disabled>Assign to team...</option>
                    {teams.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setModal({ kind: 'profile', id: u._id })}
                  >
                    Profile
                  </button>
                </div>
              </div>
            ))}

            {!unassigned.length && (
              <div className="empty" style={{ padding: '36px 20px' }}>
                All interns are currently assigned to teams!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal?.kind === 'profile' && (
        <ProfileModal userId={modal.id} onClose={() => setModal(null)} />
      )}

      {modal?.kind === 'team' && (
        <Modal
          title="New team"
          okLabel="Create"
          onClose={() => setModal(null)}
          onSubmit={create}
        >
          <label className="f">
            Team name
            <input name="name" required placeholder="e.g. Mobile Apps Team" />
          </label>
          <div className="row2">
            <label className="f">
              Focus area
              <input name="focus" placeholder="e.g. Flutter & Firebase" />
            </label>
            <label className="f">
              Colour
              <input name="color" type="color" defaultValue="#d4b26a" />
            </label>
          </div>
        </Modal>
      )}

      {modal?.kind === 'edit-team' && (
        <Modal
          title={'Edit ' + modal.team.name}
          okLabel="Save Changes"
          onClose={() => setModal(null)}
          onSubmit={editTeam}
        >
          <label className="f">
            Team name
            <input name="name" required defaultValue={modal.team.name} />
          </label>
          <div className="row2">
            <label className="f">
              Focus area
              <input name="focus" defaultValue={modal.team.focus || ''} placeholder="e.g. Cloud & DevOps" />
            </label>
            <label className="f">
              Colour
              <input name="color" type="color" defaultValue={modal.team.color || '#d4b26a'} />
            </label>
          </div>
        </Modal>
      )}

      {modal?.kind === 'rate' && (
        <Modal
          title={'Rate ' + modal.user.name}
          okLabel="Save"
          onClose={() => setModal(null)}
          onSubmit={rate}
        >
          <label className="f">
            Rating (0 - 5)
            <input
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              defaultValue={modal.user.rating || 4}
              required
            />
          </label>
          <label className="f">
            Feedback (the intern sees this)
            <textarea
              name="feedback"
              rows="4"
              defaultValue={modal.user.feedback}
              placeholder="Add performance notes or praise..."
            />
          </label>
        </Modal>
      )}
    </>
  );
}
