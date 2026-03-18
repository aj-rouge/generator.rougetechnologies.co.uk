/* eslint-disable @next/next/no-img-element */

const PromotionGrid = ({ selectedCategory, ebayLink }) => {
  const promotions = [
    {
      src: `${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/view-related-products-from-rouge-technologies.webp`,
      alt: "View related products from Rouge Technologies",
      href: ebayLink || "https://www.ebay.co.uk/str/rougetechnologies",
    },
    {
      src: `${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/view-more-products-from-rouge-technologies.webp`,
      alt: "View all tech products for sale at Rouge Technologies",
      href: "https://www.ebay.co.uk/sch/i.html?_ssn=rougetechnologiesuk",
    },
    {
      src: `${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/trade-in-your-unwanted-tech-with-rouge-technologies.webp`,
      alt: "Trade in your unwanted tech with Rouge Technologies",
      href: "https://www.ebay.co.uk/cnt/intermediatedFAQ?requested=rougetechnologiesuk",
    },
    {
      src: `${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN}/rouge-technologies-ebay-image-logo.webp`,
      alt: "Rouge Technologies logo",
    },
  ];

  return (
    <div className="rouge-technologies-promotion-grid">
      <div className="rouge-technologies-promotion-grid__container">
        {promotions.map((item, index) => (
          <div className="rouge-technologies-promotion-grid__item" key={index}>
            {item.href ? (
              <a
                href={item.href}
                className="rouge-technologies-promotion-grid__link"
                rel="noopener noreferrer"
                target="_blank"
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className="rouge-technologies-promotion-grid__image"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ) : (
              <img
                src={item.src}
                alt={item.alt}
                className="rouge-technologies-promotion-grid__image"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromotionGrid;