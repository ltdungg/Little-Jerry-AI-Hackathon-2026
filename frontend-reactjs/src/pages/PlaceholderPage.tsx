import { useLocation } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { ALL_NAV_LEAVES } from '../lib/navConfig';

export function PlaceholderPage() {
  const location = useLocation();
  const item = ALL_NAV_LEAVES.find((leaf) => leaf.path === location.pathname);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-900">Không tìm thấy trang</p>
          <p className="mt-1 text-sm text-slate-500">Đường dẫn này chưa được cấu hình.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={item.icon} size={26} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{item.label}</h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          <Icon name="Hammer" size={12} />
          Sắp ra mắt
        </span>
      </div>

      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{item.blurb}</p>

      {item.features.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Chức năng dự kiến
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {item.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
