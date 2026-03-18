
export default function Feedback({ feedbacks = [] }) {
  return (
    <div className="rouge-technologies-feedback">
      <div className="rouge-technologies-feedback__title">
        <h4>Our Recent Feedback</h4>
      </div>
      <div className="rouge-technologies-feedback__grid">
        {feedbacks.map((feedback, index) => (
          <div key={index} className="rouge-technologies-feedback__card">
            <div className="rouge-technologies-feedback__header">
              <svg
                viewBox="0 0 16 16"
                height="16"
                width="16"
                aria-label="Positive feedback rating"
                role="img"
                className="rouge-technologies-feedback__icon"
              >
                <circle cx="8" cy="8" r="8" fill="#05823F"></circle>
                <path
                  d="M12.2857 7.28571H8.71429V3.71429C8.71429 3.3198 8.39449 3 8 3C7.60551 3 7.28571 3.3198 7.28571 3.71429V7.28571H3.71429C3.3198 7.28571 3 7.60551 3 8C3 8.39449 3.3198 8.71429 3.71429 8.71429H7.28571V12.2857C7.28571 12.6802 7.60551 13 8 13C8.39449 13 8.71429 12.6802 8.71429 12.2857V8.71429H12.2857C12.6802 8.71429 13 8.39449 13 8C13 7.60551 12.6802 7.28571 12.2857 7.28571Z"
                  fill="white"
                ></path>
              </svg>
              <p className="rouge-technologies-feedback__author">
                {feedback.name} ({feedback.count})
              </p>
            </div>
            <p className="rouge-technologies-feedback__content">
              {feedback.content}
            </p>
          </div>
        ))}
      </div>
      <a
        href="https://www.ebay.co.uk/fdbk/feedback_profile/rougetechnologiesuk?filter=feedback_page:All"
        target="_blank"
        className="rouge-technologies-feedback__cta"
        rel="noopener noreferrer"
      >
        Proudly rated 5 stars on over 5,000 orders!
      </a>
    </div>
  );
}
