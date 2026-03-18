export default function ProductDetails({
  condition,
  paragraphs,
  features,
  note,
}) {
  return (
    <div className="rouge-technologies-details">
      <h2 className="rouge-technologies-details__condition">
        <strong>Condition: </strong> {condition}
      </h2>

      {/* Dynamic paragraphs from props */}
      {paragraphs &&
        paragraphs.map((para, index) => (
          <div
            className="rouge-technologies-details__paragraph-wrapper"
            key={index}
          >
            <p className="rouge-technologies-details__paragraph">{para}</p>
            <br />
          </div>
        ))}

      {/* Dynamic features list */}
      {features && features.length > 0 && (
        <>
          <h2 className="rouge-technologies-details__features-title">
            Key Features:
          </h2>
          <ul className="rouge-technologies-details__features-list">
            {features.map((feature, index) => (
              <li
                key={index}
                className="rouge-technologies-details__feature-item"
              >
                <span className="rouge-technologies-details__checkmark">✓</span>
                <div className="rouge-technologies-details__feature-content">
                  <strong>{feature.title}:</strong>{" "}
                  <span className="rouge-technologies-details__feature-description">
                    {feature.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Note section - only shown if note exists */}
      {note && (
        <>
          <h2 className="rouge-technologies-details__note-title">
            <strong>Please Note:</strong>
          </h2>
          <div className="rouge-technologies-details__note-container">
            <p className="rouge-technologies-details__note-text">{note}</p>
          </div>
        </>
      )}
    </div>
  );
}
