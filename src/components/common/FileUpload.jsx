import { useState, useRef } from 'react';

/**
 * accept가 확장자 나열(`.pdf,.doc`) 형태일 때만 필터링한다. `image/*` 같은 MIME 패턴
 * 토큰은 이 프로젝트 내 사용 방식과 맞지 않아 걸러내지 않고 항상 통과시킨다.
 */
function isAllowedFile(file, accept) {
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.startsWith('.'));
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  return tokens.some((ext) => name.endsWith(ext));
}

/**
 * @param {Object} props
 * @param {string} [props.accept]
 * @param {string} [props.maxSize] 표시용 문구 (실제 용량 검증은 하지 않습니다)
 * @param {boolean} [props.multiple]
 * @param {(files: File[]) => void} [props.onFiles]
 */
export function FileUpload({
  accept = '.pdf,.doc,.docx,.xlsx,.hwp',
  maxSize = '10MB',
  multiple,
  onFiles,
}) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [rejectedNames, setRejectedNames] = useState([]);
  const inputRef = useRef(null);

  const handleFiles = (fs) => {
    if (!fs) return;
    const arr = Array.from(fs);
    const valid = arr.filter((f) => isAllowedFile(f, accept));
    const rejected = arr.filter((f) => !isAllowedFile(f, accept));
    setRejectedNames(rejected.map((f) => f.name));
    if (valid.length === 0) return;
    const filesToUse = multiple ? valid : valid.slice(0, 1);
    setFiles((prev) => (multiple ? [...prev, ...filesToUse] : filesToUse));
    onFiles?.(filesToUse);
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, j) => j !== i));

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`border-2 border-dashed rounded-[8px] p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#F9FAFB]'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center mx-auto mb-2">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 13V4M10 4L7 7M10 4l3 3"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-[#1F2328]">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-[12px] text-[#9AA0A6] mt-1">
          허용 형식: {accept} · 최대 {maxSize}
        </p>
      </div>
      {rejectedNames.length > 0 && (
        <p role="alert" className="text-[11px] text-[#CF222E]">
          허용되지 않은 형식이라 제외되었습니다: {rejectedNames.join(', ')}
        </p>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 bg-[#F9FAFB] rounded-[6px] border border-[#E5E7EB]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#656D76">
                <path d="M4 0h8l4 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2z" />
              </svg>
              <span className="text-[12px] text-[#1F2328] flex-1 truncate">{f.name}</span>
              <span className="text-[11px] text-[#9AA0A6]">
                {(f.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-[#9AA0A6] hover:text-[#CF222E] transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M1 1l10 10M11 1L1 11" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
