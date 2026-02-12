interface FooterSectionProps {
  complianceText?: string;
}

export function FooterSection({ complianceText }: FooterSectionProps) {
  return (
    <footer className="border-t border-zinc-100 bg-white py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-[11px] text-zinc-500 md:flex-row">
        <p>© {new Date().getFullYear()} All rights reserved.</p>
        {complianceText && <p className="text-center md:text-right">{complianceText}</p>}
      </div>
    </footer>
  );
}

