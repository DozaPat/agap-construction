interface NumberedPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  maxVisiblePages?: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

const NumberedPagination = ({
  currentPage,
  totalItems,
  pageSize = 10,
  maxVisiblePages = 10,
  itemLabel = 'items',
  onPageChange
}: NumberedPaginationProps) => {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), pageCount);
  const visibleCount = Math.min(maxVisiblePages, pageCount);
  const firstPage = Math.min(
    Math.max(1, activePage - Math.floor(visibleCount / 2)),
    Math.max(1, pageCount - visibleCount + 1)
  );
  const pages = Array.from({ length: visibleCount }, (_, index) => firstPage + index);
  const firstItem = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const lastItem = Math.min(activePage * pageSize, totalItems);

  return (
    <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
      <p className="mb-3 text-center text-sm text-slate-500 sm:text-left">
        Showing {firstItem}-{lastItem} of {totalItems} {itemLabel}
      </p>
      {pageCount > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label={`${itemLabel} pagination`}>
          <button
            type="button"
            onClick={() => onPageChange(activePage - 1)}
            disabled={activePage === 1}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {pages.map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={page === activePage ? 'page' : undefined}
              className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold ${
                page === activePage
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(activePage + 1)}
            disabled={activePage === pageCount}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
};

export default NumberedPagination;
