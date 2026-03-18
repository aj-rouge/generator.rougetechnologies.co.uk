export default function Category({ categoryName, categoryContent }) {
  const sections = Array.isArray(categoryContent) ? categoryContent : [];

  return (
    <div className="rouge-technologies-category">
      <div className="rouge-technologies-category__wrapper">
        {/* Category Heading */}
        <div className="rouge-technologies-category__heading">
          {categoryName}
        </div>

        {/* Category Body Text */}
        <div className="rouge-technologies-category__content">
          {sections.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className="rouge-technologies-category__section"
            >
              {section.subheading && (
                <h3 className="rouge-technologies-category__subheading">
                  {section.subheading}
                </h3>
              )}
              {section.paragraphs?.map((paragraph, paraIndex) => (
                <p
                  key={paraIndex}
                  className="rouge-technologies-category__paragraph"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
