import { useState } from 'react';
import { Button, Modal, toast } from '@/components/common';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// ─── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_TEMPLATES = [
  {
    id: 'T01',
    name: '리커트 5점 척도',
    points: 5,
    isDefault: true,
    usedCount: 75,
    items: [
      { value: 1, anchor: '전혀 그렇지 않다', converted: 0 },
      { value: 2, anchor: '그렇지 않다', converted: 25 },
      { value: 3, anchor: '보통이다', converted: 50 },
      { value: 4, anchor: '그렇다', converted: 75 },
      { value: 5, anchor: '매우 그렇다', converted: 100 },
    ],
  },
  {
    id: 'T02',
    name: '리커트 4점 척도',
    points: 4,
    isDefault: false,
    usedCount: 10,
    items: [
      { value: 1, anchor: '전혀 그렇지 않다', converted: 0 },
      { value: 2, anchor: '그렇지 않다', converted: 33 },
      { value: 3, anchor: '그렇다', converted: 67 },
      { value: 4, anchor: '매우 그렇다', converted: 100 },
    ],
  },
  {
    id: 'T03',
    name: '리커트 7점 척도',
    points: 7,
    isDefault: false,
    usedCount: 5,
    items: [
      { value: 1, anchor: '전혀 그렇지 않다', converted: 0 },
      { value: 2, anchor: '매우 그렇지 않다', converted: 17 },
      { value: 3, anchor: '그렇지 않다', converted: 33 },
      { value: 4, anchor: '보통이다', converted: 50 },
      { value: 5, anchor: '그렇다', converted: 67 },
      { value: 6, anchor: '매우 그렇다', converted: 83 },
      { value: 7, anchor: '완전히 그렇다', converted: 100 },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ScaleManage() {
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selected, setSelected] = useState('T01');
  const [newOpen, setNewOpen] = useState(false);

  // Edit state for inline anchor editing
  const [editingCell, setEditingCell] = useState(null);
  const [editVal, setEditVal] = useState('');

  const detail = templates.find((t) => t.id === selected);

  const setDefault = (id) => {
    setTemplates((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
    toast('기본 템플릿이 변경되었습니다. 이후 문항 등록 시 자동 선택됩니다.', 'success');
  };

  const commitEdit = () => {
    if (!editingCell) return;
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== editingCell.tid) return t;
        const items = t.items.map((item, i) => {
          if (i !== editingCell.vi) return item;
          if (editingCell.field === 'anchor') return { ...item, anchor: editVal };
          return { ...item, converted: Number(editVal) };
        });
        return { ...t, items };
      }),
    );
    setEditingCell(null);
  };

  const POINTS_COLOR = { 4: '#059669', 5: ACCENT, 7: '#D97706' };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">척도 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            리커트 척도 템플릿 등록·수정 및 기본값 지정
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} style={{ background: ACCENT }}>
          + 템플릿 등록
        </Button>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '380px 1fr' }}>
        {/* LEFT: Template list */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">척도 템플릿 목록</span>
          </div>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                {['ID', '템플릿명', '점수', '문항수', '관리'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-2.5 py-2.5 text-[10px] font-semibold text-[#656D76] whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer transition-colors ${selected === t.id ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'}`}
                >
                  <td className="px-2.5 py-3 font-mono text-[11px] text-[#9AA0A6]">{t.id}</td>
                  <td className="px-2.5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#1F2328] whitespace-nowrap">{t.name}</span>
                      {t.isDefault && (
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: ACCENT }}
                        >
                          기본
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2.5 py-3 text-center">
                    <span
                      className="text-[11px] font-black px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                      style={{ background: POINTS_COLOR[t.points] ?? '#6B7280' }}
                    >
                      {t.points}점
                    </span>
                  </td>
                  <td className="px-2.5 py-3 text-center text-[#656D76] whitespace-nowrap">
                    {t.usedCount}개
                  </td>
                  <td className="px-2.5 py-3 text-center">
                    <button
                      className="h-5 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#F3F4F6] transition-colors whitespace-nowrap"
                      style={{ color: ACCENT }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast('템플릿을 삭제하려면 사용 문항을 먼저 해제해야 합니다.', 'error');
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT: Template detail */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center gap-3">
            <div className="w-1 h-4 rounded-full bg-[#9CA3AF]" />
            <span className="text-[13px] font-bold text-[#1F2328]">{detail.name}</span>
            <span
              className="text-[11px] font-black px-2 py-0.5 rounded-full text-white ml-1"
              style={{ background: POINTS_COLOR[detail.points] ?? '#6B7280' }}
            >
              {detail.points}점
            </span>

            {/* Default toggle */}
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => {
                    if (!detail.isDefault) setDefault(detail.id);
                  }}
                  className={`relative w-9 h-5 rounded-full transition-colors ${detail.isDefault ? '' : 'bg-[#D1D5DB]'}`}
                  style={detail.isDefault ? { background: ACCENT } : {}}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${detail.isDefault ? 'translate-x-4' : ''}`}
                  />
                </div>
                <span
                  className="text-[12px] font-bold"
                  style={detail.isDefault ? { color: ACCENT } : { color: '#9AA0A6' }}
                >
                  {detail.isDefault ? '기본값' : '기본값 지정'}
                </span>
              </label>
            </div>
          </div>

          {detail.isDefault && (
            <div className="px-5 py-2 bg-[#F3F4F6] border-b border-[#E5E7EB]">
              <p className="text-[11px] text-[#374151]">문항 등록 시 자동 선택될 템플릿입니다.</p>
            </div>
          )}

          {/* Edit hint */}
          <div className="px-5 py-2 bg-[#FFF7ED] border-b border-[#FED7AA]">
            <p className="text-[11px] text-[#92400E]">
              ⚠ 템플릿 문구를 수정해도 이미 등록된 문항의 응답 항목은 변경되지 않습니다.
            </p>
          </div>

          {/* Scale items table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  {['척도값', 'Anchor 문구', '환산점수', '시각화'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide ${i >= 2 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item, vi) => {
                  const isEditingAnchor =
                    editingCell?.tid === detail.id &&
                    editingCell.vi === vi &&
                    editingCell.field === 'anchor';
                  const isEditingConverted =
                    editingCell?.tid === detail.id &&
                    editingCell.vi === vi &&
                    editingCell.field === 'converted';
                  const pct = item.converted;
                  return (
                    <tr
                      key={item.value}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA]"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black text-white"
                            style={{
                              background: ACCENT,
                              opacity: 0.4 + (item.value / detail.points) * 0.6,
                            }}
                          >
                            {item.value}
                          </div>
                          <span className="text-[11px] text-[#9AA0A6]">표시 순서 {vi + 1}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {isEditingAnchor ? (
                          <input
                            autoFocus
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                            className="w-full h-8 px-2 text-[12px] rounded-[4px] border border-[#374151] focus:outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ tid: detail.id, vi, field: 'anchor' });
                              setEditVal(item.anchor);
                            }}
                            className="text-[12px] text-[#1F2328] hover:text-[#374151] transition-colors hover:underline text-left"
                          >
                            {item.anchor}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isEditingConverted ? (
                          <input
                            autoFocus
                            type="number"
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                            className="w-16 h-8 px-2 text-[12px] rounded-[4px] border border-[#374151] focus:outline-none text-center"
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingCell({ tid: detail.id, vi, field: 'converted' });
                              setEditVal(String(item.converted));
                            }}
                            className="text-[12px] font-bold hover:text-[#374151] transition-colors hover:underline"
                            style={{ color: ACCENT }}
                          >
                            {item.converted}점
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div
                          className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden mx-auto"
                          style={{ width: '120px' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: ACCENT }}
                          />
                        </div>
                        <p className="text-[9px] text-[#9AA0A6] text-center mt-0.5">{pct}%</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-[#E5E7EB] flex justify-end">
            <Button
              size="sm"
              style={{ background: ACCENT }}
              onClick={() => toast('템플릿 변경사항이 저장되었습니다.', 'success')}
            >
              저장
            </Button>
          </div>
        </div>
      </div>

      {/* New template modal */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="척도 템플릿 등록"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              onClick={() => {
                setNewOpen(false);
                toast('척도 템플릿이 등록되었습니다.', 'success');
              }}
            >
              등록
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              템플릿 ID
            </label>
            <input
              placeholder="예) T04"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              템플릿명
            </label>
            <input
              placeholder="예) 리커트 6점 척도"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              척도 점수
            </label>
            <div className="flex gap-2">
              {[4, 5, 6, 7].map((p) => (
                <button
                  key={p}
                  className="h-9 w-12 text-[13px] font-bold rounded-[6px] border border-[#E5E7EB] text-[#656D76] hover:border-[#374151] hover:text-[#374151] transition-colors"
                >
                  {p}점
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[#9AA0A6]">
            등록 후 각 척도값의 Anchor 문구와 환산점수를 설정하세요.
          </p>
        </div>
      </Modal>
    </div>
  );
}
