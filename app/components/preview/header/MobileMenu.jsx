export default function MobileMenu() {
  return (
    <div className="rouge-technologies-mobile">
      <input
        type="checkbox"
        id="rouge-technologies-mobile-toggle"
        className="rouge-technologies-mobile__toggle"
      />
      <label
        htmlFor="rouge-technologies-mobile-toggle"
        className="rouge-technologies-mobile__label"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
          <path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z" />
        </svg>
        Menu
      </label>

      <div className="rouge-technologies-mobile__content">
        <ul className="rouge-technologies-mobile__list">
          <li className="rouge-technologies-mobile__item">
            <a href="https://www.ebay.co.uk/str/rougetechnologies">Home</a>
          </li>
          <li className="rouge-technologies-mobile__item">
            <a href="https://www.ebay.co.uk/sch/rougetechnologiesuk/m.html?_nkw=&_armrs=1&_ipg=&_from=">
              All Products
            </a>
          </li>
          <li className="rouge-technologies-mobile__item">
            <a href="https://www.ebay.co.uk/cnt/intermediatedFAQ?requested=rougetechnologiesuk&_trksid=p2545226.m2531.l4583&rt=nc">
              Contact Us
            </a>
          </li>
          <li className="rouge-technologies-mobile__item">
            <a href="https://www.ebay.co.uk/fdbk/feedback_profile/rougetechnologiesuk?filter=feedback_page:All">
              Feedback
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
