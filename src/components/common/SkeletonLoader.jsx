/**
 * @param {Object} props
 * @param {number} [props.rows]
 * @param {number} [props.cols]
 */
export function SkeletonLoader({ rows = 4, cols = 4 }) {
  return (
    <div className="bg-white rounded-[8px] border border-[#E5E7EB] overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-[#E5E7EB] last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-[#F3F4F6] rounded animate-pulse ${j === 0 ? 'w-8' : j === cols - 1 ? 'w-16' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
