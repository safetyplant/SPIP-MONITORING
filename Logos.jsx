// Logo KPP Mining, CISS, dan ASTO. File ada di public/logos.
export default function Logos({ size = 'md' }) {
  return (
    <div className={`logos logos-${size}`}>
      <img className="l-kpp" src="/logos/kpp.png" alt="KPP Mining" />
      <img className="l-ciss" src="/logos/ciss.png" alt="CISS" />
      <img className="l-asto" src="/logos/asto.png" alt="ASTO" />
    </div>
  );
}
