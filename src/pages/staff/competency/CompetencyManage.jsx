import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, ConfirmDialog, Drawer, EmptyState, toast } from '@/components/common';
import { registerCompetency } from '@/api/competency';
import { ApiError } from '@/api/client';

const ACCENT = '#1F2937'; // 교직원 포털 공통 포인트컬러 (무채색 기조)

// BE CompetencyService.MAX_TOP_LEVEL_COMPETENCY 와 동일 (핵심역량은 최대 6개, 서버에서도 검증함)
const MAX_CORE_COMPETENCY = 6;

// ─── Drag handle SVG ─────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <svg
      width="12"
      height="16"
      viewBox="0 0 12 16"
      fill="none"
      className="text-[#9AA0A6] hover:text-[#656D76]"
    >
      {[2, 6, 10].flatMap((x) =>
        [4, 8, 12].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />
        )),
      )}
    </svg>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-4.5 rounded-full transition-colors ${checked ? '' : 'bg-[#D1D5DB]'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={checked ? { background: ACCENT } : {}}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-3.5' : ''}`}
      />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CompetencyManage() {
  // TODO: GET /api/admin/competencies 목록 조회 API 나오면 useQuery로 교체 (담당: 어드민 파트).
  // 그 전까지는 등록한 것만 세션 내에서 보이고 새로고침하면 사라짐.
  const [cores, setCores] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deactTarget, setDeactTarget] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [subDrawer, setSubDrawer] = useState(false);

  // Drag state for axis reorder
  const dragItem = useRef(null);

  // Drawer form state (등록 폼 — 역량코드/축순서/사용여부는 서버가 결정하므로 입력란 없음)
  const [fName, setFName] = useState('');
  const [fNameEn, setFNameEn] = useState('');
  const [fDesc, setFDesc] = useState('');

  // 하위역량 등록(#3) API가 아직 없어 실제 데이터가 없음. 생기면 selectedCore 기준으로 조회하도록 교체.
  const subs = [];
  const selectedCore = cores.find((c) => c.code === selected);

  const handleDragStart = (idx) => {
    dragItem.current = idx;
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (idx) => {
    const from = dragItem.current;
    if (from === null || from === idx) return;
    const next = [...cores];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    const reordered = next.map((c, i) => ({ ...c, axisOrder: i + 1 }));
    setCores(reordered);
    dragItem.current = null;
    toast('축순서가 변경되었습니다.', 'success');
  };

  const handleToggle = (c) => {
    if (c.active) setDeactTarget(c);
    else {
      setCores((prev) => prev.map((x) => (x.code === c.code ? { ...x, active: true } : x)));
    }
  };

  const confirmDeactivate = () => {
    if (!deactTarget) return;
    setCores((prev) =>
      prev.map((x) => (x.code === deactTarget.code ? { ...x, active: false } : x)),
    );
    setDeactTarget(null);
    toast(`'${deactTarget.name}' 역량이 비활성 처리되었습니다.`, 'info');
  };

  const openNew = () => {
    if (cores.length >= MAX_CORE_COMPETENCY) {
      toast(`핵심역량은 최대 ${MAX_CORE_COMPETENCY}개까지 등록할 수 있습니다.`, 'error');
      return;
    }
    setFName('');
    setFNameEn('');
    setFDesc('');
    setDrawerOpen(true);
  };

  const registerMutation = useMutation({
    mutationFn: registerCompetency,
    onSuccess: (created) => {
      setCores((prev) => [
        ...prev,
        {
          code: created.competencyCode,
          name: created.competencyName,
          nameEn: created.englishName ?? '',
          subCount: 0,
          qCount: 0,
          axisOrder: created.displayOrder,
          active: created.active,
        },
      ]);
      setDrawerOpen(false);
      toast(`'${created.competencyName}' 역량이 ${created.competencyCode}(으)로 등록되었습니다.`, 'success');
    },
    onError: (e) => {
      toast(e instanceof ApiError ? e.message : '역량 등록에 실패했습니다.', 'error');
    },
  });

  const saveCore = () => {
    if (!fName.trim()) {
      toast('역량명은 필수입니다.', 'error');
      return;
    }
    registerMutation.mutate({
      competencyName: fName.trim(),
      englishName: fNameEn.trim() || undefined,
      description: fDesc.trim() || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-black text-[#1F2328]">역량 관리</h1>
          <p className="text-[12px] text-[#9AA0A6] mt-0.5">
            핵심역량 코드·구조 정의 및 하위역량 관리
          </p>
        </div>
        <Button
          onClick={openNew}
          disabled={cores.length >= MAX_CORE_COMPETENCY}
          style={{ background: ACCENT }}
        >
          + 역량 등록
        </Button>
      </div>

      {/* Axis hint */}
      <div className="flex items-center gap-2 mb-3 text-[11px] text-[#9AA0A6] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-2">
        <span>ℹ</span>
        <span>
          축순서는 방사형 차트의 표시 순서(1~6)입니다. 좌측 ⠿ 핸들을 드래그해 순서를 변경하세요.
        </span>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 380px' }}>
        {/* LEFT: Core competency table */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
            <span className="text-[13px] font-bold text-[#1F2328]">핵심역량</span>
            <span className="ml-auto text-[11px] text-[#9AA0A6]">
              클릭하면 하위역량을 확인합니다.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                  <th className="w-8 px-3 py-3" />
                  {['코드', '역량명', '영문명', '하위역량', '문항', '축순서', '사용', '관리'].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-3 text-[10px] font-semibold text-[#656D76] uppercase tracking-wide whitespace-nowrap ${i >= 3 ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {cores.map((c, idx) => (
                  <tr
                    key={c.code}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    onClick={() => setSelected(c.code)}
                    className={`border-b border-[#F3F4F6] last:border-0 cursor-pointer transition-colors ${selected === c.code ? 'bg-[#F3F4F6]' : 'hover:bg-[#FAFAFA]'} ${!c.active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-3 py-3 cursor-grab active:cursor-grabbing">
                      <DragHandle />
                    </td>
                    <td
                      className="px-3 py-3 font-mono text-[11px] font-bold"
                      style={{ color: ACCENT }}
                    >
                      {c.code}
                    </td>
                    <td className="px-3 py-3 font-bold text-[#1F2328]">{c.name}</td>
                    <td className="px-3 py-3 text-[#9AA0A6] text-[11px]">{c.nameEn}</td>
                    <td className="px-3 py-3 text-center text-[#656D76]">{c.subCount}</td>
                    <td className="px-3 py-3 text-center text-[#656D76]">{c.qCount}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-[12px] font-black text-[#1F2328]">{c.axisOrder}</span>
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Toggle checked={c.active} onChange={() => handleToggle(c)} />
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="h-5 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#F3F4F6] transition-colors"
                        style={{ color: ACCENT }}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Sub-competency table */}
        <div className="bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#9CA3AF]" />
            <span className="text-[13px] font-bold text-[#1F2328]">
              {selectedCore ? `${selectedCore.name} 하위역량` : '하위역량'}
            </span>
            {selectedCore && (
              <>
                <span
                  className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6]"
                  style={{ color: ACCENT }}
                >
                  {subs.length}개
                </span>
                <button
                  onClick={() => {
                    setEditSub(null);
                    setSubDrawer(true);
                  }}
                  className="h-6 px-2.5 text-[10px] font-bold rounded-[4px] text-white ml-1"
                  style={{ background: ACCENT }}
                >
                  + 추가
                </button>
              </>
            )}
          </div>
          {!selectedCore ? (
            <EmptyState message="왼쪽에서 핵심역량을 클릭하면 하위역량을 확인합니다." />
          ) : subs.length === 0 ? (
            <EmptyState
              message="등록된 하위역량이 없습니다."
              sub="하위역량 등록 기능은 아직 준비 중입니다."
            />
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E5E7EB]">
                    {['코드', '하위역량명', '설명', '문항', '순서', '관리'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 text-[10px] font-semibold text-[#656D76] whitespace-nowrap ${i >= 3 ? 'text-center' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr
                      key={s.code}
                      className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-3 py-3 font-mono text-[10px] text-[#9AA0A6]">{s.code}</td>
                      <td className="px-3 py-3 font-bold text-[#1F2328] whitespace-nowrap">
                        {s.name}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-[#656D76] max-w-[120px]">
                        <p className="line-clamp-2 leading-snug">{s.description}</p>
                      </td>
                      <td className="px-3 py-3 text-center text-[#656D76]">{s.qCount}</td>
                      <td className="px-3 py-3 text-center text-[#9AA0A6]">{s.order}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => {
                            setEditSub(s);
                            setSubDrawer(true);
                          }}
                          className="h-5 px-2 text-[10px] font-bold rounded-[4px] bg-[#F3F4F6] hover:bg-[#F3F4F6] transition-colors"
                          style={{ color: ACCENT }}
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Drawers & Dialogs ── */}

      {/* Core competency drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="역량 등록"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDrawerOpen(false)}
              disabled={registerMutation.isPending}
            >
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              onClick={saveCore}
              loading={registerMutation.isPending}
            >
              저장
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-[11px] text-[#9AA0A6] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] px-3 py-2">
            역량 코드는 등록 순서에 따라 자동 채번(C1~C6)되고, 축순서도 등록 순서로 자동
            지정됩니다. 등록 후 이 화면에 표시됩니다.
          </p>
          {[
            { label: '역량명(한글)', value: fName, set: setFName, placeholder: '예) 창의·혁신' },
            {
              label: '영문명',
              value: fNameEn,
              set: setFNameEn,
              placeholder: '예) Creativity & Innovation',
            },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                {f.label}
              </label>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151] bg-white"
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">설명</label>
            <textarea
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              rows={3}
              placeholder="역량에 대한 설명을 입력하세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151] bg-white"
            />
          </div>
        </div>
      </Drawer>

      {/* Sub-competency drawer */}
      <Drawer
        open={subDrawer}
        onClose={() => setSubDrawer(false)}
        title={editSub ? '하위역량 수정' : '하위역량 추가'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSubDrawer(false)}>
              취소
            </Button>
            <Button
              style={{ background: ACCENT }}
              onClick={() => {
                setSubDrawer(false);
                toast('하위역량이 저장되었습니다.', 'success');
              }}
            >
              저장
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              소속 핵심역량
            </label>
            <div className="h-9 px-3 flex items-center text-[13px] rounded-[6px] border border-[#E5E7EB] bg-[#F9FAFB] text-[#9AA0A6]">
              {selectedCore?.code} — {selectedCore?.name}
            </div>
          </div>
          {[
            { label: '하위역량 코드', val: editSub?.code ?? '', ph: '예) C1S4' },
            { label: '하위역량명', val: editSub?.name ?? '', ph: '예) 자기효능감' },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
                {f.label}
              </label>
              <input
                defaultValue={f.val}
                placeholder={f.ph}
                className="w-full h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151] bg-white"
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">설명</label>
            <textarea
              defaultValue={editSub?.description ?? ''}
              rows={3}
              placeholder="하위역량에 대한 설명을 입력하세요."
              className="w-full px-3 py-2.5 text-[13px] rounded-[6px] border border-[#E5E7EB] resize-none focus:outline-none focus:border-[#374151] bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#656D76] mb-1.5">
              표시 순서
            </label>
            <input
              type="number"
              defaultValue={editSub?.order ?? subs.length + 1}
              min={1}
              className="w-24 h-9 px-3 text-[13px] rounded-[6px] border border-[#E5E7EB] focus:outline-none focus:border-[#374151] bg-white"
            />
          </div>
        </div>
      </Drawer>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactTarget}
        title="역량 비활성 확인"
        message={`진단 이력이 있는 역량은 삭제할 수 없으며 비활성 처리됩니다.\n'${deactTarget?.name}' 역량을 비활성으로 변경하시겠습니까?`}
        confirmLabel="비활성 처리"
        danger
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactTarget(null)}
      />
    </div>
  );
}
