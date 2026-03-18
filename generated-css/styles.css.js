// ⚠️ AUTO-GENERATED — DO NOT EDIT
// Combined styles from all CSS files
export default `
/* ===== START: category ===== */
.rouge-technologies-category {
  padding: 16px 40px;
}

.rouge-technologies-category__wrapper {
  width: 100%;
  background-color: #ffffff;
  border: 1px solid #d3d3d3;
  padding: 20px;
  box-sizing: border-box;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.rouge-technologies-category__wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #c1272d;
}

.rouge-technologies-category__heading {
  margin-bottom: 10px;
  font-size: 20px;
  color: #000;
  font-family: "Roboto", sans-serif;
  border-bottom: 2px solid #a80f0f;
  padding-bottom: 8px;
  font-weight: 700;
}

.rouge-technologies-category__content {
  line-height: 1.7;
  font-size: 14px;
  margin-top: 20px;
}

.rouge-technologies-category__section {
  margin-bottom: 10px;
  color: #000;
}

.rouge-technologies-category__section p {
  margin-bottom: 8px;
  color: #000;
}

.rouge-technologies-category__section:last-child {
  margin-bottom: 0;
}

.rouge-technologies-category__section br {
  display: block;
  content: "";
  margin-top: 10px;
}

.rouge-technologies-category__subheading {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #000;
}

.rouge-technologies-category__paragraph {
  margin-bottom: 8px;
  color: #000;
}

@media only screen and (max-width: 768px) {
  .rouge-technologies-category {
    padding: 8px 16px;
  }

  .rouge-technologies-category__wrapper {
    width: 100%;
    padding: 16px;
  }

  .rouge-technologies-category__heading {
    font-size: 16px;
    padding-bottom: 6px;
  }

  .rouge-technologies-category__content {
    font-size: 14px;
    line-height: 1.6;
    margin-top: 16px;
  }

  .rouge-technologies-category__section {
    margin-bottom: 16px;
  }
}

@media only screen and (max-width: 480px) {
  .rouge-technologies-category__wrapper {
    width: 100%;
    padding: 12px;
    border-radius: 6px;
  }

  .rouge-technologies-category__heading {
    font-size: 15px;
    font-weight: 300;
  }

  .rouge-technologies-category__content {
    font-size: 14px;
    line-height: 1.5;
  }

  .rouge-technologies-category__section {
    margin-bottom: 12px;
  }

  .rouge-technologies-category__subheading {
    font-size: 16px;
  }
}/* ===== START: desktop-navigation ===== */
.rouge-technologies-desktop-nav {
  display: none;
  flex-direction: column;
  justify-content: space-between;
}

@media (min-width: 1024px) {
  .rouge-technologies-desktop-nav {
    display: flex;
  }
}

.rouge-technologies-desktop-nav__title {
  font-size: 2.25rem;
  line-height: 2.5rem;
  font-weight: 700;
  color: black;
  text-decoration: none;
}

.rouge-technologies-desktop-nav__title:hover {
  text-decoration: none;
}

@media (min-width: 1280px) {
  .rouge-technologies-desktop-nav__title {
    font-size: 40px;
  }
}

.rouge-technologies-desktop-nav__title--red {
  color: rgb(193, 39, 45);
  font-size: 2.5rem;
}

.rouge-technologies-desktop-nav__menu {
  display: none;
  gap: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

@media (min-width: 768px) {
  .rouge-technologies-desktop-nav__menu {
    display: flex;
    align-items: center;
  }
}

@media (min-width: 1024px) {
  .rouge-technologies-desktop-nav__menu {
    display: flex;
  }
}

.rouge-technologies-desktop-nav__item {
  position: relative;
  padding-bottom: 1rem;
}

.rouge-technologies-desktop-nav__link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: black;
  text-underline-offset: 4px;
}

.rouge-technologies-desktop-nav__link:hover {
  color: rgb(193, 39, 45);
  text-decoration: underline;
}/* ===== START: feedback ===== */
.rouge-technologies-feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
}

.rouge-technologies-feedback__title {
  padding-inline: 0px;
  color: #000;
}

.rouge-technologies-feedback__title h4 {
  font-size: 24px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  font-weight: 600;
}

.rouge-technologies-feedback__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 0 40px;
}

.rouge-technologies-feedback__card {
  background-color: white;
  display: flex;
  gap: 8px;
  flex-direction: column;
  border-radius: 6px;
  padding: 16px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
}

.rouge-technologies-feedback__header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rouge-technologies-feedback__icon {
  flex-shrink: 0;
}

.rouge-technologies-feedback__author {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.rouge-technologies-feedback__content {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: #000;
}

.rouge-technologies-feedback__cta {
  background-color: #a80f0f;
  color: #fff;
  border-radius: 100px;
  padding: 8px 24px;
  display: flex;
  width: fit-content;
  margin-inline: auto;
  text-align: center;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  transition:
    background-color 0.3s ease,
    transform 0.2s ease;
}

.rouge-technologies-feedback__cta:hover {
  background-color: #8d0b0b;
  transform: translateY(-2px);
  text-decoration: none;
}

/* Responsive Design for Feedback Component */
@media only screen and (max-width: 769px) {
  .rouge-technologies-feedback {
    padding-inline: 16px;
  }

  .rouge-technologies-feedback__grid {
    grid-template-columns: 1fr;
    flex-direction: column;
    padding: 0;
  }

  .rouge-technologies-feedback__card {
    max-width: 100%;
  }

  .rouge-technologies-feedback__title h4 {
    font-size: 20px;
  }

  .rouge-technologies-feedback__cta {
    font-size: 14px;
    padding: 8px 20px;
  }
}

@media only screen and (max-width: 480px) {
  .rouge-technologies-feedback__title h4 {
    font-size: 18px;
  }

  .rouge-technologies-feedback__card {
    padding: 12px;
  }

  .rouge-technologies-feedback__author {
    font-size: 13px;
  }

  .rouge-technologies-feedback__content {
    font-size: 14px;
  }

  .rouge-technologies-feedback__cta {
    font-size: 13px;
    padding: 6px 16px;
  }
}/* ===== START: footer ===== */
.rouge-technologies-footer {
  background-color: #000;
  color: #fff;
  font-size: 16px;
  padding: 20px 40px;
}

.rouge-technologies-footer__container {
  margin: 0 auto;
}

.rouge-technologies-footer__content {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__content {
    flex-direction: row;
    justify-content: space-between;
  }
}

.rouge-technologies-footer__links-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 20px;
  text-align: left;
}

@media (min-width: 640px) {
  .rouge-technologies-footer__links-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 48px 20px;
  }
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__links-grid {
    gap: 64px;
    border-top: 0;
    padding: 0;
  }
}

.rouge-technologies-footer__links-column {
  margin-bottom: 0;
}

.rouge-technologies-footer__heading {
  margin-bottom: 16px;
  font-weight: 600;
  font-size: 18px;
  color: #fff;
}

.rouge-technologies-footer__links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.rouge-technologies-footer__link {
  color: #fff;
  text-decoration: none;
  transition:
    color 0.3s ease,
    text-decoration 0.3s ease;
}

.rouge-technologies-footer__link:hover {
  color: #a80f0f;
  text-decoration: underline;
}

.rouge-technologies-footer__logo {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-inline: auto;
  margin-bottom: 20px;
}

.rouge-technologies-footer__contact {
  padding: 18px 10px;
  text-align: center;
  vertical-align: centre;
  line-height: 16px;
  color: white;
  font-size: 14px;
  border-top: 1px solid white;
  border-bottom: 1px solid white;
}

.rouge-technologies-footer__contact-link {
  color: rgb(193, 39, 45);
  text-decoration: underline;
  text-decoration-color: rgb(193, 39, 45);
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__logo {
    display: flex;
    margin-inline: 0;
  }
}

.rouge-technologies-footer__logo-img {
  width: 292px;
  height: 121px;
  object-fit: contain;
}

.rouge-technologies-footer__bottom {
  display: flex;
  flex-direction: column;
  width: 100%;
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__bottom {
    flex-direction: row;
    justify-content: space-between;
  }
}

.rouge-technologies-footer__payment-methods {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: fit-content;
  max-width: 238px;
  margin: 0 auto;
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__payment-methods {
    margin: 0;
    max-width: fit-content;
    padding-left: 16px;
  }
}

@media (min-width: 1320px) {
  .rouge-technologies-footer__payment-methods {
    padding-left: 0;
  }
}

.rouge-technologies-footer__payment-icon {
  height: auto;
  width: 48px;
  fill: none;
}

.rouge-technologies-footer__payment-icon--apple {
  fill: white;
}

.rouge-technologies-footer__copyright {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  text-align: center;
}

@media (min-width: 768px) {
  .rouge-technologies-footer__copyright {
    flex-direction: row;
    gap: 0;
  }
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__copyright {
    margin: 0;
  }
}

.rouge-technologies-footer__copyright-text {
  margin: 0 auto;
  text-align: center;
  font-size: 12px;
  color: #fff;
}

@media (min-width: 1024px) {
  .rouge-technologies-footer__copyright-text {
    margin: 0;
  }
}

/* Additional responsive adjustments */
@media (max-width: 767px) {
  .rouge-technologies-footer__links-grid {
    padding: 20px 0;
    gap: 16px;
  }

  .rouge-technologies-footer__content {
    padding-right: 0;
  }

  .rouge-technologies-footer__payment-methods {
    flex-wrap: wrap;
    justify-content: center;
  }

  .rouge-technologies-footer__payment-icon {
    width: 40px;
  }
}

@media (max-width: 640px) {
  .rouge-technologies-footer__links-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .rouge-technologies-footer__links-column {
    text-align: center;
  }

  .rouge-technologies-footer__copyright-text {
    font-size: 11px;
    padding: 0 8px;
  }
}/* ===== START: header ===== */
/* ===== START: livepreview ===== */
:root {
  /* Shipping Content */
  --rouge-technologies-shipping-content: "We always strive to offer a smooth and uninterrupted delivery service. Orders purchased before 10:30am will be dispatched the very same day (Mon - Fri). Purchases made after 10:30am Mon - Fri will be shipped the following working day."
    "\A \A We use a next day delivery service for orders over £80. If you're close to £80, try checking out our other listings for another product that you may enjoy, our range of products may surprise you! Shipping for orders is on us and there's always a little surprise in our parcels!"
    "\A \A While we use reliable shipping partners, at times there can be delays which are unfortunately out of our control. For example, a Royal Mail Tracked 24 Parcel has a suggested 24 hour turnaround but can take up to 5 working days. In these rare cases, kindly use the tracking information provided to you by email and contact the courier directly if needed in the first instance. Feel free to reach out to us for further questions."
    "\A \A Customers are also welcome to collect items directly! Please select collection at checkout and purchase the item first to avoid missing out. We are happy to arrange a collection from our warehouse in Acton during working hours.";

  /* Warranty Content */
  --rouge-technologies-warranty-content: "While all items are covered by our full 30-day return policy, customers may occasionally need to go to the manufacturer for warranty."
    "\A \A Branded sealed items sold by Rouge Technologies Ltd can come with 1-year warranty direct with the manufacturer, but this can vary depending on the brand. Used or refurbished items are likely covered directly by us."
    "\A \A In all cases, we remain on your side to assist. Please reach out to use to confirm the specific warranty offered on a specific item. This does not affect your statutory rights.";

  /* Returns Content */
  --rouge-technologies-returns-content: "We offer a 30-day return policy. Please contact us prior to initiating a return as in many cases, we may be able to resolve the issue without you needing to return the item to us. We may ask for photos of the item and serial-number confirmation to help us process your request, and all returns are thoroughly inspected on arrival. A full refund is not guaranteed, until the item has been inspected and confirmed as a genuine return."
    "\A \A For change-of-mind returns, return postage is payable by the customer. Where an item shows beyond reasonable use or is missing parts, we reserve the right to make a reasonable deduction to reflect any loss in value."
    "\A \A Return address:" "\A Rouge Technologies Ltd" "\A 12 Jenner Avenue"
    "\A Acton, London" "\A W3 6EQ"
    "\A \A Refunds will typically be issued within 3-5 working days after being received at our warehouse. We will reach out to you directly if there is anything further to clarify prior to issuing your refund."
    "\A\A Please kindly note that sealed hygiene items, software/media and personalised items are exempted from returns once opened.";
}

.rouge-technologies-live-preview {
  background-color: #fff;
  font-family: "Roboto", sans-serif;
}

.rouge-technologies-live-preview__title-wrapper {
  padding: 0 16px;
}

@media (min-width: 1024px) {
  .rouge-technologies-live-preview__title-wrapper {
    padding: 0 40px;
  }
}

.rouge-technologies-live-preview__title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0;
  padding: 16px 0;
}

.rouge-technologies-live-preview__layout {
  padding: 0 40px;
}

.rouge-technologies-live-preview__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 1024px) {
  .rouge-technologies-live-preview__grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}

@media (max-width: 768px) {
  .rouge-technologies-live-preview__title {
    font-size: 20px;
    padding: 12px 0;
  }

  .rouge-technologies-live-preview__layout {
    padding: 0 16px;
  }

  .rouge-technologies-live-preview__grid {
    gap: 24px;
  }
}

@media (max-width: 480px) {
  .rouge-technologies-live-preview__title {
    font-size: 18px;
    padding: 8px 0;
  }

  .rouge-technologies-live-preview__layout {
    padding: 0 8px;
  }

  .rouge-technologies-live-preview__grid {
    gap: 16px;
  }
}/* ===== START: logo ===== */
.rouge-technologies-logo {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

@media (min-width: 1024px) {
  .rouge-technologies-logo {
    justify-content: flex-start;
    padding: 0;
  }
}

.rouge-technologies-logo__link {
  display: block;
  text-decoration: none;
}

.rouge-technologies-logo__wrapper {
  display: flex;
  height: 60px;
  width: 157px;
  align-items: center;
  overflow: hidden;
}

@media (min-width: 640px) {
  .rouge-technologies-logo__wrapper {
    width: 250px;
  }
}

@media (min-width: 768px) {
  .rouge-technologies-logo__wrapper {
    height: 60px;
    width: 260px;
  }
}

@media (min-width: 1024px) {
  .rouge-technologies-logo__wrapper {
    height: 119px;
    width: 119px;
  }
}

.rouge-technologies-logo__small {
  display: block;
}

@media (min-width: 768px) {
  .rouge-technologies-logo__small {
    display: none;
  }
}

.rouge-technologies-logo__medium {
  display: none;
}

@media (min-width: 768px) {
  .rouge-technologies-logo__medium {
    display: block;
  }
}

@media (min-width: 1024px) {
  .rouge-technologies-logo__medium {
    display: none;
  }
}

.rouge-technologies-logo__large {
  display: none;
}

@media (min-width: 1024px) {
  .rouge-technologies-logo__large {
    display: block;
  }
}/* ===== START: main-header ===== */
.rouge-technologies-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: "Roboto", sans-serif;
}

.rouge-technologies-header__inner {
}

.rouge-technologies-main-header {
  background-color: white;
  border-bottom: 1px solid #d3d3d3;
}

.rouge-technologies-container {
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.rouge-technologies-navbar {
  display: flex;
  flex-direction: column;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 0.75rem;
}

@media (min-width: 1024px) {
  .rouge-technologies-navbar {
    flex-direction: row;
    padding-top: 1.25rem;
    justify-content: space-between;
  }
}

.rouge-technologies-navbar__content {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .rouge-technologies-navbar__content {
    flex-direction: row;
  }
}/* ===== START: mobile-menu ===== */
.rouge-technologies-mobile {
  display: block;
  width: 100%;
}

@media (min-width: 1024px) {
  .rouge-technologies-mobile {
    display: none !important;
  }
}

.rouge-technologies-mobile__toggle {
  display: none;
}

.rouge-technologies-mobile__label {
  display: flex;
  align-items: center;
  background: #c1272d;
  color: #fff;
  padding: 10px 15px;
  font-size: 20px;
  text-align: left;
  margin: 0;
  cursor: pointer;
  position: relative;
}

.rouge-technologies-mobile__label svg {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  fill: white;
  flex-shrink: 0;
}

.rouge-technologies-mobile__content {
  max-height: 0;
  overflow: hidden;
  background: #fff;
  transition: max-height 0.5s ease-in-out;
}

.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content {
  max-height: 600px;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.rouge-technologies-mobile__list {
  padding: 0;
  margin: 0;
}

.rouge-technologies-mobile__item {
  display: block;
  border-bottom: 1px solid #e5e7eb;
  width: 100%;
  text-align: left;
  opacity: 0;
  transform: translateY(-10px);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content
  .rouge-technologies-mobile__item {
  opacity: 1;
  transform: translateY(0);
}

.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content
  .rouge-technologies-mobile__item:nth-child(1) {
  transition-delay: 0.1s;
}
.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content
  .rouge-technologies-mobile__item:nth-child(2) {
  transition-delay: 0.15s;
}
.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content
  .rouge-technologies-mobile__item:nth-child(3) {
  transition-delay: 0.2s;
}
.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content
  .rouge-technologies-mobile__item:nth-child(4) {
  transition-delay: 0.25s;
}
.rouge-technologies-mobile__toggle:checked
  ~ .rouge-technologies-mobile__content
  .rouge-technologies-mobile__item:nth-child(5) {
  transition-delay: 0.3s;
}

.rouge-technologies-mobile__item a {
  display: block;
  padding: 15px;
  font-size: 15px;
  color: #000;
  width: 100%;
  transition: 0.3s;
  text-decoration: none;
  font-family: "Roboto", sans-serif;
}

.rouge-technologies-mobile__item a:hover {
  background: #c1272d;
  color: #fff;
}/* ===== START: product-details ===== */
.rouge-technologies-details {
  padding: 0 16px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  height: fit-content;
}

.rouge-technologies-details__condition {
  font-size: 1.5rem;
  color: #000;
}

.rouge-technologies-details__paragraph-wrapper {
}

.rouge-technologies-details__paragraph {
  color: #000;
}

.rouge-technologies-details__features-title {
  font-size: 1.5rem;
  color: #000;
  font-weight: 700;
}

.rouge-technologies-details__features-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rouge-technologies-details__feature-item {
  display: flex;
  gap: 8px;
  padding: 0.75rem 0 0.75rem 0.75rem;
  margin-bottom: 0.75rem;
  border-left: 3px solid #c1272d;
  background-color: #f9f9f9;
  border-radius: 4px;
  transition: all 0.3s ease;
  font-size: 1rem;
  color: #000;
  line-height: 1.5;
}

.rouge-technologies-details__feature-item:hover {
  background-color: #f0f0f0;
  transform: translateX(5px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.rouge-technologies-details__checkmark {
  color: #c1272d;
  font-weight: bold;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}

.rouge-technologies-details__feature-content {
  flex: 1;
}

.rouge-technologies-details__feature-description {
}

.rouge-technologies-details__note-title {
  font-size: 1.5rem;
  color: #c1272d;
}

.rouge-technologies-details__note-container {
}

.rouge-technologies-details__note-text {
  color: #000;
}/* ===== START: product-gallery ===== */
.rouge-technologies-gallery {
  width: 100%;
}
.rouge-technologies-gallery__row {
  display: flex;
  width: 100%;
}
.rouge-technologies-gallery__full {
  width: 100%;
}
.rouge-technologies-gallery__wrapper {
  position: relative;
  width: 100%;
  max-width: 950px;
  margin: 0 auto;
}

.rouge-technologies-gallery__radio {
  display: none;
}

.rouge-technologies-gallery__main {
  display: none;
  width: 100%;
}

.rouge-technologies-gallery__main-wrapper {
  width: 100%;
  padding-bottom: 62.5%;
  position: relative;
  overflow: hidden;
  background: #fff;
}

.rouge-technologies-gallery__main-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rouge-technologies-gallery__main-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 300ms ease;
}

#rouge-technologies-img0:checked ~ label[for="rouge-technologies-img0"],
#rouge-technologies-img1:checked ~ label[for="rouge-technologies-img1"],
#rouge-technologies-img2:checked ~ label[for="rouge-technologies-img2"],
#rouge-technologies-img3:checked ~ label[for="rouge-technologies-img3"],
#rouge-technologies-img4:checked ~ label[for="rouge-technologies-img4"],
#rouge-technologies-img5:checked ~ label[for="rouge-technologies-img5"],
#rouge-technologies-img6:checked ~ label[for="rouge-technologies-img6"],
#rouge-technologies-img7:checked ~ label[for="rouge-technologies-img7"],
#rouge-technologies-img8:checked ~ label[for="rouge-technologies-img8"],
#rouge-technologies-img9:checked ~ label[for="rouge-technologies-img9"] {
  display: block;
  animation: rouge-technologies-fadeIn 0.5s ease forwards;
}

.rouge-technologies-gallery__thumbnails {
  display: flex;
  gap: 8px;
  margin-top: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.rouge-technologies-gallery__thumbnail {
  width: 110px;
  height: 110px;
  cursor: pointer;
  position: relative;
  border: 3px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 300ms ease;
}

#rouge-technologies-img0:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img0"],
#rouge-technologies-img1:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img1"],
#rouge-technologies-img2:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img2"],
#rouge-technologies-img3:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img3"],
#rouge-technologies-img4:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img4"],
#rouge-technologies-img5:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img5"],
#rouge-technologies-img6:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img6"],
#rouge-technologies-img7:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img7"],
#rouge-technologies-img8:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img8"],
#rouge-technologies-img9:checked
  ~ .rouge-technologies-gallery__thumbnails
  label[for="rouge-technologies-img9"] {
  border-color: #c1272d;
  box-shadow: 0 8px 15px rgba(193, 39, 45, 0.2);
}

.rouge-technologies-gallery__thumbnail-wrapper {
  width: 100%;
  height: 100%;
}
.rouge-technologies-gallery__thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@keyframes rouge-technologies-fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 992px) {
  .rouge-technologies-gallery__main-wrapper {
    padding-bottom: 66.67%;
    border-radius: 14px;
  }
  .rouge-technologies-gallery__thumbnail {
    width: 110px;
    height: 110px;
  }
}

@media (max-width: 768px) {
  .rouge-technologies-gallery__main-wrapper {
    padding-bottom: 75%;
    border-radius: 12px;
  }
  .rouge-technologies-gallery__thumbnail {
    width: 100px;
    height: 100px;
  }
  .rouge-technologies-gallery__thumbnails {
    gap: 8px;
  }
}

@media (max-width: 640px) {
  .rouge-technologies-gallery__thumbnails {
    justify-content: flex-start;
    overflow-x: auto;
    padding: 0 8px 16px 8px;
    margin-left: -8px;
    margin-right: -8px;
    flex-wrap: nowrap;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
  }

  .rouge-technologies-gallery__thumbnails::-webkit-scrollbar {
    height: 4px;
  }
  .rouge-technologies-gallery__thumbnails::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .rouge-technologies-gallery__thumbnails::-webkit-scrollbar-thumb {
    background: #c1272d;
    border-radius: 10px;
  }

  .rouge-technologies-gallery__thumbnail {
    width: 22%;
    aspect-ratio: 1 / 1;
    height: auto;
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .rouge-technologies-gallery__main-wrapper {
    padding-bottom: 100%;
    border-radius: 8px;
  }
  .rouge-technologies-gallery__thumbnail {
    width: 25%;
  }
}/* ===== START: promotion-grid ===== */
.rouge-technologies-promotion-grid {
  padding: 0 40px;
}

.rouge-technologies-promotion-grid__container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.rouge-technologies-promotion-grid__item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rouge-technologies-promotion-grid__link {
  display: block;
  text-decoration: none;
  transition: opacity 0.3s ease;
  width: 100%;
  height: 100%;
}

.rouge-technologies-promotion-grid__link:hover {
  opacity: 0.9;
}

.rouge-technologies-promotion-grid__image {
  width: 100%;
  max-width: 420px;
  display: block;
  border-radius: 12px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .rouge-technologies-promotion-grid {
    padding: 0 40px;
  }

  .rouge-technologies-promotion-grid__container {
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .rouge-technologies-promotion-grid {
    padding: 0 16px;
  }

  .rouge-technologies-promotion-grid__container {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .rouge-technologies-promotion-grid__item {
    margin: 0 auto;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .rouge-technologies-promotion-grid {
    margin: 16px 0;
  }

  .rouge-technologies-promotion-grid__container {
    gap: 12px;
  }

  .rouge-technologies-promotion-grid__image {
    border-radius: 8px;
  }
}

@media (max-width: 360px) {
  .rouge-technologies-promotion-grid__image {
    border-radius: 6px;
  }

  .rouge-technologies-promotion-grid__container {
    gap: 10px;
  }
}/* ===== START: shipping-notice ===== */
.rouge-technologies-shipping-notice {
  width: 100%;
  background-color: black;
  text-align: center;
  font-family: "Helvetica", sans-serif;
  color: white;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: bold;
  padding: 0.75rem 0;
}

.rouge-technologies-dynamic-time::before {
  content: var(--dynamic-time-text, "5 minutes");
}/* ===== START: stock-notice ===== */
.rouge-technologies-stock-notice {
  width: 100%;
  background-color: black;
  text-align: center;
  font-family: "Helvetica", sans-serif;
  color: white;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: bold;
  padding: 0.75rem 0;
  border-top: 1px solid white;
}

.rouge-technologies-red-text {
  color: rgb(193, 39, 45);
  font-weight: bold;
}/* ===== START: tabs-desktop ===== */
.rouge-technologies-tabs-desktop {
  overflow: hidden;
  padding-block: 16px;
  display: block;
  padding-inline: 40px;
}

.rouge-technologies-tabs-desktop__radio {
  display: none;
}

.rouge-technologies-tabs-desktop__labels {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 16px;
  padding: 10px;
}

.rouge-technologies-tabs-desktop__label {
  padding: 10px 16px;
  text-align: center;
  cursor: pointer;
  border-radius: 50px;
  transition:
    background-color 0.3s ease,
    transform 0.2s ease,
    color 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  color: #000;
  display: flex;
  align-items: center;
}

.rouge-technologies-tabs-desktop__label:hover {
  background: darkred;
  transform: scale(1.05);
  color: #fff;
}

.rouge-technologies-tabs-desktop__content > div {
  display: none;
  padding: 20px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -4px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: #fff;
  margin-top: 16px;
  color: #000;
}

.rouge-technologies-tabs-desktop__panel p {
  margin-bottom: 16px;
}

.rouge-technologies-tabs-desktop__panel p:last-child {
  margin-bottom: 0;
}

.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(1):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(1),
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(2):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(2),
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(3):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(3),
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(4):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(4),
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(5):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(5),
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(6):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(6),
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(7):checked
  ~ .rouge-technologies-tabs-desktop__labels
  .rouge-technologies-tabs-desktop__label:nth-of-type(7) {
  background: #a80f0f;
  color: #fff;
  border-color: #a80f0f;
}

.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(1):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-1,
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(2):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-2,
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(3):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-3,
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(4):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-4,
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(5):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-5,
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(6):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-6,
.rouge-technologies-tabs-desktop
  input[type="radio"]:nth-of-type(7):checked
  ~ .rouge-technologies-tabs-desktop__content
  #rouge-technologies-content-desktop-7 {
  display: block;
}

@media screen and (max-width: 767px) {
  .rouge-technologies-tabs-desktop {
    display: none !important;
  }
}/* ===== START: tabs-mobile ===== */
.rouge-technologies-tabs-mobile {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
  padding: 16px;
  display: none;
}

.rouge-technologies-tabs-mobile__item {
  margin-bottom: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  color: #000;
}

.rouge-technologies-tabs-mobile__item:hover:not([open]) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.rouge-technologies-tabs-mobile__item[open] {
  transform: scale(1.01);
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.rouge-technologies-tabs-mobile__summary {
  padding: 16px 20px;
  background: #f9fafb;
  border: none;
  outline: none;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  font-family: "Roboto", sans-serif;
  list-style: none;
  font-size: 16px;
  position: relative;
}

.rouge-technologies-tabs-mobile__summary:hover {
  background: #e5e7eb;
}

.rouge-technologies-tabs-mobile__item[open]
  .rouge-technologies-tabs-mobile__summary {
  background: #a80f0f;
  color: white;
}

.rouge-technologies-tabs-mobile__item[open]
  .rouge-technologies-tabs-mobile__summary:hover {
  background: #8d0b0b;
}

.rouge-technologies-tabs-mobile__summary::-webkit-details-marker {
  display: none;
}

.rouge-technologies-tabs-mobile__summary::after {
  content: "+";
  font-size: 20px;
  font-weight: 400;
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  transform-origin: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.rouge-technologies-tabs-mobile__item[open]
  .rouge-technologies-tabs-mobile__summary::after {
  content: "−";
  transform: rotate(180deg);
  color: white;
}

.rouge-technologies-tabs-mobile__content {
  max-height: 0;
  padding: 0 20px;
  overflow: hidden;
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 1px solid transparent;
  transform: translateY(-10px);
}

.rouge-technologies-tabs-mobile__item[open]
  .rouge-technologies-tabs-mobile__content {
  max-height: 2000px;
  padding: 20px;
  opacity: 1;
  border-top: 1px solid #e5e7eb;
  transform: translateY(0);
}

.rouge-technologies-tabs-mobile__content p {
  margin-bottom: 12px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease 0.1s;
}

.rouge-technologies-tabs-mobile__item[open]
  .rouge-technologies-tabs-mobile__content
  p {
  opacity: 1;
  transform: translateY(0);
}

.rouge-technologies-tabs-mobile__content p:last-child {
  margin-bottom: 0;
}

.rouge-technologies-tabs-mobile__item[open]
  .rouge-technologies-tabs-mobile__content
  .rouge-technologies-tabs__dynamic-paragraph:nth-child(1) {
  transition-delay: 0.1s;
}

@media screen and (max-width: 767px) {
  .rouge-technologies-tabs-mobile {
    display: block !important;
  }

  .rouge-technologies-tabs-mobile__summary {
    padding: 14px 16px;
    font-size: 15px;
  }

  .rouge-technologies-tabs-mobile__content {
    padding: 0 16px;
  }

  .rouge-technologies-tabs-mobile__item[open]
    .rouge-technologies-tabs-mobile__content {
    padding: 16px;
  }

  .rouge-technologies-tabs-mobile__summary::after {
    font-size: 18px;
    width: 20px;
    height: 20px;
  }
}/* ===== START: tabs ===== */
.rouge-technologies-tabs__paragraph,
.rouge-technologies-tabs__dynamic-paragraph {
  white-space: pre-line;
  line-height: 1.6;
}

.rouge-technologies-tabs__dynamic-paragraph[data-css-var="shipping"]::before {
  content: var(--rouge-technologies-shipping-content);
}

.rouge-technologies-tabs__dynamic-paragraph[data-css-var="warranty"]::before {
  content: var(--rouge-technologies-warranty-content);
}

.rouge-technologies-tabs__dynamic-paragraph[data-css-var="returns"]::before {
  content: var(--rouge-technologies-returns-content);
}

.rouge-technologies-tabs__dynamic-content {
  display: block;
}
`;