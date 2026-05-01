/* eslint-disable @next/next/no-img-element */
import React from "react";
export default function ProductGallery({ images, title }) {
  const sortedImages = [...images].sort((a, b) => a.order - b.order);

  return (
    <div className="rouge-technologies-gallery">
      <div className="rouge-technologies-gallery__row">
        <div className="rouge-technologies-gallery__full">
          <div className="rouge-technologies-gallery__wrapper">
            <div className="rouge-technologies-gallery__display-area">
              {sortedImages.map((image, index) => {
                const imageSrc = image.s3Url || image.url || "placeholder-url";

                return (
                  <React.Fragment key={`group-${index}`}>
                    <input
                      type="radio"
                      id={`rouge-technologies-img${index}`}
                      name="rouge-technologies-main-image"
                      defaultChecked={index === 0}
                      className="rouge-technologies-gallery__radio"
                    />
                    <label
                      htmlFor={`rouge-technologies-img${index}`}
                      className="rouge-technologies-gallery__main"
                    >
                      <div className="rouge-technologies-gallery__main-wrapper">
                        <div className="rouge-technologies-gallery__main-inner">
                          <img
                            src={imageSrc}
                            alt={image.altText || `${title} - Image ${index}`}
                            className="rouge-technologies-gallery__main-image"
                          />
                          {!image.validation?.isValid &&
                            image.validation?.errors?.length > 0 && (
                              <div className="rouge-technologies-gallery__badge">
                                Needs attention
                              </div>
                            )}
                        </div>
                      </div>
                    </label>
                  </React.Fragment>
                );
              })}

              {/* 2. THUMBNAIL NAVIGATION */}
              {/* This is a sibling to the radios above, so it can be targeted */}
              <div className="rouge-technologies-gallery__thumbnails">
                {sortedImages.map((image, index) => {
                  const thumbSrc =
                    image.s3Url || image.url || "placeholder-url";
                  return (
                    <label
                      key={`thumb-${index}`}
                      htmlFor={`rouge-technologies-img${index}`}
                      className="rouge-technologies-gallery__thumbnail"
                    >
                      <div className="rouge-technologies-gallery__thumbnail-wrapper">
                        <img
                          src={thumbSrc}
                          alt={`${title} Thumb ${index}`}
                          className="rouge-technologies-gallery__thumbnail-img"
                        />
                      </div>
                      <span className="rouge-technologies-gallery__thumbnail-overlay"></span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
