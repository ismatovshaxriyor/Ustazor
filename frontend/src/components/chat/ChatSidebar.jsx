import { resolveMediaUrl } from '../../utils/media';
import { getThreadProposalOptions, getProposalGroupKey, formatMessageTime } from './chatUtils';
import { useNotifications } from '../../context/NotificationContext';

export default function ChatSidebar({
  threadsLoading,
  threads,
  vacancyGroups,
  selectedVacancyKey,
  filteredThreads,
  activeThreadId,
  onSelectVacancyFilter,
  openThread,
}) {
  const { getThreadUnread } = useNotifications();

  const renderThreadItem = (thread) => {
    const isActive = thread.id === activeThreadId;
    const threadOnline = Boolean(thread.other_user_online);
    return (
      <button
        key={thread.id}
        type="button"
        className={`chat-contact${isActive ? ' chat-contact-active' : ''}`}
        onClick={() => openThread(thread)}
      >
        <div className="chat-contact-avatar-wrap">
          <img
            src={resolveMediaUrl(thread.other_user_photo, { userType: thread.other_user_type || 'client' })}
            alt={thread.other_user_name}
            className="chat-contact-avatar"
          />
          <span className={`online-dot online-dot-abs${threadOnline ? ' online-dot-active' : ''}`} />
        </div>
        <div className="chat-contact-info">
          <span className="chat-contact-name">{thread.other_user_name}</span>
          <p className="muted chat-contact-preview">{thread.last_message || 'Xabar yo`q'}</p>
          <p className="muted chat-contact-sub">
            {(() => {
              const options = getThreadProposalOptions(thread);
              if (selectedVacancyKey !== 'all') {
                const matched = options.find((option) => getProposalGroupKey(option) === selectedVacancyKey);
                return matched?.vacancy_title || thread.vacancy_title || 'E`lon ko`rsatilmagan';
              }
              return options.length > 1
                ? `${options.length} ta e\`lon`
                : (options[0]?.vacancy_title || thread.vacancy_title || 'E`lon ko`rsatilmagan');
            })()}
          </p>
        </div>
        <div className="chat-contact-end">
          {thread.last_message_at && (
            <span className="chat-contact-time">{formatMessageTime(thread.last_message_at)}</span>
          )}
          {getThreadUnread(thread.id) > 0 && (
            <span className="chat-unread-badge">{getThreadUnread(thread.id)}</span>
          )}
        </div>
      </button>
    );
  };

  return (
    <aside className="chat-list card">
      <p className="chat-title">Suhbatlar</p>
      <div className="chat-list-scroll">
        {threadsLoading ? (
          <p className="muted">Suhbatlar yuklanmoqda...</p>
        ) : threads.length === 0 ? (
          <p className="muted">Hozircha chatlar yo`q. E`longa murojaat yuboring.</p>
        ) : (
          <>
            <section className="chat-group chat-group-vacancies">
              <div className="chat-group-head">
                <h4 className="chat-group-title">E`lonlar</h4>
                <span className="chat-group-count">{vacancyGroups.length}</span>
              </div>
              <div className="chat-group-list chat-group-list-vacancies">
                <button
                  type="button"
                  className={`chat-vacancy-filter${selectedVacancyKey === 'all' ? ' chat-vacancy-filter-active' : ''}`}
                  onClick={() => onSelectVacancyFilter('all')}
                >
                  <span className="chat-vacancy-filter-title">Barcha e`lonlar</span>
                  <span className="chat-vacancy-filter-meta">{threads.length} ta suhbat</span>
                </button>
                {vacancyGroups.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={`chat-vacancy-filter${selectedVacancyKey === group.key ? ' chat-vacancy-filter-active' : ''}`}
                    onClick={() => onSelectVacancyFilter(group.key)}
                  >
                    <span className="chat-vacancy-filter-title">{group.title}</span>
                    <span className="chat-vacancy-filter-meta">{group.threadCount} ta suhbat</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="chat-group chat-group-threads">
              <div className="chat-group-head">
                <h4 className="chat-group-title">Suhbatlar</h4>
                <span className="chat-group-count">{filteredThreads.length}</span>
              </div>
              <div className="chat-group-list chat-group-list-threads">
                {filteredThreads.length === 0 ? (
                  <p className="muted">Tanlangan e`lon bo`yicha suhbat topilmadi.</p>
                ) : (
                  filteredThreads.map((thread) => renderThreadItem(thread))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
