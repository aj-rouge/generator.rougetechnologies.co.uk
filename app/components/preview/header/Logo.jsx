export default function Logo() {
  return (
    <div className="rouge-technologies-logo">
      <a
        href="https://www.ebay.co.uk/str/rougetechnologies"
        className="rouge-technologies-logo__link"
      >
        <div className="rouge-technologies-logo__wrapper">
          <div className="rouge-technologies-logo__small">
            <img
              alt="Logo small"
              loading="lazy"
              width="157"
              height="60"
              decoding="async"
              src="https://rougetechnologies.co.uk/logo.svg"
            />
          </div>
          <div className="rouge-technologies-logo__medium">
            <img
              alt="logo mid"
              loading="lazy"
              width="290"
              height="82"
              decoding="async"
              src="https://rougetechnologies.co.uk/logo-md.svg"
            />
          </div>
          <div className="rouge-technologies-logo__large">
            <img
              alt="logo large"
              loading="lazy"
              width="119"
              height="119"
              decoding="async"
              src="https://rougetechnologies.co.uk/hero-logo.svg"
            />
          </div>
        </div>
      </a>
    </div>
  );
}
