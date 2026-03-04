import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        {children}
      </div>
    </div>
  );
}
