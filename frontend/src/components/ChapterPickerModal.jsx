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
  const [onlyWithDiagrams, setOnlyWithDiagrams] = useState(false);

  const selectionMap = useMemo(() => {
    const map = {};
    for (const entry of selection || []) map[entry.chapter] = entry.topics || null;
    return map;
  }, [selection]);

  if (!open) return null;

  const filteredChapters = chapters.filter((c) => {
    const matchesSearch = !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesDiagram = !onlyWithDiagrams || (c.diagramCount && c.diagramCount > 0);
    return matchesSearch && matchesDiagram;
  });

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
          <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search chapters…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: '1 1 220px', padding: '9px 14px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13.5 }}
            />
            <button
              type="button"
              className={`btn btn-sm ${onlyWithDiagrams ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: 12.5,
                padding: '7px 12px',
                borderRadius: 8,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                border: onlyWithDiagrams ? 'none' : '1px solid var(--line)',
                background: onlyWithDiagrams ? '#059669' : '#fff',
                color: onlyWithDiagrams ? '#fff' : '#047857'
              }}
              onClick={() => setOnlyWithDiagrams(!onlyWithDiagrams)}
              title="Filter and show only chapters with diagram-based questions"
            >
              🖼️ With Diagrams Only {chapters.filter((c) => (c.diagramCount || 0) > 0).length > 0 && `(${chapters.filter((c) => (c.diagramCount || 0) > 0).length})`}
            </button>
          </div>
        </div>

        {/* Chapter list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px' }}>
          {filteredChapters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-soft)' }}>
              {onlyWithDiagrams ? 'No chapters found with diagram questions under this search.' : `No chapters match "${search}"`}
            </div>
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
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span>{ch.questionCount} question{ch.questionCount !== 1 ? 's' : ''} ({ch.mcqCount || 0} MCQ, {ch.nvqCount || 0} NVQ)</span>
                      {ch.diagramCount > 0 && (
                        <span style={{ fontWeight: 700, color: '#047857', background: '#D1FAE5', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                          🖼️ {ch.diagramCount} with diagrams
                        </span>
                      )}
                      {selectedTopics.length > 0 && !wholeSelected && <span>· {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected</span>}
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
