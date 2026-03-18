import { TAB_DATA } from "../../data/tabs";
// Helper function to render content
function renderContent(contentArray, cssVar) {
  if (cssVar) {
    return (
      <div className="rouge-technologies-tabs__dynamic-content">
        <p
          className="rouge-technologies-tabs__dynamic-paragraph"
          data-css-var={cssVar}
        ></p>
      </div>
    );
  }

  return contentArray.map((item, index) => (
    <p key={`p-${index}`} className="rouge-technologies-tabs__paragraph">
      {item}
    </p>
  ));
}

export default function Tabs() {
  return (
    <>
      {/* Desktop Tabs */}
      <div className="rouge-technologies-tabs-desktop">
        {TAB_DATA.map((_, index) => (
          <input
            key={`tab-${index}`}
            id={`rouge-technologies-tab-desktop-${index + 1}`}
            type="radio"
            name="rouge-technologies-tabs-desktop"
            defaultChecked={index === 0}
            className="rouge-technologies-tabs-desktop__radio"
          />
        ))}

        <div className="rouge-technologies-tabs-desktop__labels">
          {TAB_DATA.map((tab, index) => (
            <label
              key={`label-${index}`}
              htmlFor={`rouge-technologies-tab-desktop-${index + 1}`}
              className="rouge-technologies-tabs-desktop__label"
            >
              {tab.label}
            </label>
          ))}
        </div>

        <div className="rouge-technologies-tabs-desktop__content">
          {TAB_DATA.map((tab, index) => (
            <div
              key={`content-${index}`}
              id={`rouge-technologies-content-desktop-${index + 1}`}
              className="rouge-technologies-tabs-desktop__panel"
            >
              {renderContent(tab.content, tab.cssVar)}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="rouge-technologies-tabs-mobile">
        {TAB_DATA.map((tab, index) => (
          <details
            key={`mobile-${index}`}
            className="rouge-technologies-tabs-mobile__item"
            open={index === 0}
          >
            <summary className="rouge-technologies-tabs-mobile__summary">
              {tab.label}
            </summary>
            <div className="rouge-technologies-tabs-mobile__content">
              {renderContent(tab.content, tab.cssVar)}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
