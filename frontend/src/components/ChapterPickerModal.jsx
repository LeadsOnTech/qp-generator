import { useState, useMemo } from 'react';

/**
 * A large modal for picking chapters and, optionally, specific topics
 * within a chapter — built to stay clean and usable even with dozens of
 * chapters and topics (a small inline expand box does not scale).
 *
 * Selection model per chapter:
 *   - Not selected at all           → excluded entirely
 *   - Chapter checkbox checked      → whole chapter, every topic (and any
 *                                     untagged questions) included
 *   - One or more topic checkboxes  → only those specific topics from that
 *     checked, chapter checkbox off   chapter are included
 */
export default function ChapterPickerModal({ open, onClose, subjectName, chapters, selection, onChange }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const selectionMap = useMemo(() => {
    const map = {};
    for (const entry of selection || []) map[entry.chapter] = entry.topics || null;
    return map;
  }, [selection]);

  if (!open) return null;

  const filteredChapters = chapters.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function isWholeChapterSelected(chapterName) {
    return chapterName in selectionMap && selectionMap[chapterName] === null;
  }
  function selectedTopicsFor(chapterName) {
    return selectionMap[chapterName] || [];
  }

  function toggleWholeChapter(chapterName) {
    const next = { ...selectionMap };
    if (isWholeChapterSelected(chapterName)) {
      delete next[chapterName];
    } else {
      next[chapterName] = null; // null = whole chapter
    }
    emitChange(next);
  }

  function toggleTopic(chapterName, topicName) {
    const next = { ...selectionMap };
    const current = next[chapterName] && next[chapterName] !== null ? [...next[chapterName]] : [];
    const idx = current.indexOf(topicName);
    if (idx >= 0) current.splice(idx, 1); else current.push(topicName);

    if (current.length === 0) delete next[chapterName];
    else next[chapterName] = current;

    emitChange(next);
  }

  function emitChange(map) {
    const entries = Object.entries(map).map(([chapter, topics]) =>
      topics === null ? { chapter } : { chapter, topics }
    );
    onChange(entries);
  }

  function clearAll() {
    onChange([]);
  }

  const totalSelectedChapters = Object.keys(selectionMap).length;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(16,29,51,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{subjectName} — Choose Chapters &amp; Topics</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-soft)' }}>×</button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
            Tick a whole chapter, or expand it to pick specific topics only. Leave everything unticked
            to draw from the entire {subjectName} syllabus.
          </p>
          <input
            type="text"
            placeholder="Search chapters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14 }}
          />
        </div>

        {/* Chapter list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px' }}>
          {filteredChapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-soft)' }}>No chapters match "{search}"</div>
          ) : filteredChapters.map((ch) => {
            const isOpen = expanded[ch.id];
            const wholeSelected = isWholeChapterSelected(ch.name);
            const selectedTopics = selectedTopicsFor(ch.name);
            const hasTopics = ch.topics && ch.topics.length > 0;

            return (
              <div key={ch.id} style={{ borderBottom: '1px solid var(--line)', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={wholeSelected}
                    onChange={() => toggleWholeChapter(ch.name)}
                    style={{ width: 17, height: 17 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>{ch.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {ch.questionCount} question{ch.questionCount !== 1 ? 's' : ''} ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)
                      {selectedTopics.length > 0 && !wholeSelected && ` · ${selectedTopics.length} topic${selectedTopics.length !== 1 ? 's' : ''} selected`}
                    </div>
                  </div>
                  {hasTopics && (
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => ({ ...e, [ch.id]: !e[ch.id] }))}
                      style={{
                        background: 'none', border: '1px solid var(--line)', borderRadius: 6,
                        padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--ink-soft)',
                      }}
                    >
                      {isOpen ? 'Hide topics' : `${ch.topics.length} topics`}
                    </button>
                  )}
                </div>

                {isOpen && hasTopics && (
                  <div style={{ marginLeft: 30, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {ch.topics.map((t) => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!wholeSelected && selectedTopics.includes(t.name)}
                          disabled={wholeSelected}
                          onChange={() => toggleTopic(ch.name, t.name)}
                        />
                        <span style={{ color: wholeSelected ? 'var(--ink-soft)' : 'inherit' }}>{t.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {totalSelectedChapters === 0 ? 'Whole syllabus (nothing narrowed)' : `${totalSelectedChapters} chapter${totalSelectedChapters !== 1 ? 's' : ''} narrowed`}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {totalSelectedChapters > 0 && (
              <button type="button" className="btn btn-ghost" onClick={clearAll}>Clear all</button>
            )}
            <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
