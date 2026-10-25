interface FooterColumnProps {
  title: string;
  items: string[];
}

export function FooterColumn({ title, items }: FooterColumnProps) {
  return (
    <div>
      <h3 className="mb-3 text-[14px] font-bold uppercase text-white">
        {title}
      </h3>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-[12px] leading-[1.4] text-[#858B96]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
